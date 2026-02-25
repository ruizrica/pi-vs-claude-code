#!/usr/bin/env node
/**
 * Node.js test runner for Main module
 */

const fs = require('fs');
const path = require('path');

// Create mock canvas context
function createMockCtx() {
    const noop = function() { return this; };
    return new Proxy({
        canvas: { width: 960, height: 640 },
        globalAlpha: 1, shadowBlur: 0, shadowColor: 'transparent',
        fillStyle: '', strokeStyle: '', lineWidth: 1, font: '',
        textAlign: 'start', textBaseline: 'alphabetic',
        save: noop, restore: noop, fillRect: noop, strokeRect: noop, clearRect: noop,
        fillText: noop, strokeText: noop, beginPath: noop, closePath: noop,
        moveTo: noop, lineTo: noop, arc: noop, arcTo: noop, fill: noop, stroke: noop,
        translate: noop, rotate: noop, scale: noop,
        measureText() { return { width: 100 }; },
        createRadialGradient() { return { addColorStop: noop }; },
        createLinearGradient() { return { addColorStop: noop }; },
    }, {
        get(target, prop) { return prop in target ? target[prop] : noop; }
    });
}

// DOM mocks
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

global.window = global;
global.window.addEventListener = global.window.addEventListener || function() {};
global.document = mockDocument;
global.performance = { now: () => Date.now() };
global.requestAnimationFrame = (fn) => setTimeout(fn, 16);
global.setTimeout = global.setTimeout;

// Load contracts
eval(fs.readFileSync(path.join(__dirname, 'contracts.js'), 'utf8'));

// Mock subsystems
window.Game.Player = {
    hp: 100, maxHp: 100, x: 160, y: 160, dashCooldown: 0,
    init() { this.hp = 100; this.x = 160; this.y = 160; }
};
window.Game.Enemies = {
    getAll() { return []; }, count() { return 0; }, init() {}
};
window.Game.Bosses = {
    getActive() { return null; }, init() {}
};
window.Game.Levels = {
    getCurrentTilemap() { return []; },
    getPlayerSpawn() { return { x: 160, y: 160 }; },
    loadLevel() {}, init() {}
};
window.Game.Effects = { init() {} };
window.Game.Engine = {
    canvas: null, ctx: null,
    init(c) { this.canvas = c; this.ctx = createMockCtx(); },
    start() {}, keys: {}, mouse: { x: 0, y: 0, down: false }, camera: { x: 0, y: 0 }
};

// Load UI first
eval(fs.readFileSync(path.join(__dirname, 'ui.js'), 'utf8'));
// Load main
eval(fs.readFileSync(path.join(__dirname, 'main.js'), 'utf8'));

// ── Test runner ──────────────────────────────────────────────

let passed = 0, failed = 0;

function test(name, fn) {
    try { fn(); passed++; console.log(`  ✅ ${name}`); }
    catch (e) { failed++; console.log(`  ❌ ${name}: ${e.message}`); }
}
function assert(cond, msg) { if (!cond) throw new Error(msg || 'Assertion failed'); }
function assertEqual(a, b, msg) { if (a !== b) throw new Error(msg || `Expected ${JSON.stringify(b)}, got ${JSON.stringify(a)}`); }

console.log('\n🧪 Main Module Tests\n');

// ── Structure ────────────────────────────────────────────────

test('Game.Main exists', () => assert(window.Game.Main));
test('Game.Main.init is function', () => assert(typeof Game.Main.init === 'function'));
test('Game.Main.startGame is function', () => assert(typeof Game.Main.startGame === 'function'));
test('Game.Main.startLevel is function', () => assert(typeof Game.Main.startLevel === 'function'));

// ── Init ─────────────────────────────────────────────────────

test('init() does not throw', () => {
    Game.Main.init();
});

test('init() sets screen to menu', () => {
    Game.Main.init();
    assertEqual(Game.state.screen, 'menu');
});

// ── startGame ────────────────────────────────────────────────

test('startGame sets screen to playing', () => {
    Game.Main.startGame();
    assertEqual(Game.state.screen, 'playing');
});

test('startGame resets score', () => {
    Game.state.score = 999;
    Game.Main.startGame();
    assertEqual(Game.state.score, 0);
});

test('startGame resets kills', () => {
    Game.state.kills = 50;
    Game.Main.startGame();
    assertEqual(Game.state.kills, 0);
});

test('startGame resets level to 0', () => {
    Game.state.level = 2;
    Game.Main.startGame();
    assertEqual(Game.state.level, 0);
});

// ── startLevel ───────────────────────────────────────────────

test('startLevel sets level', () => {
    Game.Main.startLevel(1);
    assertEqual(Game.state.level, 1);
});

test('startLevel sets screen to playing', () => {
    Game.state.screen = 'menu';
    Game.Main.startLevel(0);
    assertEqual(Game.state.screen, 'playing');
});

test('startLevel resets bossActive', () => {
    Game.state.bossActive = true;
    Game.Main.startLevel(0);
    assertEqual(Game.state.bossActive, false);
});

test('startLevel places player at spawn', () => {
    Game.Main.startLevel(0);
    assertEqual(Game.Player.x, 160);
    assertEqual(Game.Player.y, 160);
});

// ── Events ───────────────────────────────────────────────────

test('enemy-killed event increments kills and score', () => {
    Game.Events.clear();
    Game.Main.init();
    Game.state.kills = 0;
    Game.state.score = 0;
    Game.Events.emit('enemy-killed', { score: 200 });
    assertEqual(Game.state.kills, 1);
    assertEqual(Game.state.score, 200);
});

test('enemy-killed event uses default score 100', () => {
    Game.Events.clear();
    Game.Main.init();
    Game.state.kills = 0;
    Game.state.score = 0;
    Game.Events.emit('enemy-killed', {});
    assertEqual(Game.state.score, 100);
});

test('boss-defeated event updates state', () => {
    Game.Events.clear();
    Game.Main.init();
    Game.state.bossActive = true;
    Game.state.score = 0;
    Game.Events.emit('boss-defeated');
    assertEqual(Game.state.bossActive, false);
    assertEqual(Game.state.bossDefeated, true);
    assertEqual(Game.state.score, 1000);
});

test('player-death event sets gameover screen', () => {
    Game.Events.clear();
    Game.Main.init();
    Game.state.screen = 'playing';
    Game.Events.emit('player-death');
    assertEqual(Game.state.screen, 'gameover');
});

// ── Summary ──────────────────────────────────────────────────

console.log(`\n${'═'.repeat(40)}`);
console.log(`  ${passed} passed, ${failed} failed`);
console.log(`${'═'.repeat(40)}\n`);

process.exit(failed > 0 ? 1 : 0);
