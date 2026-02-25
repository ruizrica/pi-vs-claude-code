/**
 * Node.js test runner for engine.js and player.js
 * Uses minimal DOM mocking — no external deps
 */

// ── Minimal DOM mocking ──
class MockCanvas {
    constructor() {
        this.width = 960;
        this.height = 640;
        this._ctx = new MockCtx();
        this._listeners = {};
    }
    getContext(type) { return this._ctx; }
    getBoundingClientRect() { return { left: 0, top: 0, width: 960, height: 640 }; }
    addEventListener(type, fn) {
        (this._listeners[type] = this._listeners[type] || []).push(fn);
    }
    removeEventListener() {}
}

class MockCtx {
    constructor() {
        this.fillStyle = '';
        this.strokeStyle = '';
        this.font = '';
        this.textAlign = '';
        this.textBaseline = '';
        this.globalAlpha = 1;
        this.shadowColor = '';
        this.shadowBlur = 0;
        this.lineWidth = 1;
    }
    fillRect() {}
    strokeRect() {}
    fillText() {}
    beginPath() {}
    closePath() {}
    moveTo() {}
    lineTo() {}
    arc() {}
    fill() {}
    stroke() {}
    save() {}
    restore() {}
    translate() {}
}

// Mock globals
const _listeners = {};
globalThis.window = globalThis;
globalThis.window.addEventListener = function(type, fn) {
    (_listeners[type] = _listeners[type] || []).push(fn);
};
globalThis.window.removeEventListener = function() {};
globalThis.document = { getElementById: () => new MockCanvas() };
globalThis.requestAnimationFrame = () => 1;
globalThis.cancelAnimationFrame = () => {};
globalThis.setTimeout = (fn, t) => { /* don't execute in tests */ };
globalThis.performance = { now: () => Date.now() };
globalThis.console = console;

// ── Load modules ──
require('../js/contracts.js');
require('../js/engine.js');
require('../js/player.js');

// ── Test harness ──
let passed = 0, failed = 0;

function assert(condition, msg) {
    if (condition) {
        console.log(`  ✓ ${msg}`);
        passed++;
    } else {
        console.error(`  ✗ ${msg}`);
        failed++;
    }
}

function section(name) {
    console.log(`\n▸ ${name}`);
}

// ═══════════════════════════════════════════════════════════
// ENGINE TESTS
// ═══════════════════════════════════════════════════════════

section('Engine namespace');
assert(typeof Game.Engine === 'object', 'Game.Engine exists');
assert(typeof Game.Engine.init === 'function', 'Engine.init is a function');
assert(typeof Game.Engine.update === 'function', 'Engine.update is a function');
assert(typeof Game.Engine.draw === 'function', 'Engine.draw is a function');
assert(typeof Game.Engine.gameLoop === 'function', 'Engine.gameLoop is a function');

section('Input system');
assert(typeof Game.Engine.keys === 'object', 'Engine.keys exists');
assert(Game.Engine.keys.w === false, 'keys.w initialized to false');
assert(Game.Engine.keys.a === false, 'keys.a initialized to false');
assert(Game.Engine.keys.s === false, 'keys.s initialized to false');
assert(Game.Engine.keys.d === false, 'keys.d initialized to false');
assert(Game.Engine.keys.space === false, 'keys.space initialized to false');
assert(Game.Engine.keys.escape === false, 'keys.escape initialized to false');
assert(typeof Game.Engine.mouse === 'object', 'Engine.mouse exists');
assert(Game.Engine.mouse.x === 0, 'mouse.x initialized to 0');
assert(Game.Engine.mouse.y === 0, 'mouse.y initialized to 0');
assert(Game.Engine.mouse.down === false, 'mouse.down initialized to false');

section('Collision system');
assert(typeof Game.Engine.checkWallCollision === 'function', 'checkWallCollision exists');
const TS = Game.CONST.TILE_SIZE;
const testMap = [
    [1,1,1,1,1],
    [1,0,0,0,1],
    [1,0,0,0,1],
    [1,0,0,0,1],
    [1,1,1,1,1],
];
// Center of open area
let r = Game.Engine.checkWallCollision(2.5*TS, 2.5*TS, 10, testMap);
assert(r.blocked === false, 'Open space is not blocked');
// Inside a wall tile
let r2 = Game.Engine.checkWallCollision(0, 0, 10, testMap);
assert(r2.blocked === true, 'Wall position is blocked');
// No tilemap
let r3 = Game.Engine.checkWallCollision(100, 100, 10, null);
assert(r3.blocked === false, 'Null tilemap returns not blocked');

section('Particle system');
assert(typeof Game.Engine.addParticle === 'function', 'addParticle exists');
assert(Array.isArray(Game.Engine.particles), 'particles array exists');
const pCount = Game.Engine.particles.length;
Game.Engine.addParticle({ x: 100, y: 100, vx: 1, vy: -1, life: 30, color: '#fff', size: 3 });
assert(Game.Engine.particles.length === pCount + 1, 'Particle added');
const lastP = Game.Engine.particles[Game.Engine.particles.length - 1];
assert(lastP.life === 30, 'Particle has correct life');
assert(lastP.maxLife === 30, 'Particle has maxLife set');
assert(lastP.color === '#fff', 'Particle has correct color');

section('Camera system');
assert(typeof Game.Engine.camera === 'object', 'Camera object exists');
assert(typeof Game.Engine.camera.x === 'number', 'Camera.x is a number');
assert(typeof Game.Engine.camera.y === 'number', 'Camera.y is a number');

section('Init with canvas');
const canvas = new MockCanvas();
Game.Engine.init(canvas);
assert(Game.Engine.canvas === canvas, 'Canvas stored on engine');
assert(Game.Engine.ctx !== null, 'Context created');

section('Screen to world coords');
assert(typeof Game.Engine.screenToWorld === 'function', 'screenToWorld exists');
assert(typeof Game.Engine.worldToScreen === 'function', 'worldToScreen exists');
Game.Engine.camera.x = 100;
Game.Engine.camera.y = 50;
const w = Game.Engine.screenToWorld(200, 150);
assert(w.x === 300, 'screenToWorld x correct');
assert(w.y === 200, 'screenToWorld y correct');
const s = Game.Engine.worldToScreen(300, 200);
assert(s.x === 200, 'worldToScreen x correct');
assert(s.y === 150, 'worldToScreen y correct');
Game.Engine.camera.x = 0;
Game.Engine.camera.y = 0;

section('Game state machine');
assert(Game.state.screen === 'menu', 'Initial screen is menu');

// ═══════════════════════════════════════════════════════════
// PLAYER TESTS
// ═══════════════════════════════════════════════════════════

section('Player namespace');
assert(typeof Game.Player === 'object', 'Game.Player exists');
assert(typeof Game.Player.init === 'function', 'Player.init is a function');
assert(typeof Game.Player.update === 'function', 'Player.update is a function');
assert(typeof Game.Player.draw === 'function', 'Player.draw is a function');
assert(typeof Game.Player.takeDamage === 'function', 'Player.takeDamage exists');
assert(typeof Game.Player.shoot === 'function', 'Player.shoot exists');
assert(typeof Game.Player.dash === 'function', 'Player.dash exists');

section('Player init');
Game.Player.init();
assert(Game.Player.hp === Game.CONST.PLAYER_MAX_HP, 'HP set to max');
assert(Game.Player.maxHp === Game.CONST.PLAYER_MAX_HP, 'maxHp matches CONST');
assert(Game.Player.speed === Game.CONST.PLAYER_SPEED, 'Speed from CONST');
assert(Game.Player.alive === true, 'Player starts alive');
assert(Game.Player.invulnerable === false, 'Player starts vulnerable');
assert(typeof Game.Player.x === 'number', 'Player has x');
assert(typeof Game.Player.y === 'number', 'Player has y');
assert(Game.Player.score === 0, 'Score starts at 0');
assert(Array.isArray(Game.Player.projectiles), 'Projectiles array exists');

section('Player takeDamage');
Game.Events.clear();
Game.Player.init();
let hitEmitted = false;
Game.Events.on('player-hit', () => { hitEmitted = true; });
Game.Player.takeDamage(20);
assert(Game.Player.hp === Game.CONST.PLAYER_MAX_HP - 20, 'HP reduced by damage');
assert(Game.Player.invulnerable === true, 'Player becomes invulnerable after hit');
assert(hitEmitted, 'player-hit event emitted');

// Damage while invulnerable
const hpAfter = Game.Player.hp;
Game.Player.takeDamage(20);
assert(Game.Player.hp === hpAfter, 'No damage while invulnerable');

section('Player death');
Game.Events.clear();
Game.Player.init();
let deathEmitted = false;
Game.Events.on('player-death', () => { deathEmitted = true; });
Game.Player.takeDamage(200);
assert(Game.Player.hp <= 0, 'HP drops to 0 or below');
assert(Game.Player.alive === false, 'Player is dead');
assert(deathEmitted, 'player-death event emitted');

section('Player shoot');
Game.Events.clear();
Game.Player.init();
let shootEmitted = false;
Game.Events.on('player-shoot', () => { shootEmitted = true; });
Game.Engine.mouse.x = Game.Player.x + 100;
Game.Engine.mouse.y = Game.Player.y;
Game.Player.shootCooldown = 0;
Game.Player.shoot();
assert(Game.Player.projectiles.length === 1, 'Projectile created');
assert(shootEmitted, 'player-shoot event emitted');
const proj = Game.Player.projectiles[0];
assert(proj.vx > 0, 'Projectile moves toward mouse (positive vx)');
assert(Math.abs(proj.vy) < 0.5, 'Projectile vy near zero for horizontal shot');
assert(proj.damage === Game.CONST.PROJECTILE_DAMAGE, 'Projectile damage from CONST');

section('Player shoot cooldown');
Game.Player.shoot(); // should be blocked by cooldown
assert(Game.Player.projectiles.length === 1, 'No shot during cooldown');

section('Player dash');
Game.Events.clear();
Game.Player.init();
Game.Player.dashCooldown = 0;
Game.Engine.keys.d = true;
Game.Player.dash();
assert(Game.Player.dashTimer > 0, 'Dash timer started');
assert(Game.Player.dashTimer === Game.CONST.PLAYER_DASH_DURATION, 'Dash duration from CONST');
assert(Game.Player.invulnerable === true, 'Invulnerable during dash');
assert(Game.Player.dashCooldown === Game.CONST.PLAYER_DASH_COOLDOWN, 'Dash cooldown set');
Game.Engine.keys.d = false;

section('Player dash cooldown');
Game.Player.dash(); // should be blocked
assert(Game.Player.dashTimer === Game.CONST.PLAYER_DASH_DURATION, 'Second dash blocked by cooldown');

section('Player movement with no tilemap');
Game.Player.init();
const startX = Game.Player.x;
Game.Engine.keys.d = true;
Game.Player.update(1);
assert(Game.Player.x > startX, 'Player moved right with D key (no tilemap)');
Game.Engine.keys.d = false;

section('Projectile properties');
Game.Player.init();
Game.Player.shootCooldown = 0;
Game.Engine.mouse.x = Game.Player.x + 100;
Game.Engine.mouse.y = Game.Player.y;
Game.Player.shoot();
const p = Game.Player.projectiles[0];
assert(typeof p.x === 'number', 'Projectile has x');
assert(typeof p.y === 'number', 'Projectile has y');
assert(typeof p.vx === 'number', 'Projectile has vx');
assert(typeof p.vy === 'number', 'Projectile has vy');
assert(typeof p.damage === 'number', 'Projectile has damage');
assert(typeof p.life === 'number', 'Projectile has life');
assert(Array.isArray(p.trail), 'Projectile has trail array');

section('Draw methods exist and run without error');
const mockCtx = new MockCtx();
try {
    Game.Player.draw(mockCtx);
    assert(true, 'Player.draw() runs without error');
} catch (e) {
    assert(false, 'Player.draw() threw: ' + e.message);
}
try {
    Game.Player.drawProjectiles(mockCtx);
    assert(true, 'Player.drawProjectiles() runs without error');
} catch (e) {
    assert(false, 'Player.drawProjectiles() threw: ' + e.message);
}

section('Collision resolution');
// Player at edge of wall should be pushed back
const wallMap = [
    [1,1,1,1,1,1,1],
    [1,0,0,0,0,0,1],
    [1,0,0,0,0,0,1],
    [1,0,0,0,0,0,1],
    [1,1,1,1,1,1,1],
];
// Position overlapping left wall
const edgeResult = Game.Engine.checkWallCollision(TS + 2, 2*TS + TS/2, 20, wallMap);
assert(edgeResult.blocked === true, 'Near wall edge is blocked');
assert(edgeResult.nx >= TS + 10, 'Resolved x pushed away from wall');

// ── Summary ──
console.log(`\n═══════════════════════════════════════`);
if (failed === 0) {
    console.log(`  ✅ ALL ${passed} TESTS PASSED`);
} else {
    console.log(`  ❌ ${passed} passed, ${failed} FAILED`);
}
console.log(`═══════════════════════════════════════`);

process.exit(failed > 0 ? 1 : 0);
