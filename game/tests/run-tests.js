// Node/Bun test runner — emulates browser enough to test levels.js and effects.js
// Run: bun game/tests/run-tests.js

// Minimal DOM stubs
class CanvasRenderingContext2D {
    constructor(canvas) {
        this.canvas = canvas;
        this.fillStyle = '';
        this.strokeStyle = '';
        this.globalAlpha = 1;
        this.lineWidth = 1;
        this.font = '';
        this.textAlign = '';
        this.textBaseline = '';
        this.shadowColor = '';
        this.shadowBlur = 0;
        this._transform = [1, 0, 0, 1, 0, 0];
    }
    fillRect() {}
    strokeRect() {}
    clearRect() {}
    beginPath() {}
    closePath() {}
    moveTo() {}
    lineTo() {}
    arc() {}
    fill() {}
    stroke() {}
    fillText() {}
    save() {}
    restore() {}
    setTransform() {}
    createRadialGradient() {
        return { addColorStop() {} };
    }
    createLinearGradient() {
        return { addColorStop() {} };
    }
}

globalThis.window = globalThis;
globalThis.document = {
    createElement(tag) {
        if (tag === 'canvas') {
            const c = { width: 960, height: 640 };
            c.getContext = () => new CanvasRenderingContext2D(c);
            return c;
        }
        return {};
    }
};

// Load scripts
const fs = require('fs');
const path = require('path');
const base = path.join(__dirname, '..');

function loadScript(filePath) {
    const code = fs.readFileSync(path.join(base, filePath), 'utf-8');
    // eslint-disable-next-line no-eval
    eval(code);
}

loadScript('js/contracts.js');
loadScript('js/effects.js');
loadScript('js/levels.js');

// ========== Test harness ==========
let passed = 0, failed = 0;
function assert(cond, msg) {
    if (cond) {
        passed++;
        console.log(`  \x1b[32m✓\x1b[0m ${msg}`);
    } else {
        failed++;
        console.log(`  \x1b[31m✗\x1b[0m ${msg}`);
    }
}
function section(name) {
    console.log(`\n\x1b[33m— ${name} —\x1b[0m`);
}

// Stub Game.Enemies
window.Game.Enemies = {
    _enemies: [],
    getAll() { return this._enemies; },
    spawn(type, x, y) { this._enemies.push({ type, x, y, alive: true }); },
    clear() { this._enemies = []; },
};

const canvas = document.createElement('canvas');
canvas.width = 960;
canvas.height = 640;
const ctx = canvas.getContext('2d');

// ==================== EFFECTS TESTS ====================
console.log('\n\x1b[1m====== EFFECTS.JS TESTS ======\x1b[0m');

section('API');
assert(typeof Game.Effects === 'object', 'Game.Effects exists');
assert(typeof Game.Effects.init === 'function', 'init() exists');
assert(typeof Game.Effects.update === 'function', 'update() exists');
assert(typeof Game.Effects.draw === 'function', 'draw() exists');
assert(typeof Game.Effects.screenFlash === 'function', 'screenFlash() exists');
assert(typeof Game.Effects.spawnExplosion === 'function', 'spawnExplosion() exists');
assert(typeof Game.Effects.spawnText === 'function', 'spawnText() exists');
assert(typeof Game.Effects.addTrail === 'function', 'addTrail() exists');
assert(typeof Game.Effects.addAmbient === 'function', 'addAmbient() exists');

section('Init & basic ops');
Game.Effects.init();
let err = null;
try { Game.Effects.update(); Game.Effects.draw(ctx); } catch (e) { err = e; }
assert(err === null, 'update/draw after init works');

section('screenFlash');
Game.Effects.init();
Game.Effects.screenFlash('#ff0000', 30);
err = null;
try { Game.Effects.draw(ctx); } catch (e) { err = e; }
assert(err === null, 'screenFlash + draw works');
Game.Effects.update();
err = null;
try { Game.Effects.draw(ctx); } catch (e) { err = e; }
assert(err === null, 'screenFlash persists after 1 update');

section('spawnExplosion');
Game.Effects.init();
Game.Effects.spawnExplosion(100, 200, '#ff6600', 20);
err = null;
try { Game.Effects.update(); Game.Effects.draw(ctx); } catch (e) { err = e; }
assert(err === null, 'spawnExplosion + update + draw works');

section('spawnText');
Game.Effects.init();
Game.Effects.spawnText(150, 300, '-25', '#ff3366');
err = null;
try { Game.Effects.draw(ctx); } catch (e) { err = e; }
assert(err === null, 'spawnText + draw works');
for (let i = 0; i < 40; i++) Game.Effects.update();
err = null;
try { Game.Effects.draw(ctx); } catch (e) { err = e; }
assert(err === null, 'spawnText fades after 40 frames without error');

section('addTrail');
Game.Effects.init();
Game.Effects.addTrail(200, 200, '#00ffff');
Game.Effects.addTrail(204, 200, '#00ffff');
Game.Effects.addTrail(208, 200, '#00ffff');
err = null;
try { Game.Effects.update(); Game.Effects.draw(ctx); } catch (e) { err = e; }
assert(err === null, 'addTrail + update + draw works');
for (let i = 0; i < 25; i++) Game.Effects.update();
err = null;
try { Game.Effects.draw(ctx); } catch (e) { err = e; }
assert(err === null, 'trails fade out after 20+ frames');

section('addAmbient');
Game.Effects.init();
Game.Effects.addAmbient({ x: 0, y: 0, w: 960, h: 640 });
err = null;
try { for (let i = 0; i < 10; i++) Game.Effects.update(); Game.Effects.draw(ctx); } catch (e) { err = e; }
assert(err === null, 'addAmbient + updates + draw works');

section('Lifecycle');
Game.Effects.init();
Game.Effects.spawnText(0, 0, 'test', '#fff');
Game.Effects.spawnExplosion(0, 0, '#fff', 5);
Game.Effects.addTrail(0, 0, '#fff');
Game.Effects.screenFlash('#fff', 10);
for (let i = 0; i < 200; i++) Game.Effects.update();
err = null;
try { Game.Effects.draw(ctx); } catch (e) { err = e; }
assert(err === null, 'all effects expire gracefully after many updates');


// ==================== LEVELS TESTS ====================
console.log('\n\x1b[1m====== LEVELS.JS TESTS ======\x1b[0m');

section('API');
assert(typeof Game.Levels === 'object', 'Game.Levels exists');
assert(typeof Game.Levels.init === 'function', 'init() exists');
assert(typeof Game.Levels.loadLevel === 'function', 'loadLevel() exists');
assert(typeof Game.Levels.update === 'function', 'update() exists');
assert(typeof Game.Levels.draw === 'function', 'draw() exists');
assert(typeof Game.Levels.getCurrentTilemap === 'function', 'getCurrentTilemap() exists');
assert(typeof Game.Levels.getPlayerSpawn === 'function', 'getPlayerSpawn() exists');
assert(typeof Game.Levels.isWall === 'function', 'isWall() exists');

section('init & loadLevel');
Game.Levels.init();
Game.Levels.loadLevel(0);

const map = Game.Levels.getCurrentTilemap();
assert(Array.isArray(map), 'getCurrentTilemap returns array');
assert(map.length === Game.CONST.ROOM_H, `tilemap has ${Game.CONST.ROOM_H} rows (got ${map.length})`);
assert(map[0].length === Game.CONST.ROOM_W, `tilemap has ${Game.CONST.ROOM_W} cols (got ${map[0].length})`);

section('Tile Values');
const flatTiles = map.flat();
const uniqueTiles = [...new Set(flatTiles)];
assert(uniqueTiles.includes(0), 'tilemap contains floor tiles (0)');
assert(uniqueTiles.includes(1), 'tilemap contains wall tiles (1)');
const hasDoors = uniqueTiles.includes(2) || uniqueTiles.includes(3);
assert(hasDoors, 'tilemap contains door tiles (2 or 3)');

section('Border Walls');
let allTopWalls = true, allBottomWalls = true, allLeftWalls = true, allRightWalls = true;
for (let x = 0; x < Game.CONST.ROOM_W; x++) {
    if (map[0][x] !== 1) allTopWalls = false;
    if (map[Game.CONST.ROOM_H - 1][x] !== 1) allBottomWalls = false;
}
for (let y = 0; y < Game.CONST.ROOM_H; y++) {
    if (map[y][0] !== 1) allLeftWalls = false;
    if (map[y][Game.CONST.ROOM_W - 1] !== 1) allRightWalls = false;
}
assert(allTopWalls, 'top border is all walls');
assert(allBottomWalls, 'bottom border is all walls');
assert(allLeftWalls, 'left border is all walls');
assert(allRightWalls, 'right border is all walls');

section('isWall');
assert(Game.Levels.isWall(0, 0) === true, 'corner (0,0) is wall');
let floorFound = false;
for (let y = 1; y < Game.CONST.ROOM_H - 1 && !floorFound; y++) {
    for (let x = 1; x < Game.CONST.ROOM_W - 1 && !floorFound; x++) {
        if (map[y][x] === 0) {
            assert(Game.Levels.isWall(x, y) === false, `floor tile (${x},${y}) is not wall`);
            floorFound = true;
        }
    }
}
assert(floorFound, 'found at least one floor tile');
assert(Game.Levels.isWall(-1, 0) === true, 'out of bounds (-1,0) is wall');
assert(Game.Levels.isWall(99, 99) === true, 'out of bounds (99,99) is wall');

section('Player Spawn');
const spawn = Game.Levels.getPlayerSpawn();
assert(typeof spawn === 'object' && typeof spawn.x === 'number' && typeof spawn.y === 'number',
    'getPlayerSpawn returns {x, y}');
const spawnTX = Math.floor(spawn.x / Game.CONST.TILE_SIZE);
const spawnTY = Math.floor(spawn.y / Game.CONST.TILE_SIZE);
assert(map[spawnTY] && map[spawnTY][spawnTX] === 0,
    `player spawn tile (${spawnTX},${spawnTY}) is floor`);

section('All Levels');
for (let i = 0; i < 3; i++) {
    Game.Enemies._enemies = [];
    Game.Levels.loadLevel(i);
    const m = Game.Levels.getCurrentTilemap();
    assert(m.length === Game.CONST.ROOM_H, `level ${i}: correct height`);
    assert(m[0].length === Game.CONST.ROOM_W, `level ${i}: correct width`);
    const s = Game.Levels.getPlayerSpawn();
    assert(s.x > 0 && s.y > 0, `level ${i}: valid spawn position`);
}

section('Draw');
Game.Levels.loadLevel(0);
let drawError = null;
try { Game.Levels.draw(ctx); } catch (e) { drawError = e; }
assert(drawError === null, `draw() runs without error${drawError ? ': ' + drawError.message : ''}`);

section('Events');
let clearedFired = false;
Game.Events.on('room-cleared', () => clearedFired = true);
let updateError = null;
try { Game.Levels.update(); } catch (e) { updateError = e; }
assert(updateError === null, `update() runs without error${updateError ? ': ' + updateError.message : ''}`);

section('Wave Spawning & Room Clearing');
Game.Events.clear();
Game.Enemies._enemies = [];
Game.Levels.init();
Game.Levels.loadLevel(0);

// Simulate: update triggers wave spawn for room 0
Game.Levels.update();
assert(Game.Enemies._enemies.length > 0, 'enemies spawned after entering room 0');

// Simulate: kill all enemies → room clears
let roomCleared = false;
Game.Events.on('room-cleared', () => { roomCleared = true; });
for (const e of Game.Enemies._enemies) e.alive = false;
Game.Levels.update();
assert(roomCleared, 'room-cleared event fires when enemies dead');

// ========== Summary ==========
console.log(`\n\x1b[1m═══════════════\x1b[0m`);
if (failed === 0) {
    console.log(`\x1b[32mAll ${passed} tests passed!\x1b[0m`);
} else {
    console.log(`\x1b[31mPassed: ${passed} | Failed: ${failed}\x1b[0m`);
}
process.exit(failed > 0 ? 1 : 0);
