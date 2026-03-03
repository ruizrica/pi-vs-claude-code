/**
 * Node.js test runner for enemies.js and bosses.js
 * Uses a minimal DOM mock to load the modules and verify behavior
 */

// Minimal browser mocks
globalThis.window = globalThis;
globalThis.console = console;
globalThis.performance = { now: () => Date.now() };
globalThis.requestAnimationFrame = () => {};
globalThis.setTimeout = setTimeout;
globalThis.Math = Math;

// Canvas mock
const canvasMock = {
    getContext() {
        return {
            save() {},
            restore() {},
            translate() {},
            beginPath() {},
            moveTo() {},
            lineTo() {},
            closePath() {},
            arc() {},
            fill() {},
            stroke() {},
            fillRect() {},
            strokeRect() {},
            fillText() {},
            createRadialGradient() {
                return { addColorStop() {} };
            },
            fillStyle: '',
            strokeStyle: '',
            lineWidth: 1,
            globalAlpha: 1,
            shadowColor: '',
            shadowBlur: 0,
            textAlign: '',
            textBaseline: '',
            font: '',
        };
    },
    width: 960,
    height: 640,
    addEventListener() {},
    getBoundingClientRect() { return { left: 0, top: 0 }; },
};

const ctx = canvasMock.getContext();

// ─── Load modules ──────────────────────────────────────────
const fs = require('fs');
const path = require('path');

function loadScript(filePath) {
    const code = fs.readFileSync(path.resolve(__dirname, '..', filePath), 'utf-8');
    const fn = new Function(code);
    fn();
}

// Load contracts first
loadScript('js/contracts.js');

// Mock Game.Player
window.Game.Player = {
    x: 480, y: 320,
    hp: 100, maxHp: 100, alive: true,
    projectiles: [],
    takeDamage(amt) { this.hp -= amt; },
};

// Mock Game.Engine
window.Game.Engine = {
    addParticle(p) {},
    checkWallCollision(x, y, size, tilemap) {
        return { blocked: false, nx: x, ny: y };
    },
    keys: { w: false, a: false, s: false, d: false, space: false },
    mouse: { x: 480, y: 320, down: false },
    camera: { x: 0, y: 0 },
    screenToWorld(sx, sy) { return { x: sx, y: sy }; },
};

// Mock Game.Levels
window.Game.Levels = {
    getCurrentTilemap() { return null; },
};

// Load our modules
loadScript('js/enemies.js');
loadScript('js/bosses.js');

// ─── Test Framework ────────────────────────────────────────
let passed = 0, failed = 0;

function section(name) {
    console.log(`\n\x1b[36m═══ ${name} ═══\x1b[0m`);
}

function assert(condition, msg) {
    if (condition) {
        passed++;
        console.log(`  \x1b[32m✓\x1b[0m ${msg}`);
    } else {
        failed++;
        console.log(`  \x1b[31m✗\x1b[0m ${msg}`);
    }
}

// ═══════════════════════════════════════════════════════════
// ENEMY SYSTEM TESTS
// ═══════════════════════════════════════════════════════════

section('Enemies Module Structure');
assert(typeof Game.Enemies === 'object', 'Game.Enemies exists');
assert(typeof Game.Enemies.init === 'function', 'init() exists');
assert(typeof Game.Enemies.spawnWave === 'function', 'spawnWave() exists');
assert(typeof Game.Enemies.update === 'function', 'update() exists');
assert(typeof Game.Enemies.draw === 'function', 'draw() exists');
assert(typeof Game.Enemies.getAll === 'function', 'getAll() exists');
assert(typeof Game.Enemies.clear === 'function', 'clear() exists');
assert(typeof Game.Enemies.count === 'function', 'count() exists');
assert(typeof Game.Enemies.getEnemyProjectiles === 'function', 'getEnemyProjectiles() exists');

section('Enemies Init');
Game.Enemies.init();
assert(Game.Enemies.count() === 0, 'No enemies after init');
assert(Array.isArray(Game.Enemies.getAll()), 'getAll() returns array');
assert(Game.Enemies.getAll().length === 0, 'getAll() is empty after init');

section('Enemies SpawnWave');
Game.Enemies.init();
Game.Enemies.spawnWave([
    { type: 'chaser', x: 100, y: 100 },
    { type: 'shooter', x: 200, y: 200 },
    { type: 'tank', x: 300, y: 300 },
    { type: 'dasher', x: 400, y: 400 },
]);
assert(Game.Enemies.count() === 4, 'Spawned 4 enemies');
const all = Game.Enemies.getAll();
assert(all[0].type === 'chaser', 'First enemy is chaser');
assert(all[1].type === 'shooter', 'Second enemy is shooter');
assert(all[2].type === 'tank', 'Third enemy is tank');
assert(all[3].type === 'dasher', 'Fourth enemy is dasher');

section('Enemy Properties');
const chaser = all[0];
assert(chaser.x === 100, 'Chaser x position correct');
assert(chaser.y === 100, 'Chaser y position correct');
assert(chaser.hp > 0, 'Chaser has HP');
assert(chaser.maxHp > 0, 'Chaser has maxHp');
assert(chaser.speed > 0, 'Chaser has speed');
assert(chaser.size > 0, 'Chaser has size');
assert(chaser.alive === true, 'Chaser is alive');
assert(chaser.damage > 0, 'Chaser has damage');
assert(typeof chaser.shootCooldown === 'number', 'Chaser has shootCooldown');

const tank = all[2];
assert(tank.hp > chaser.hp, 'Tank has more HP than chaser (3x)');
assert(tank.speed < chaser.speed, 'Tank is slower than chaser');
assert(tank.hp === chaser.hp * 3 || tank.maxHp === Math.round(Game.CONST.ENEMY_HP * 3), 'Tank has ~3x HP');

section('Enemy Type Differences');
const shooter = all[1];
const dasher = all[3];
assert(dasher.speed > chaser.speed, 'Dasher is faster than chaser');
assert(shooter.speed < chaser.speed, 'Shooter is slower than chaser');

section('Enemy Clear');
Game.Enemies.clear();
assert(Game.Enemies.count() === 0, 'No enemies after clear');

section('Enemy Update — Chaser Movement');
Game.Enemies.init();
// Reset player to known position far from enemy
Game.Player.x = 480;
Game.Player.y = 320;
Game.Player.alive = true;
Game.Player.hp = 100;
Game.Enemies.spawnWave([{ type: 'chaser', x: 100, y: 100 }]);
const chaserBefore = { x: Game.Enemies.getAll()[0].x, y: Game.Enemies.getAll()[0].y };
Game.Enemies.update(1);
const chaserAfter = Game.Enemies.getAll()[0];
assert(chaserAfter.x > chaserBefore.x || chaserAfter.y > chaserBefore.y,
       'Chaser moved toward player (x or y increased toward 480,320)');
assert(chaserAfter.x > chaserBefore.x, 'Chaser x moved toward player');
assert(chaserAfter.y > chaserBefore.y, 'Chaser y moved toward player');

section('Enemy Update — Shooter Keeps Distance');
Game.Enemies.init();
Game.Player.x = 480;
Game.Player.y = 320;
Game.Enemies.spawnWave([{ type: 'shooter', x: 480, y: 320 }]); // Same pos as player
const shooterE = Game.Enemies.getAll()[0];
const shooterBefore = { x: shooterE.x, y: shooterE.y };
Game.Enemies.update(1);
// Shooter should move AWAY since it's at distance 0 (< 170)
const dist = Math.hypot(shooterE.x - 480, shooterE.y - 320);
assert(dist > 0, 'Shooter moved away from player when too close');

section('Enemy Draw (no crash)');
Game.Enemies.init();
Game.Enemies.spawnWave([
    { type: 'chaser', x: 100, y: 100 },
    { type: 'shooter', x: 200, y: 200 },
    { type: 'tank', x: 300, y: 300 },
    { type: 'dasher', x: 400, y: 400 },
]);
try {
    Game.Enemies.draw(ctx);
    assert(true, 'draw() runs without error for all enemy types');
} catch(e) {
    assert(false, 'draw() threw: ' + e.message);
}

section('Enemy Death & Events');
Game.Enemies.init();
Game.Enemies.spawnWave([{ type: 'chaser', x: 100, y: 100 }]);
let killEvent = null;
Game.Events.on('enemy-killed', (data) => { killEvent = data; });
const enemy = Game.Enemies.getAll()[0];
enemy.hp = 0; // Force kill
Game.Enemies.update(1);
assert(Game.Enemies.count() === 0, 'Dead enemy removed from count');
assert(killEvent !== null, 'enemy-killed event emitted');
assert(killEvent.type === 'chaser', 'kill event has correct type');
assert(typeof killEvent.score === 'number', 'kill event has score');
assert(killEvent.score > 0, 'kill event score > 0');
assert(typeof killEvent.x === 'number', 'kill event has x');
assert(typeof killEvent.y === 'number', 'kill event has y');
Game.Events.off('enemy-killed');

section('Enemy Projectiles');
Game.Enemies.init();
Game.Player.x = 300; // At shooting range (~200px away from 200,200)
Game.Player.y = 200;
Game.Enemies.spawnWave([{ type: 'shooter', x: 200, y: 200 }]);
const shooterForProj = Game.Enemies.getAll()[0];
shooterForProj.shootCooldown = 0; // Force ready to shoot
for (let i = 0; i < 5; i++) Game.Enemies.update(1);
const projArray = Game.Enemies.getEnemyProjectiles();
assert(Array.isArray(projArray), 'Enemy projectiles array exists');
// Shooter should have fired since cooldown was 0
assert(projArray.length > 0, 'Shooter fired projectile(s)');
if (projArray.length > 0) {
    const p = projArray[0];
    assert(typeof p.x === 'number', 'Projectile has x');
    assert(typeof p.y === 'number', 'Projectile has y');
    assert(typeof p.vx === 'number', 'Projectile has vx');
    assert(typeof p.vy === 'number', 'Projectile has vy');
    assert(typeof p.damage === 'number', 'Projectile has damage');
    assert(typeof p.size === 'number', 'Projectile has size');
    assert(typeof p.life === 'number', 'Projectile has life');
}

section('Multiple SpawnWaves Accumulate');
Game.Enemies.init();
Game.Enemies.spawnWave([{ type: 'chaser', x: 100, y: 100 }]);
assert(Game.Enemies.count() === 1, 'One enemy after first wave');
Game.Enemies.spawnWave([{ type: 'chaser', x: 200, y: 200 }]);
assert(Game.Enemies.count() === 2, 'Two enemies after second wave');

section('Invalid Enemy Type Handling');
Game.Enemies.init();
Game.Enemies.spawnWave([{ type: 'unknown_type', x: 100, y: 100 }]);
assert(Game.Enemies.count() === 0, 'Unknown type not spawned');

// ═══════════════════════════════════════════════════════════
// BOSS SYSTEM TESTS
// ═══════════════════════════════════════════════════════════

section('Bosses Module Structure');
assert(typeof Game.Bosses === 'object', 'Game.Bosses exists');
assert(typeof Game.Bosses.init === 'function', 'init() exists');
assert(typeof Game.Bosses.spawn === 'function', 'spawn() exists');
assert(typeof Game.Bosses.update === 'function', 'update() exists');
assert(typeof Game.Bosses.draw === 'function', 'draw() exists');
assert(typeof Game.Bosses.getActive === 'function', 'getActive() exists');
assert(typeof Game.Bosses.isAlive === 'function', 'isAlive() exists');
assert(typeof Game.Bosses.takeDamage === 'function', 'takeDamage() exists');

section('Bosses Init');
Game.Bosses.init();
assert(Game.Bosses.getActive() === null, 'No active boss after init');
assert(Game.Bosses.isAlive() === false, 'Boss is not alive after init');

section('Boss Spawn Level 0 (The Warden)');
Game.Bosses.init();
Game.Bosses.spawn(0);
const warden = Game.Bosses.getActive();
assert(warden !== null, 'Warden spawned');
assert(warden.name === 'The Warden', 'Boss name is The Warden');
assert(warden.hp === Game.CONST.BOSS_HP[0], 'Warden HP matches CONST (' + Game.CONST.BOSS_HP[0] + ')');
assert(warden.maxHp === Game.CONST.BOSS_HP[0], 'Warden maxHp matches CONST');
assert(warden.damage === Game.CONST.BOSS_DAMAGE[0], 'Warden damage matches CONST');
assert(warden.speed === Game.CONST.BOSS_SPEED[0], 'Warden speed matches CONST');
assert(warden.phase === 1, 'Warden starts in phase 1');
assert(warden.alive === true, 'Warden is alive');
assert(Game.Bosses.isAlive() === true, 'isAlive() returns true');
assert(warden.level === 0, 'Warden level is 0');
assert(warden.color === '#ff6600', 'Warden color is orange');

section('Boss Spawn Level 1 (The Sorcerer)');
Game.Bosses.init();
Game.Bosses.spawn(1);
const sorcerer = Game.Bosses.getActive();
assert(sorcerer !== null, 'Sorcerer spawned');
assert(sorcerer.name === 'The Sorcerer', 'Boss name is The Sorcerer');
assert(sorcerer.hp === Game.CONST.BOSS_HP[1], 'Sorcerer HP matches CONST (' + Game.CONST.BOSS_HP[1] + ')');
assert(sorcerer.color === '#cc00ff', 'Sorcerer color is purple');
assert(sorcerer.level === 1, 'Sorcerer level is 1');
assert(Array.isArray(sorcerer.shieldOrbs), 'Sorcerer has shield orbs');
assert(sorcerer.shieldOrbs.length === 3, 'Sorcerer has 3 shield orbs');
assert(sorcerer.shieldOrbs[0].hp === 30, 'Shield orb has 30 HP');

section('Boss Spawn Level 2 (The Void King)');
Game.Bosses.init();
Game.Bosses.spawn(2);
const voidKing = Game.Bosses.getActive();
assert(voidKing !== null, 'Void King spawned');
assert(voidKing.name === 'The Void King', 'Boss name is The Void King');
assert(voidKing.hp === Game.CONST.BOSS_HP[2], 'Void King HP matches CONST (' + Game.CONST.BOSS_HP[2] + ')');
assert(voidKing.color === '#ff0044', 'Void King color is crimson');
assert(voidKing.phaseCount === 3, 'Void King has 3 phases');

section('Boss Update (no crash)');
Game.Player.alive = true;
Game.Player.hp = 100;
Game.Bosses.init();
Game.Bosses.spawn(0);
try {
    for (let i = 0; i < 10; i++) Game.Bosses.update(1);
    assert(true, 'Warden update() runs without error');
} catch(e) {
    assert(false, 'Warden update() threw: ' + e.message);
}

Game.Bosses.init();
Game.Bosses.spawn(1);
try {
    for (let i = 0; i < 10; i++) Game.Bosses.update(1);
    assert(true, 'Sorcerer update() runs without error');
} catch(e) {
    assert(false, 'Sorcerer update() threw: ' + e.message);
}

Game.Bosses.init();
Game.Bosses.spawn(2);
try {
    for (let i = 0; i < 10; i++) Game.Bosses.update(1);
    assert(true, 'Void King update() runs without error');
} catch(e) {
    assert(false, 'Void King update() threw: ' + e.message);
}

section('Boss Draw (no crash)');
Game.Bosses.init();
Game.Bosses.spawn(0);
try {
    Game.Bosses.draw(ctx);
    assert(true, 'draw() runs without error for Warden');
} catch(e) {
    assert(false, 'draw() threw for Warden: ' + e.message);
}

Game.Bosses.init();
Game.Bosses.spawn(1);
try {
    Game.Bosses.draw(ctx);
    assert(true, 'draw() runs without error for Sorcerer');
} catch(e) {
    assert(false, 'draw() threw for Sorcerer: ' + e.message);
}

Game.Bosses.init();
Game.Bosses.spawn(2);
try {
    Game.Bosses.draw(ctx);
    assert(true, 'draw() runs without error for Void King');
} catch(e) {
    assert(false, 'draw() threw for Void King: ' + e.message);
}

section('Boss Phase Transition — Warden');
Game.Bosses.init();
Game.Bosses.spawn(0);
let phaseEvent = null;
Game.Events.on('boss-phase-change', (data) => { phaseEvent = data; });
const boss = Game.Bosses.getActive();
boss.hp = Math.floor(boss.maxHp * 0.49);
Game.Bosses.update(1);
assert(boss.phase === 2, 'Boss transitions to phase 2 at <50% HP');
assert(phaseEvent !== null, 'boss-phase-change event emitted');
assert(phaseEvent.phase === 2, 'Phase event says phase 2');
assert(phaseEvent.name === 'The Warden', 'Phase event has boss name');
Game.Events.off('boss-phase-change');

section('Boss Phase Transition — Does Not Double-Trigger');
Game.Bosses.update(1); // update again at same HP
assert(boss.phase === 2, 'Still phase 2 after second update');

section('Boss Death');
Game.Bosses.init();
Game.Bosses.spawn(0);
let deathEvent = null;
Game.Events.on('boss-defeated', (data) => { deathEvent = data; });
const dyingBoss = Game.Bosses.getActive();
dyingBoss.hp = 0;
Game.Bosses.update(1);
assert(Game.Bosses.isAlive() === false, 'Boss is dead after HP reaches 0');
assert(deathEvent !== null, 'boss-defeated event emitted');
assert(deathEvent.name === 'The Warden', 'death event has boss name');
assert(deathEvent.level === 0, 'death event has level');
Game.Events.off('boss-defeated');

section('Void King Phase 3 (Enrage)');
Game.Bosses.init();
Game.Bosses.spawn(2);
const vk = Game.Bosses.getActive();
// First trigger phase 2
vk.hp = Math.floor(vk.maxHp * 0.49);
Game.Bosses.update(1);
assert(vk.phase === 2, 'Void King enters phase 2 at <50% HP');
// Then trigger phase 3
vk.hp = Math.floor(vk.maxHp * 0.24);
Game.Bosses.update(1);
assert(vk.phase === 3, 'Void King enters phase 3 at <25% HP');

section('Boss takeDamage');
Game.Bosses.init();
Game.Bosses.spawn(0);
const damageBoss = Game.Bosses.getActive();
const hpBefore = damageBoss.hp;
Game.Bosses.takeDamage(50);
assert(damageBoss.hp === hpBefore - 50, 'takeDamage reduces HP');
assert(damageBoss.flashTimer > 0, 'takeDamage sets flash timer');

section('Sorcerer Shield Orbs Absorb Damage');
Game.Bosses.init();
Game.Bosses.spawn(1);
const sorcBoss = Game.Bosses.getActive();
const sorcHpBefore = sorcBoss.hp;
Game.Bosses.takeDamage(10);
assert(sorcBoss.hp === sorcHpBefore, 'Sorcerer HP unchanged (orb absorbed hit)');
assert(sorcBoss.shieldOrbs[0].hp === 20, 'Shield orb HP reduced');

section('Sorcerer Shield Orb Destruction');
Game.Bosses.takeDamage(20); // Kill first orb
assert(sorcBoss.shieldOrbs[0].alive === false, 'First orb destroyed');
Game.Bosses.takeDamage(10); // Hits second orb
assert(sorcBoss.shieldOrbs[1].hp === 20, 'Second orb takes damage');

section('Boss spawn with no init (guard test)');
Game.Bosses.init();
Game.Bosses.spawn(0);
assert(Game.Bosses.getActive() !== null, 'Boss exists');
Game.Bosses.init();
assert(Game.Bosses.getActive() === null, 'Init clears boss');

section('Boss Projectile Integration');
Game.Enemies.init();
Game.Bosses.init();
Game.Bosses.spawn(0);
const wardenBoss = Game.Bosses.getActive();
wardenBoss.shootTimer = 0; // force ready to shoot
Game.Bosses.update(1);
// Boss should have fired projectiles (via Enemies system or own array)
const enemyProjs = Game.Enemies.getEnemyProjectiles();
const bossProjs = Game.Bosses.getBossProjectiles ? Game.Bosses.getBossProjectiles() : [];
const totalProjs = enemyProjs.length + bossProjs.length;
assert(totalProjs > 0, 'Boss projectiles created (' + totalProjs + ' total)');

// ═══════════════════════════════════════════════════════════
// SUMMARY
// ═══════════════════════════════════════════════════════════
console.log(`\n\x1b[36m═══ RESULTS ═══\x1b[0m`);
if (failed > 0) {
    console.log(`\x1b[31m${passed} passed, ${failed} failed\x1b[0m`);
    process.exit(1);
} else {
    console.log(`\x1b[32m${passed} passed, ${failed} failed ✓ ALL TESTS PASS\x1b[0m`);
    process.exit(0);
}
