/**
 * SHARED GAME CONTRACTS — All modules depend on these interfaces
 * ================================================================
 * This file defines the shared API surface between all game modules.
 * Each module registers itself on the global `window.Game` namespace.
 */

// Global game namespace
window.Game = window.Game || {};

// ── CONSTANTS ──────────────────────────────────────────────────
window.Game.CONST = {
    CANVAS_W: 960,
    CANVAS_H: 640,
    TILE_SIZE: 32,
    FPS: 60,
    
    // Player
    PLAYER_SPEED: 3.5,
    PLAYER_DASH_SPEED: 10,
    PLAYER_DASH_DURATION: 8,
    PLAYER_DASH_COOLDOWN: 45,
    PLAYER_MAX_HP: 100,
    PLAYER_SHOOT_COOLDOWN: 10,
    PLAYER_SIZE: 20,
    PROJECTILE_SPEED: 7,
    PROJECTILE_DAMAGE: 10,
    PROJECTILE_SIZE: 5,
    
    // Enemies
    ENEMY_SIZE: 18,
    ENEMY_SPEED: 1.5,
    ENEMY_HP: 30,
    ENEMY_DAMAGE: 10,
    ENEMY_SHOOT_COOLDOWN: 90,
    
    // Bosses — each level has one
    BOSS_SIZE: 40,
    BOSS_HP: [300, 500, 800],        // per level
    BOSS_DAMAGE: [15, 20, 30],       // per level
    BOSS_SPEED: [1.2, 1.5, 2.0],    // per level
    
    // Levels
    LEVEL_COUNT: 3,
    ROOM_W: 30,  // tiles
    ROOM_H: 20,  // tiles
    
    // Colors (dark theme)
    COLORS: {
        BG:          '#0a0a0f',
        WALL:        '#1a1a2e',
        FLOOR:       '#12121a',
        FLOOR_ALT:   '#16162a',
        PLAYER:      '#00e5ff',
        PLAYER_GLOW: '#00e5ff44',
        PROJ_PLAYER: '#00e5ff',
        PROJ_ENEMY:  '#ff4444',
        ENEMY:       '#ff3366',
        ENEMY_GLOW:  '#ff336644',
        BOSS_1:      '#ff6600',
        BOSS_2:      '#cc00ff',
        BOSS_3:      '#ff0044',
        HP_BAR:      '#00ff88',
        HP_BAR_BG:   '#1a1a2e',
        BOSS_HP:     '#ff3366',
        XP:          '#ffcc00',
        TEXT:        '#e0e0e0',
        TEXT_DIM:    '#666680',
        HUD_BG:      '#0a0a0fcc',
        DASH_TRAIL:  '#00e5ff33',
        PARTICLE:    '#ffcc00',
        DOOR:        '#00ff88',
        DOOR_LOCKED: '#ff3366',
        MINIMAP_BG:  '#0a0a0faa',
    },
    
    // Level themes
    LEVEL_THEMES: [
        { name: 'The Crypt',       wall: '#1a1a2e', wallLight: '#2a2a44', floor: '#12121a', accent: '#3344aa' },
        { name: 'The Inferno',     wall: '#2e1a1a', wallLight: '#442a2a', floor: '#1a1212', accent: '#aa4433' },
        { name: 'The Void Nexus',  wall: '#1a1a2e', wallLight: '#2a1a3e', floor: '#0f0a18', accent: '#8833cc' },
    ],
};

// ── EVENT BUS ──────────────────────────────────────────────────
window.Game.Events = {
    _listeners: {},
    on(event, fn)   { (this._listeners[event] = this._listeners[event] || []).push(fn); },
    off(event, fn)  { this._listeners[event] = (this._listeners[event] || []).filter(f => f !== fn); },
    emit(event, data) { (this._listeners[event] || []).forEach(fn => fn(data)); },
    clear()         { this._listeners = {}; },
};

// ── GAME STATE ─────────────────────────────────────────────────
window.Game.state = {
    screen: 'menu',      // menu | playing | paused | gameover | victory | levelcomplete
    level: 0,            // 0-indexed
    score: 0,
    kills: 0,
    time: 0,
    bossActive: false,
    bossDefeated: false,
    enemiesRemaining: 0,
    totalEnemies: 0,
    shakeTimer: 0,
    shakeIntensity: 0,
};

// ── UTILITY FUNCTIONS ──────────────────────────────────────────
window.Game.Utils = {
    dist(a, b) {
        return Math.hypot(a.x - b.x, a.y - b.y);
    },
    angle(a, b) {
        return Math.atan2(b.y - a.y, b.x - a.x);
    },
    clamp(v, min, max) {
        return Math.max(min, Math.min(max, v));
    },
    lerp(a, b, t) {
        return a + (b - a) * t;
    },
    rand(min, max) {
        return Math.random() * (max - min) + min;
    },
    randInt(min, max) {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    },
    rectCollide(a, b) {
        return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
    },
    circleCollide(a, ar, b, br) {
        return this.dist(a, b) < ar + br;
    },
    screenShake(intensity, duration) {
        Game.state.shakeIntensity = intensity;
        Game.state.shakeTimer = duration;
    },
};

console.log('[Game] Contracts loaded');
