// levels.js — Level System
// Provides Game.Levels: procedural level generation, tilemap, room flow, wave spawning, rendering.

(function () {
    'use strict';

    window.Game = window.Game || {};

    const CONST = window.Game.CONST;
    const TILE = CONST.TILE_SIZE;   // 32
    const W = CONST.ROOM_W;         // 30
    const H = CONST.ROOM_H;         // 20

    // ========== Internal state ==========
    let tilemap = [];           // 2D array [y][x]: 0=floor, 1=wall, 2=door_locked, 3=door_open
    let currentLevel = 0;
    let playerSpawn = { x: 0, y: 0 };
    let rooms = [];             // Array of { x, y, w, h, doors: [{tx,ty}], cleared, waveSpawned, isBoss }
    let decorations = [];       // { type, x, y, ...extra }
    let currentRoom = 0;        // index of room player is in
    let roomActive = false;     // true when doors locked & enemies alive
    let bossSpawned = false;
    let levelComplete = false;
    let frameCount = 0;

    // Level wave definitions
    const LEVEL_WAVES = [
        // Level 0 — The Crypt
        [
            [{ type: 'chaser', count: 4 }],
            [{ type: 'chaser', count: 3 }, { type: 'shooter', count: 2 }],
            [{ type: 'boss', boss: 'warden' }],
        ],
        // Level 1 — The Inferno
        [
            [{ type: 'shooter', count: 3 }, { type: 'tank', count: 2 }],
            [{ type: 'chaser', count: 4 }, { type: 'dasher', count: 3 }],
            [{ type: 'boss', boss: 'sorcerer' }],
        ],
        // Level 2 — The Void Nexus
        [
            [{ type: 'chaser', count: 2 }, { type: 'shooter', count: 1 }, { type: 'tank', count: 1 }, { type: 'dasher', count: 1 }],
            [{ type: 'tank', count: 3 }, { type: 'shooter', count: 4 }],
            [{ type: 'boss', boss: 'void_king' }],
        ],
    ];

    // ========== Level generation ==========

    function createEmptyMap(fillVal) {
        const m = [];
        for (let y = 0; y < H; y++) {
            m[y] = [];
            for (let x = 0; x < W; x++) {
                m[y][x] = fillVal !== undefined ? fillVal : 1;
            }
        }
        return m;
    }

    function carveRect(map, rx, ry, rw, rh) {
        for (let y = ry; y < ry + rh && y < H - 1; y++) {
            for (let x = rx; x < rx + rw && x < W - 1; x++) {
                if (y > 0 && x > 0) {
                    map[y][x] = 0;
                }
            }
        }
    }

    function carveCorridor(map, x1, y1, x2, y2) {
        // Horizontal then vertical
        let cx = x1, cy = y1;
        while (cx !== x2) {
            if (cy > 0 && cy < H - 1 && cx > 0 && cx < W - 1) {
                map[cy][cx] = 0;
                // Make corridor 2 wide
                if (cy + 1 < H - 1) map[cy + 1][cx] = 0;
            }
            cx += cx < x2 ? 1 : -1;
        }
        while (cy !== y2) {
            if (cy > 0 && cy < H - 1 && cx > 0 && cx < W - 1) {
                map[cy][cx] = 0;
                if (cx + 1 < W - 1) map[cy][cx + 1] = 0;
            }
            cy += cy < y2 ? 1 : -1;
        }
    }

    function addDoor(map, tx, ty, roomObj) {
        if (ty > 0 && ty < H - 1 && tx > 0 && tx < W - 1) {
            map[ty][tx] = 3; // Start open
            roomObj.doors.push({ tx: tx, ty: ty });
        }
    }

    function generateLevel0(map) {
        // The Crypt: 3 simple rectangular rooms connected by corridors
        rooms = [];
        decorations = [];

        // Room 0: Entrance (left)
        const r0 = { x: 2, y: 4, w: 7, h: 12, doors: [], cleared: false, waveSpawned: false, isBoss: false };
        carveRect(map, r0.x, r0.y, r0.w, r0.h);
        rooms.push(r0);

        // Room 1: Battle Arena (center)
        const r1 = { x: 12, y: 3, w: 8, h: 14, doors: [], cleared: false, waveSpawned: false, isBoss: false };
        carveRect(map, r1.x, r1.y, r1.w, r1.h);
        rooms.push(r1);

        // Room 2: Boss Room (right)
        const r2 = { x: 22, y: 4, w: 7, h: 12, doors: [], cleared: false, waveSpawned: false, isBoss: true };
        carveRect(map, r2.x, r2.y, r2.w, r2.h);
        rooms.push(r2);

        // Corridors
        carveCorridor(map, r0.x + r0.w - 1, r0.y + Math.floor(r0.h / 2), r1.x, r1.y + Math.floor(r1.h / 2));
        carveCorridor(map, r1.x + r1.w - 1, r1.y + Math.floor(r1.h / 2), r2.x, r2.y + Math.floor(r2.h / 2));

        // Doors between rooms
        addDoor(map, r0.x + r0.w, r0.y + Math.floor(r0.h / 2), r0);
        addDoor(map, r0.x + r0.w, r0.y + Math.floor(r0.h / 2) + 1, r0);
        addDoor(map, r1.x + r1.w, r1.y + Math.floor(r1.h / 2), r1);
        addDoor(map, r1.x + r1.w, r1.y + Math.floor(r1.h / 2) + 1, r1);

        // Decorations: skulls on walls, torches
        addCryptDecorations(r0, r1, r2);

        playerSpawn = { x: (r0.x + 3) * TILE, y: (r0.y + Math.floor(r0.h / 2)) * TILE };
    }

    function generateLevel1(map) {
        // The Inferno: wider arenas with pillars
        rooms = [];
        decorations = [];

        // Room 0 (left-center)
        const r0 = { x: 1, y: 3, w: 8, h: 14, doors: [], cleared: false, waveSpawned: false, isBoss: false };
        carveRect(map, r0.x, r0.y, r0.w, r0.h);
        rooms.push(r0);

        // Room 1 (center)
        const r1 = { x: 11, y: 2, w: 9, h: 16, doors: [], cleared: false, waveSpawned: false, isBoss: false };
        carveRect(map, r1.x, r1.y, r1.w, r1.h);
        rooms.push(r1);

        // Room 2: Boss (right)
        const r2 = { x: 22, y: 3, w: 7, h: 14, doors: [], cleared: false, waveSpawned: false, isBoss: true };
        carveRect(map, r2.x, r2.y, r2.w, r2.h);
        rooms.push(r2);

        // Corridors
        carveCorridor(map, r0.x + r0.w - 1, r0.y + Math.floor(r0.h / 2), r1.x, r1.y + Math.floor(r1.h / 2));
        carveCorridor(map, r1.x + r1.w - 1, r1.y + Math.floor(r1.h / 2), r2.x, r2.y + Math.floor(r2.h / 2));

        // Doors
        addDoor(map, r0.x + r0.w, r0.y + Math.floor(r0.h / 2), r0);
        addDoor(map, r0.x + r0.w, r0.y + Math.floor(r0.h / 2) + 1, r0);
        addDoor(map, r1.x + r1.w, r1.y + Math.floor(r1.h / 2), r1);
        addDoor(map, r1.x + r1.w, r1.y + Math.floor(r1.h / 2) + 1, r1);

        // Pillars in room 1
        const pillars = [
            { x: r1.x + 2, y: r1.y + 3 },
            { x: r1.x + r1.w - 3, y: r1.y + 3 },
            { x: r1.x + 2, y: r1.y + r1.h - 4 },
            { x: r1.x + r1.w - 3, y: r1.y + r1.h - 4 },
        ];
        for (const p of pillars) {
            map[p.y][p.x] = 1;
            map[p.y + 1][p.x] = 1;
        }

        addInfernoDecorations(r0, r1, r2);

        playerSpawn = { x: (r0.x + 3) * TILE, y: (r0.y + Math.floor(r0.h / 2)) * TILE };
    }

    function generateLevel2(map) {
        // The Void Nexus: large open arenas with scattered obstacles
        rooms = [];
        decorations = [];

        // Room 0
        const r0 = { x: 1, y: 3, w: 8, h: 14, doors: [], cleared: false, waveSpawned: false, isBoss: false };
        carveRect(map, r0.x, r0.y, r0.w, r0.h);
        rooms.push(r0);

        // Room 1 (large)
        const r1 = { x: 11, y: 1, w: 9, h: 18, doors: [], cleared: false, waveSpawned: false, isBoss: false };
        carveRect(map, r1.x, r1.y, r1.w, r1.h);
        rooms.push(r1);

        // Room 2: Boss
        const r2 = { x: 22, y: 2, w: 7, h: 16, doors: [], cleared: false, waveSpawned: false, isBoss: true };
        carveRect(map, r2.x, r2.y, r2.w, r2.h);
        rooms.push(r2);

        // Corridors
        carveCorridor(map, r0.x + r0.w - 1, r0.y + Math.floor(r0.h / 2), r1.x, r1.y + Math.floor(r1.h / 2));
        carveCorridor(map, r1.x + r1.w - 1, r1.y + Math.floor(r1.h / 2), r2.x, r2.y + Math.floor(r2.h / 2));

        // Doors
        addDoor(map, r0.x + r0.w, r0.y + Math.floor(r0.h / 2), r0);
        addDoor(map, r0.x + r0.w, r0.y + Math.floor(r0.h / 2) + 1, r0);
        addDoor(map, r1.x + r1.w, r1.y + Math.floor(r1.h / 2), r1);
        addDoor(map, r1.x + r1.w, r1.y + Math.floor(r1.h / 2) + 1, r1);

        // Scattered obstacles in rooms
        const obstacles = [
            { x: r1.x + 3, y: r1.y + 4 },
            { x: r1.x + 6, y: r1.y + 7 },
            { x: r1.x + 3, y: r1.y + 12 },
            { x: r1.x + 6, y: r1.y + 14 },
            { x: r2.x + 2, y: r2.y + 4 },
            { x: r2.x + 4, y: r2.y + 10 },
        ];
        for (const o of obstacles) {
            if (o.y > 0 && o.y < H - 1 && o.x > 0 && o.x < W - 1) {
                map[o.y][o.x] = 1;
            }
        }

        addVoidDecorations(r0, r1, r2);

        playerSpawn = { x: (r0.x + 3) * TILE, y: (r0.y + Math.floor(r0.h / 2)) * TILE };
    }

    // ========== Decorations ==========

    function addCryptDecorations(r0, r1, r2) {
        // Skulls on walls near room edges
        for (const room of [r0, r1, r2]) {
            // Top wall skulls
            for (let x = room.x + 1; x < room.x + room.w - 1; x += 3) {
                decorations.push({ type: 'skull', x: x, y: room.y });
            }
            // Torches at corners
            decorations.push({ type: 'torch', x: room.x + 1, y: room.y + 1 });
            decorations.push({ type: 'torch', x: room.x + room.w - 2, y: room.y + 1 });
            decorations.push({ type: 'torch', x: room.x + 1, y: room.y + room.h - 2 });
            decorations.push({ type: 'torch', x: room.x + room.w - 2, y: room.y + room.h - 2 });
        }
    }

    function addInfernoDecorations(r0, r1, r2) {
        // Lava cracks in floors
        for (const room of [r0, r1, r2]) {
            const numCracks = 3 + Math.floor(Math.random() * 3);
            for (let i = 0; i < numCracks; i++) {
                const cx = room.x + 1 + Math.floor(Math.random() * (room.w - 2));
                const cy = room.y + 1 + Math.floor(Math.random() * (room.h - 2));
                decorations.push({
                    type: 'lava_crack',
                    x: cx,
                    y: cy,
                    dx: (Math.random() - 0.5) * 2,
                    dy: (Math.random() - 0.5) * 2,
                    len: 1 + Math.random() * 2,
                });
            }
            // Ember sources
            decorations.push({ type: 'ember_source', x: room.x + Math.floor(room.w / 2), y: room.y + Math.floor(room.h / 2) });
        }
    }

    function addVoidDecorations(r0, r1, r2) {
        // Void fissures: pulsing purple cracks
        for (const room of [r0, r1, r2]) {
            const numFissures = 2 + Math.floor(Math.random() * 3);
            for (let i = 0; i < numFissures; i++) {
                const cx = room.x + 1 + Math.floor(Math.random() * (room.w - 2));
                const cy = room.y + 1 + Math.floor(Math.random() * (room.h - 2));
                decorations.push({
                    type: 'void_fissure',
                    x: cx,
                    y: cy,
                    angle: Math.random() * Math.PI,
                    len: 0.5 + Math.random() * 1.5,
                });
            }
        }
    }

    // ========== Room helpers ==========

    function getRoomAt(px, py) {
        // pixel coords → room index
        const tx = Math.floor(px / TILE);
        const ty = Math.floor(py / TILE);
        for (let i = 0; i < rooms.length; i++) {
            const r = rooms[i];
            if (tx >= r.x && tx < r.x + r.w && ty >= r.y && ty < r.y + r.h) {
                return i;
            }
        }
        return -1;
    }

    function lockDoors(roomIdx) {
        const r = rooms[roomIdx];
        for (const d of r.doors) {
            tilemap[d.ty][d.tx] = 2; // locked
        }
    }

    function unlockDoors(roomIdx) {
        const r = rooms[roomIdx];
        for (const d of r.doors) {
            tilemap[d.ty][d.tx] = 3; // open
        }
    }

    function spawnWaveForRoom(roomIdx) {
        const waves = LEVEL_WAVES[currentLevel];
        if (!waves || !waves[roomIdx]) return;

        const wave = waves[roomIdx];
        const r = rooms[roomIdx];

        for (const entry of wave) {
            if (entry.type === 'boss') {
                // Boss spawn
                const bx = (r.x + Math.floor(r.w / 2)) * TILE;
                const by = (r.y + Math.floor(r.h / 2)) * TILE;
                if (Game.Enemies && Game.Enemies.spawn) {
                    Game.Enemies.spawn(entry.boss, bx, by);
                }
                if (Game.Events) Game.Events.emit('boss-spawn', { boss: entry.boss, level: currentLevel });
                bossSpawned = true;
            } else {
                for (let i = 0; i < entry.count; i++) {
                    // Random position within room
                    const ex = (r.x + 2 + Math.floor(Math.random() * (r.w - 4))) * TILE;
                    const ey = (r.y + 2 + Math.floor(Math.random() * (r.h - 4))) * TILE;
                    if (Game.Enemies && Game.Enemies.spawn) {
                        Game.Enemies.spawn(entry.type, ex, ey);
                    }
                }
            }
        }
    }

    function getEnemyCount() {
        if (Game.Enemies && Game.Enemies.getAll) {
            const all = Game.Enemies.getAll();
            return all.filter(function (e) { return e.alive !== false; }).length;
        }
        return 0;
    }

    // ========== Rendering ==========

    function drawTilemap(ctx) {
        const theme = CONST.LEVEL_THEMES[currentLevel] || CONST.LEVEL_THEMES[0];

        for (let y = 0; y < H; y++) {
            for (let x = 0; x < W; x++) {
                const tile = tilemap[y][x];
                const px = x * TILE;
                const py = y * TILE;

                if (tile === 1) {
                    // Wall
                    ctx.fillStyle = theme.wall;
                    ctx.fillRect(px, py, TILE, TILE);
                    // Border highlight (lighter top/left)
                    ctx.fillStyle = theme.wallLight;
                    ctx.fillRect(px, py, TILE, 2);
                    ctx.fillRect(px, py, 2, TILE);
                    // Darker bottom/right edge
                    ctx.fillStyle = 'rgba(0,0,0,0.3)';
                    ctx.fillRect(px + TILE - 2, py, 2, TILE);
                    ctx.fillRect(px, py + TILE - 2, TILE, 2);
                } else if (tile === 0) {
                    // Floor
                    ctx.fillStyle = theme.floor;
                    ctx.fillRect(px, py, TILE, TILE);
                    // Subtle grid lines
                    ctx.strokeStyle = theme.accent;
                    ctx.globalAlpha = 0.08;
                    ctx.strokeRect(px + 0.5, py + 0.5, TILE - 1, TILE - 1);
                    ctx.globalAlpha = 1;
                } else if (tile === 2) {
                    // Locked door
                    ctx.fillStyle = theme.floor;
                    ctx.fillRect(px, py, TILE, TILE);
                    const pulse = 0.5 + 0.3 * Math.sin(frameCount * 0.1);
                    ctx.globalAlpha = pulse;
                    ctx.fillStyle = CONST.COLORS.DOOR_LOCKED;
                    ctx.fillRect(px + 4, py + 4, TILE - 8, TILE - 8);
                    // X pattern
                    ctx.strokeStyle = '#ff0000';
                    ctx.lineWidth = 2;
                    ctx.beginPath();
                    ctx.moveTo(px + 6, py + 6);
                    ctx.lineTo(px + TILE - 6, py + TILE - 6);
                    ctx.moveTo(px + TILE - 6, py + 6);
                    ctx.lineTo(px + 6, py + TILE - 6);
                    ctx.stroke();
                    ctx.lineWidth = 1;
                    ctx.globalAlpha = 1;
                } else if (tile === 3) {
                    // Open door
                    ctx.fillStyle = theme.floor;
                    ctx.fillRect(px, py, TILE, TILE);
                    const pulse = 0.4 + 0.3 * Math.sin(frameCount * 0.08);
                    ctx.globalAlpha = pulse;
                    ctx.fillStyle = CONST.COLORS.DOOR;
                    ctx.fillRect(px + 2, py + 2, TILE - 4, TILE - 4);
                    // Arrow hint
                    ctx.strokeStyle = '#ffffff';
                    ctx.lineWidth = 2;
                    ctx.beginPath();
                    ctx.moveTo(px + 8, py + TILE / 2);
                    ctx.lineTo(px + TILE - 8, py + TILE / 2);
                    ctx.lineTo(px + TILE - 12, py + TILE / 2 - 4);
                    ctx.moveTo(px + TILE - 8, py + TILE / 2);
                    ctx.lineTo(px + TILE - 12, py + TILE / 2 + 4);
                    ctx.stroke();
                    ctx.lineWidth = 1;
                    ctx.globalAlpha = 1;
                }
            }
        }
    }

    function drawDecorations(ctx) {
        const theme = CONST.LEVEL_THEMES[currentLevel] || CONST.LEVEL_THEMES[0];

        for (let i = 0; i < decorations.length; i++) {
            const d = decorations[i];
            const px = d.x * TILE;
            const py = d.y * TILE;

            if (d.type === 'skull') {
                // Simple skull: circle + two small eye circles on wall tile
                ctx.globalAlpha = 0.25;
                ctx.fillStyle = '#aaaaaa';
                ctx.beginPath();
                ctx.arc(px + TILE / 2, py + TILE / 2, 6, 0, Math.PI * 2);
                ctx.fill();
                // Eyes
                ctx.fillStyle = '#330000';
                ctx.beginPath();
                ctx.arc(px + TILE / 2 - 3, py + TILE / 2 - 1, 1.5, 0, Math.PI * 2);
                ctx.fill();
                ctx.beginPath();
                ctx.arc(px + TILE / 2 + 3, py + TILE / 2 - 1, 1.5, 0, Math.PI * 2);
                ctx.fill();
                ctx.globalAlpha = 1;
            } else if (d.type === 'torch') {
                // Flickering orange glow
                const flicker = 0.5 + 0.3 * Math.sin(frameCount * 0.15 + d.x * 7 + d.y * 3);
                const radius = 10 + Math.sin(frameCount * 0.2 + d.x) * 3;
                ctx.globalAlpha = flicker * 0.3;
                const grad = ctx.createRadialGradient(
                    px + TILE / 2, py + TILE / 2, 2,
                    px + TILE / 2, py + TILE / 2, radius
                );
                grad.addColorStop(0, '#ff8800');
                grad.addColorStop(1, 'rgba(255,100,0,0)');
                ctx.fillStyle = grad;
                ctx.fillRect(px - 8, py - 8, TILE + 16, TILE + 16);
                // Torch base
                ctx.globalAlpha = 0.6;
                ctx.fillStyle = '#ff6600';
                ctx.beginPath();
                ctx.arc(px + TILE / 2, py + TILE / 2 - 2, 3, 0, Math.PI * 2);
                ctx.fill();
                ctx.globalAlpha = 1;
            } else if (d.type === 'lava_crack') {
                // Glowing orange line on floor
                const glow = 0.4 + 0.3 * Math.sin(frameCount * 0.05 + d.x + d.y);
                ctx.globalAlpha = glow;
                ctx.strokeStyle = '#ff4400';
                ctx.lineWidth = 2;
                ctx.shadowColor = '#ff6600';
                ctx.shadowBlur = 8;
                ctx.beginPath();
                ctx.moveTo(px + TILE / 2, py + TILE / 2);
                ctx.lineTo(px + TILE / 2 + d.dx * TILE * d.len, py + TILE / 2 + d.dy * TILE * d.len);
                ctx.stroke();
                ctx.shadowBlur = 0;
                ctx.lineWidth = 1;
                ctx.globalAlpha = 1;
            } else if (d.type === 'ember_source') {
                // Faint upward glow
                const glow = 0.15 + 0.1 * Math.sin(frameCount * 0.03);
                ctx.globalAlpha = glow;
                const grad = ctx.createRadialGradient(
                    px + TILE / 2, py + TILE / 2, 0,
                    px + TILE / 2, py + TILE / 2, TILE * 3
                );
                grad.addColorStop(0, '#ff4400');
                grad.addColorStop(1, 'rgba(255,68,0,0)');
                ctx.fillStyle = grad;
                ctx.beginPath();
                ctx.arc(px + TILE / 2, py + TILE / 2, TILE * 3, 0, Math.PI * 2);
                ctx.fill();
                ctx.globalAlpha = 1;
            } else if (d.type === 'void_fissure') {
                // Pulsing purple crack
                const pulse = 0.3 + 0.4 * Math.sin(frameCount * 0.06 + d.angle * 5);
                ctx.globalAlpha = pulse;
                ctx.strokeStyle = '#9933ff';
                ctx.lineWidth = 2.5;
                ctx.shadowColor = '#7700ff';
                ctx.shadowBlur = 12;
                ctx.beginPath();
                const len = d.len * TILE;
                ctx.moveTo(px + TILE / 2 - Math.cos(d.angle) * len / 2,
                           py + TILE / 2 - Math.sin(d.angle) * len / 2);
                ctx.lineTo(px + TILE / 2 + Math.cos(d.angle) * len / 2,
                           py + TILE / 2 + Math.sin(d.angle) * len / 2);
                ctx.stroke();
                // Branch
                ctx.lineWidth = 1.5;
                ctx.beginPath();
                const mid = 0.3 + Math.random() * 0.4;
                const bx = px + TILE / 2 + Math.cos(d.angle) * len * (mid - 0.5);
                const by = py + TILE / 2 + Math.sin(d.angle) * len * (mid - 0.5);
                ctx.moveTo(bx, by);
                ctx.lineTo(bx + Math.cos(d.angle + 1) * 10, by + Math.sin(d.angle + 1) * 10);
                ctx.stroke();
                ctx.shadowBlur = 0;
                ctx.lineWidth = 1;
                ctx.globalAlpha = 1;
            }
        }
    }

    // ========== Public API ==========

    Game.Levels = {
        init: function () {
            tilemap = createEmptyMap(1);
            rooms = [];
            decorations = [];
            currentRoom = 0;
            roomActive = false;
            bossSpawned = false;
            levelComplete = false;
            frameCount = 0;
            playerSpawn = { x: 3 * TILE, y: 10 * TILE };
        },

        loadLevel: function (levelIndex) {
            currentLevel = Math.max(0, Math.min(2, levelIndex));
            tilemap = createEmptyMap(1);
            rooms = [];
            decorations = [];
            currentRoom = 0;
            roomActive = false;
            bossSpawned = false;
            levelComplete = false;
            frameCount = 0;

            if (currentLevel === 0) generateLevel0(tilemap);
            else if (currentLevel === 1) generateLevel1(tilemap);
            else generateLevel2(tilemap);

            // Add ambient particles for the full level
            if (Game.Effects && Game.Effects.addAmbient) {
                Game.Effects.addAmbient({ x: 0, y: 0, w: W * TILE, h: H * TILE });
            }
        },

        update: function () {
            frameCount++;

            if (levelComplete) return;

            // Determine which room the player is in (use spawn as fallback)
            let px = playerSpawn.x, py = playerSpawn.y;
            if (Game.Player && Game.Player.getPosition) {
                const pos = Game.Player.getPosition();
                px = pos.x;
                py = pos.y;
            }

            const roomIdx = getRoomAt(px, py);
            if (roomIdx >= 0 && roomIdx !== currentRoom) {
                currentRoom = roomIdx;
            }

            const room = rooms[currentRoom];
            if (!room) return;

            // Room not yet engaged: lock doors and spawn wave
            if (!room.waveSpawned && !room.cleared) {
                room.waveSpawned = true;
                roomActive = true;

                // Lock doors of this room
                lockDoors(currentRoom);

                // Also lock doors of previous rooms pointing here
                for (let i = 0; i < rooms.length; i++) {
                    if (i !== currentRoom) lockDoors(i);
                }

                spawnWaveForRoom(currentRoom);
            }

            // Check if all enemies are dead
            if (roomActive && room.waveSpawned && !room.cleared) {
                const enemies = getEnemyCount();
                if (enemies === 0) {
                    room.cleared = true;
                    roomActive = false;

                    // Unlock all doors
                    for (let i = 0; i <= currentRoom; i++) {
                        unlockDoors(i);
                    }

                    if (room.isBoss) {
                        levelComplete = true;
                        if (Game.Events) Game.Events.emit('level-complete', { level: currentLevel });
                    } else {
                        if (Game.Events) Game.Events.emit('room-cleared', { room: currentRoom, level: currentLevel });
                    }
                }
            }
        },

        draw: function (ctx) {
            drawTilemap(ctx);
            drawDecorations(ctx);
        },

        getCurrentTilemap: function () {
            return tilemap;
        },

        getPlayerSpawn: function () {
            return { x: playerSpawn.x, y: playerSpawn.y };
        },

        isWall: function (tileX, tileY) {
            if (tileX < 0 || tileX >= W || tileY < 0 || tileY >= H) return true;
            const tile = tilemap[tileY][tileX];
            return tile === 1 || tile === 2; // walls and locked doors are solid
        },

        // Expose for debugging / other modules
        getCurrentRoom: function () { return currentRoom; },
        getRooms: function () { return rooms; },
        isLevelComplete: function () { return levelComplete; },
    };
})();
