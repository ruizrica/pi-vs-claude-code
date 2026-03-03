// contracts.js — Shared constants and event bus for the dungeon crawler
// This file is SHARED — all lanes can read, modify carefully.

window.Game = window.Game || {};

window.Game.CONST = {
    TILE_SIZE: 32,
    ROOM_W: 30,
    ROOM_H: 20,
    CANVAS_W: 960,   // 30 * 32
    CANVAS_H: 640,   // 20 * 32

    COLORS: {
        DOOR: '#00ff88',
        DOOR_LOCKED: '#ff3366',
        FLOOR: '#0d0d14',
        UI_TEXT: '#ffffff',
        HEALTH_BAR: '#ff3366',
        XP_BAR: '#00ff88',
    },

    LEVEL_THEMES: [
        { name: 'The Crypt',     wall: '#1a1a2e', wallLight: '#25254a', floor: '#0d0d1a', accent: '#3a3a6e' },
        { name: 'The Inferno',   wall: '#2e1a1a', wallLight: '#4a2525', floor: '#1a0d0d', accent: '#6e3a3a' },
        { name: 'The Void Nexus', wall: '#1e1a2e', wallLight: '#2e2548', floor: '#100d1a', accent: '#5a3a6e' },
    ],

    ENEMY_TYPES: {
        CHASER: 'chaser',
        SHOOTER: 'shooter',
        TANK: 'tank',
        DASHER: 'dasher',
    },

    BOSS_TYPES: {
        WARDEN: 'warden',
        SORCERER: 'sorcerer',
        VOID_KING: 'void_king',
    },
};

// Simple event bus
window.Game.Events = (function () {
    const listeners = {};
    return {
        on(event, fn) {
            (listeners[event] = listeners[event] || []).push(fn);
        },
        off(event, fn) {
            if (!listeners[event]) return;
            listeners[event] = listeners[event].filter(f => f !== fn);
        },
        emit(event, data) {
            (listeners[event] || []).forEach(fn => fn(data));
        },
        clear() {
            Object.keys(listeners).forEach(k => delete listeners[k]);
        },
    };
})();
