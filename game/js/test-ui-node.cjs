#!/usr/bin/env node
/**
 * Node.js test runner for UI module
 * Uses JSDOM-like approach: evaluates scripts in order with a mock canvas context
 */

const fs = require('fs');
const path = require('path');

// ── Simple mock approach (no external deps) ──────────────────

// Create a mock canvas 2d context
function createMockCtx() {
    const noop = function() { return this; };
    return new Proxy({
        canvas: { width: 960, height: 640 },
        _saved: [],
        globalAlpha: 1,
        shadowBlur: 0,
        shadowColor: 'transparent',
        fillStyle: '',
        strokeStyle: '',
        lineWidth: 1,
        font: '',
        textAlign: 'start',
        textBaseline: 'alphabetic',
        save() { this._saved.push({ globalAlpha: this.globalAlpha, shadowBlur: this.shadowBlur }); },
        restore() {
            const s = this._saved.pop();
            if (s) { this.globalAlpha = s.globalAlpha; this.shadowBlur = s.shadowBlur; }
        },
        fillRect: noop,
        strokeRect: noop,
        clearRect: noop,
        fillText: noop,
        strokeText: noop,
        measureText() { return { width: 100 }; },
        beginPath: noop,
        closePath: noop,
        moveTo: noop,
        lineTo: noop,
        arc: noop,
        arcTo: noop,
        fill: noop,
        stroke: noop,
        translate: noop,
        rotate: noop,
        scale: noop,
        createRadialGradient() {
            return { addColorStop: noop };
        },
        createLinearGradient() {
            return { addColorStop: noop };
        },
    }, {
        get(target, prop) {
            if (prop in target) return target[prop];
            return noop;
        }
    });
}

// Minimal DOM mocks
const mockDocument = {
    getElementById(id) {
        if (id === 'gameCanvas') {
            return {
                width: 960, height: 640,
                getContext() { return createMockCtx(); },
                addEventListener() {},
                getBoundingClientRect() { return { left: 0, top: 0 }; }
            };
        }
        return null;
    }
};

// Set up globals
global.window = global;
global.document = mockDocument;
global.performance = { now: () => Date.now() };
global.requestAnimationFrame = (fn) => setTimeout(fn, 16);
global.console = console;

// Load contracts.js
const contractsPath = path.join(__dirname, 'contracts.js');
eval(fs.readFileSync(contractsPath, 'utf8'));

// Set up mock modules
window.Game.Player = {
    hp: 75, maxHp: 100, x: 160, y: 160,
    dashCooldown: 20,
    init() { this.hp = 100; this.x = 160; this.y = 160; this.dashCooldown = 0; }
};

window.Game.Enemies = {
    getAll() { return [{ x: 200, y: 200, alive: true }, { x: 300, y: 100, alive: true }]; },
    count() { return 2; },
    init() {}
};

window.Game.Bosses = {
    getActive() { return { name: 'The Warden', hp: 200, maxHp: 300, x: 400, y: 300 }; },
    init() {}
};

window.Game.Levels = {
    getCurrentTilemap() {
        const map = [];
        for (let y = 0; y < 20; y++) {
            map[y] = [];
            for (let x = 0; x < 30; x++) {
                map[y][x] = (x === 0 || x === 29 || y === 0 || y === 19) ? 1 : 0;
            }
        }
        return map;
    },
    getPlayerSpawn() { return { x: 160, y: 160 }; },
    loadLevel() {},
    init() {}
};

window.Game.Effects = { init() {} };
window.Game.Engine = {
    canvas: null, ctx: null,
    init(c) { this.canvas = c; this.ctx = createMockCtx(); },
    start() {},
    keys: {}, mouse: { x: 0, y: 0, down: false }, camera: { x: 0, y: 0 }
};

// Load ui.js
const uiPath = path.join(__dirname, 'ui.js');
eval(fs.readFileSync(uiPath, 'utf8'));

// ── Test runner ──────────────────────────────────────────────

let passed = 0, failed = 0;
const ctx = createMockCtx();

function test(name, fn) {
    try {
        fn();
        passed++;
        console.log(`  ✅ ${name}`);
    } catch (e) {
        failed++;
        console.log(`  ❌ ${name}: ${e.message}`);
    }
}

function assert(cond, msg) { if (!cond) throw new Error(msg || 'Assertion failed'); }
function assertEqual(a, b, msg) { if (a !== b) throw new Error(msg || `Expected ${JSON.stringify(b)}, got ${JSON.stringify(a)}`); }

console.log('\n🧪 UI Module Tests\n');

// ── Structure ────────────────────────────────────────────────

test('Game.UI exists', () => assert(window.Game.UI));
test('Game.UI.init is function', () => assert(typeof Game.UI.init === 'function'));
test('Game.UI.draw is function', () => assert(typeof Game.UI.draw === 'function'));
test('Game.UI.drawMenu is function', () => assert(typeof Game.UI.drawMenu === 'function'));
test('Game.UI.drawPause is function', () => assert(typeof Game.UI.drawPause === 'function'));
test('Game.UI.drawGameOver is function', () => assert(typeof Game.UI.drawGameOver === 'function'));
test('Game.UI.drawVictory is function', () => assert(typeof Game.UI.drawVictory === 'function'));
test('Game.UI.drawLevelComplete is function', () => assert(typeof Game.UI.drawLevelComplete === 'function'));
test('Game.UI.drawHUD is function', () => assert(typeof Game.UI.drawHUD === 'function'));

// ── Init ─────────────────────────────────────────────────────

test('init() does not throw', () => Game.UI.init());

// ── Draw methods don't throw ─────────────────────────────────

test('drawMenu does not throw', () => {
    Game.state.screen = 'menu';
    Game.UI.drawMenu(ctx);
});

test('drawHUD does not throw with valid data', () => {
    Game.state.screen = 'playing';
    Game.state.level = 0;
    Game.state.score = 500;
    Game.state.kills = 5;
    Game.state.bossActive = false;
    Game.UI.drawHUD(ctx);
});

test('drawHUD with boss active does not throw', () => {
    Game.state.bossActive = true;
    Game.UI.drawHUD(ctx);
    Game.state.bossActive = false;
});

test('drawPause does not throw', () => {
    Game.state.screen = 'paused';
    Game.UI.drawPause(ctx);
});

test('drawGameOver does not throw', () => {
    Game.state.screen = 'gameover';
    Game.state.score = 1234;
    Game.state.kills = 10;
    Game.state.level = 1;
    Game.state.time = 67.5;
    Game.UI.drawGameOver(ctx);
});

test('drawVictory does not throw', () => {
    Game.state.screen = 'victory';
    Game.state.score = 9999;
    Game.state.kills = 50;
    Game.state.time = 180;
    Game.UI.drawVictory(ctx);
});

test('drawLevelComplete does not throw', () => {
    Game.state.screen = 'levelcomplete';
    Game.state.level = 1;
    Game.UI.drawLevelComplete(ctx);
});

// ── Dispatch ─────────────────────────────────────────────────

test('draw() dispatches to drawMenu on menu screen', () => {
    Game.state.screen = 'menu';
    let called = false;
    const orig = Game.UI.drawMenu;
    Game.UI.drawMenu = (c) => { called = true; orig.call(Game.UI, c); };
    Game.UI.draw(ctx);
    Game.UI.drawMenu = orig;
    assert(called, 'drawMenu should be called');
});

test('draw() dispatches to drawHUD on playing screen', () => {
    Game.state.screen = 'playing';
    let called = false;
    const orig = Game.UI.drawHUD;
    Game.UI.drawHUD = (c) => { called = true; orig.call(Game.UI, c); };
    Game.UI.draw(ctx);
    Game.UI.drawHUD = orig;
    assert(called, 'drawHUD should be called');
});

test('draw() dispatches to drawPause on paused screen', () => {
    Game.state.screen = 'paused';
    let called = false;
    const orig = Game.UI.drawPause;
    Game.UI.drawPause = (c) => { called = true; orig.call(Game.UI, c); };
    Game.UI.draw(ctx);
    Game.UI.drawPause = orig;
    assert(called, 'drawPause should be called');
});

test('draw() dispatches to drawGameOver on gameover screen', () => {
    Game.state.screen = 'gameover';
    let called = false;
    const orig = Game.UI.drawGameOver;
    Game.UI.drawGameOver = (c) => { called = true; orig.call(Game.UI, c); };
    Game.UI.draw(ctx);
    Game.UI.drawGameOver = orig;
    assert(called, 'drawGameOver should be called');
});

test('draw() dispatches to drawVictory on victory screen', () => {
    Game.state.screen = 'victory';
    let called = false;
    const orig = Game.UI.drawVictory;
    Game.UI.drawVictory = (c) => { called = true; orig.call(Game.UI, c); };
    Game.UI.draw(ctx);
    Game.UI.drawVictory = orig;
    assert(called, 'drawVictory should be called');
});

test('draw() dispatches to drawLevelComplete on levelcomplete screen', () => {
    Game.state.screen = 'levelcomplete';
    let called = false;
    const orig = Game.UI.drawLevelComplete;
    Game.UI.drawLevelComplete = (c) => { called = true; orig.call(Game.UI, c); };
    Game.UI.draw(ctx);
    Game.UI.drawLevelComplete = orig;
    assert(called, 'drawLevelComplete should be called');
});

// ── Guard: missing modules ───────────────────────────────────

test('drawHUD does not throw when Player is missing', () => {
    const orig = Game.Player;
    Game.Player = undefined;
    Game.state.screen = 'playing';
    Game.UI.drawHUD(ctx);
    Game.Player = orig;
});

test('drawHUD does not throw when Enemies is missing', () => {
    const orig = Game.Enemies;
    Game.Enemies = undefined;
    Game.state.screen = 'playing';
    Game.UI.drawHUD(ctx);
    Game.Enemies = orig;
});

test('drawHUD minimap handles empty tilemap', () => {
    const orig = Game.Levels.getCurrentTilemap;
    Game.Levels.getCurrentTilemap = () => [];
    Game.state.screen = 'playing';
    Game.UI.drawHUD(ctx);
    Game.Levels.getCurrentTilemap = orig;
});

test('drawHUD boss bar handles null getActive', () => {
    Game.state.bossActive = true;
    const orig = Game.Bosses.getActive;
    Game.Bosses.getActive = () => null;
    Game.UI.drawHUD(ctx);
    Game.Bosses.getActive = orig;
    Game.state.bossActive = false;
});

test('HP bar works with 0 HP', () => {
    Game.Player.hp = 0;
    Game.state.screen = 'playing';
    Game.UI.drawHUD(ctx);
    Game.Player.hp = 75;
});

test('HP bar works with full HP', () => {
    Game.Player.hp = 100;
    Game.UI.drawHUD(ctx);
    Game.Player.hp = 75;
});

// ── Canvas state restoration ─────────────────────────────────

test('draw() restores globalAlpha', () => {
    ctx.globalAlpha = 1;
    Game.state.screen = 'playing';
    Game.UI.draw(ctx);
    assertEqual(ctx.globalAlpha, 1);
});

test('draw() restores shadowBlur', () => {
    ctx.shadowBlur = 0;
    Game.state.screen = 'menu';
    Game.UI.draw(ctx);
    assertEqual(ctx.shadowBlur, 0);
});

// ── Summary ──────────────────────────────────────────────────

console.log(`\n${'═'.repeat(40)}`);
console.log(`  ${passed} passed, ${failed} failed`);
console.log(`${'═'.repeat(40)}\n`);

process.exit(failed > 0 ? 1 : 0);
