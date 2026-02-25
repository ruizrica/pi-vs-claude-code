/**
 * GAME ENGINE — Core loop, input, camera, collision, particles
 * =============================================================
 * Provides: window.Game.Engine
 * Depends on: contracts.js (Game.CONST, Game.Events, Game.state, Game.Utils)
 */
(function () {
    'use strict';

    const C = () => Game.CONST;
    const U = () => Game.Utils;

    // ── INPUT STATE ────────────────────────────────────────────
    const keys = { w: false, a: false, s: false, d: false, space: false, escape: false };
    const mouse = { x: 0, y: 0, down: false };

    // Key code mapping
    const KEY_MAP = {
        'KeyW': 'w', 'ArrowUp': 'w',
        'KeyA': 'a', 'ArrowLeft': 'a',
        'KeyS': 's', 'ArrowDown': 's',
        'KeyD': 'd', 'ArrowRight': 'd',
        'Space': 'space',
        'Escape': 'escape',
    };

    // ── CAMERA ─────────────────────────────────────────────────
    const camera = { x: 0, y: 0, targetX: 0, targetY: 0 };
    const CAMERA_LERP = 0.08;

    // ── PARTICLES ──────────────────────────────────────────────
    const particles = [];

    // ── ENGINE ──────────────────────────────────────────────────
    const Engine = {
        canvas: null,
        ctx: null,
        keys,
        mouse,
        camera,
        particles,
        lastTime: 0,
        dt: 0,
        running: false,
        _animFrameId: null,

        // ────────────────────────────────────────────────────────
        // INIT
        // ────────────────────────────────────────────────────────
        init(canvas) {
            this.canvas = canvas;
            this.ctx = canvas.getContext('2d');
            canvas.width = C().CANVAS_W;
            canvas.height = C().CANVAS_H;

            this._bindInput();
            this.running = true;
            this.lastTime = performance.now();

            // Don't start the loop automatically during tests if already running
            if (!this._animFrameId) {
                this._animFrameId = requestAnimationFrame((t) => this.gameLoop(t));
            }

            console.log('[Engine] Initialized');
        },

        // ────────────────────────────────────────────────────────
        // INPUT BINDING
        // ────────────────────────────────────────────────────────
        _bindInput() {
            const canvas = this.canvas;

            window.addEventListener('keydown', (e) => {
                const mapped = KEY_MAP[e.code];
                if (mapped !== undefined) {
                    keys[mapped] = true;
                    e.preventDefault();
                }
            });

            window.addEventListener('keyup', (e) => {
                const mapped = KEY_MAP[e.code];
                if (mapped !== undefined) {
                    keys[mapped] = false;
                    e.preventDefault();
                }

                // Pause toggle on escape release
                if (e.code === 'Escape') {
                    this._handleEscape();
                }

                // Enter key — start/restart game
                if (e.code === 'Enter' || e.code === 'NumpadEnter') {
                    if (Game.state.screen === 'menu' || 
                        Game.state.screen === 'gameover' || 
                        Game.state.screen === 'victory') {
                        this._startGame();
                    }
                }
            });

            canvas.addEventListener('mousemove', (e) => {
                const rect = canvas.getBoundingClientRect();
                mouse.x = e.clientX - rect.left;
                mouse.y = e.clientY - rect.top;
            });

            canvas.addEventListener('mousedown', (e) => {
                if (e.button === 0) {
                    mouse.down = true;

                    // Menu click — start game
                    if (Game.state.screen === 'menu') {
                        this._startGame();
                    }
                    // Game over / victory — restart
                    if (Game.state.screen === 'gameover' || Game.state.screen === 'victory') {
                        this._startGame();
                    }
                }
            });

            canvas.addEventListener('mouseup', (e) => {
                if (e.button === 0) mouse.down = false;
            });

            // Prevent context menu on right-click inside canvas
            canvas.addEventListener('contextmenu', (e) => e.preventDefault());
        },

        // ────────────────────────────────────────────────────────
        // STATE MACHINE
        // ────────────────────────────────────────────────────────
        _handleEscape() {
            const s = Game.state;
            if (s.screen === 'playing') {
                s.screen = 'paused';
                Game.Events.emit('paused');
            } else if (s.screen === 'paused') {
                s.screen = 'playing';
                this.lastTime = performance.now();
                Game.Events.emit('resumed');
            }
        },

        _startGame() {
            // Delegate to Main if available, otherwise do basic init
            if (Game.Main && Game.Main.startGame) {
                Game.Main.startGame();
            } else {
                Game.state.screen = 'playing';
                Game.state.level = 0;
                Game.state.score = 0;
                Game.state.kills = 0;
                Game.state.time = 0;
                Game.state.bossActive = false;
                Game.state.bossDefeated = false;
                if (Game.Player && Game.Player.init) Game.Player.init();
                if (Game.Enemies && Game.Enemies.init) Game.Enemies.init();
                if (Game.Levels && Game.Levels.init) Game.Levels.init();
            }
            Game.state.shakeTimer = 0;
            Game.state.shakeIntensity = 0;
            particles.length = 0;
            this.lastTime = performance.now();
            Game.Events.emit('game-start');
        },

        // ────────────────────────────────────────────────────────
        // GAME LOOP
        // ────────────────────────────────────────────────────────
        gameLoop(timestamp) {
            this._animFrameId = requestAnimationFrame((t) => this.gameLoop(t));

            // Delta time in frames (1.0 = 1/60th second)
            const now = timestamp || performance.now();
            const rawDt = (now - this.lastTime) / (1000 / C().FPS);
            this.dt = Math.min(rawDt, 3); // cap to avoid spiral of death
            this.lastTime = now;

            if (Game.state.screen === 'playing') {
                this.update(this.dt);
            }
            this.draw();
        },

        // ────────────────────────────────────────────────────────
        // UPDATE
        // ────────────────────────────────────────────────────────
        update(dt) {
            dt = dt || this.dt;

            // Update game time
            Game.state.time += dt / C().FPS;

            // Screen shake decay
            if (Game.state.shakeTimer > 0) {
                Game.state.shakeTimer -= dt;
                if (Game.state.shakeTimer <= 0) {
                    Game.state.shakeTimer = 0;
                    Game.state.shakeIntensity = 0;
                }
            }

            // Update subsystems (guard against missing modules)
            if (Game.Player && Game.Player.update) Game.Player.update(dt);
            if (Game.Enemies && Game.Enemies.update) Game.Enemies.update(dt);
            if (Game.Bosses && Game.Bosses.update) Game.Bosses.update(dt);
            if (Game.Effects && Game.Effects.update) Game.Effects.update();
            if (Game.Levels && Game.Levels.update) Game.Levels.update(dt);

            // ── COLLISION: Player projectiles vs Enemies & Boss ──
            this._checkProjectileCollisions();

            // Update particles
            this._updateParticles(dt);

            // Update camera
            this._updateCamera(dt);

            // Emit update event for any listeners
            Game.Events.emit('update', dt);
        },

        // ────────────────────────────────────────────────────────
        // DRAW
        // ────────────────────────────────────────────────────────
        draw() {
            const ctx = this.ctx;
            const W = C().CANVAS_W;
            const H = C().CANVAS_H;

            // Clear
            ctx.fillStyle = C().COLORS.BG;
            ctx.fillRect(0, 0, W, H);

            if (Game.state.screen === 'menu') {
                this._drawMenu(ctx);
                return;
            }

            if (Game.state.screen === 'gameover') {
                this._drawGameOver(ctx);
                return;
            }

            if (Game.state.screen === 'victory') {
                this._drawVictory(ctx);
                return;
            }

            // ── Playing / Paused ─────────────────
            ctx.save();

            // Apply screen shake
            let shakeX = 0, shakeY = 0;
            if (Game.state.shakeTimer > 0) {
                const intensity = Game.state.shakeIntensity;
                shakeX = (Math.random() - 0.5) * intensity * 2;
                shakeY = (Math.random() - 0.5) * intensity * 2;
            }

            // Apply camera transform
            ctx.translate(
                -Math.round(camera.x) + shakeX,
                -Math.round(camera.y) + shakeY
            );

            // Draw level
            if (Game.Levels && Game.Levels.draw) Game.Levels.draw(ctx);

            // Draw particles (behind entities)
            this._drawParticles(ctx);

            // Draw player projectiles
            if (Game.Player && Game.Player.drawProjectiles) Game.Player.drawProjectiles(ctx);

            // Draw enemies
            if (Game.Enemies && Game.Enemies.draw) Game.Enemies.draw(ctx);

            // Draw bosses
            if (Game.Bosses && Game.Bosses.draw) Game.Bosses.draw(ctx);

            // Draw effects (above game, below UI)
            if (Game.Effects && Game.Effects.draw) Game.Effects.draw(ctx);

            // Draw player
            if (Game.Player && Game.Player.draw) Game.Player.draw(ctx);

            ctx.restore();

            // Draw HUD on top (screen-space)
            if (Game.UI && Game.UI.draw) Game.UI.draw(ctx);

            // Emit draw event
            Game.Events.emit('draw', ctx);

            // Paused overlay
            if (Game.state.screen === 'paused') {
                this._drawPausedOverlay(ctx);
            }
        },

        // ────────────────────────────────────────────────────────
        // PROJECTILE ↔ ENTITY COLLISION
        // ────────────────────────────────────────────────────────
        _checkProjectileCollisions() {
            if (!Game.Player || !Game.Player.projectiles) return;

            const projs = Game.Player.projectiles;

            for (let i = projs.length - 1; i >= 0; i--) {
                const p = projs[i];
                let hit = false;

                // Check vs enemies
                if (Game.Enemies && Game.Enemies.getAll) {
                    const enemies = Game.Enemies.getAll();
                    for (const e of enemies) {
                        if (!e.alive) continue;
                        const dist = U().dist(p, e);
                        if (dist < p.size + e.size * 0.6) {
                            e.hp -= p.damage;
                            e.flashTimer = 6;
                            hit = true;

                            // Hit particles
                            for (let j = 0; j < 3; j++) {
                                this.addParticle({
                                    x: p.x, y: p.y,
                                    vx: (Math.random() - 0.5) * 4,
                                    vy: (Math.random() - 0.5) * 4,
                                    life: 8 + Math.random() * 8,
                                    color: e.color || '#ff3366',
                                    size: 2 + Math.random() * 2,
                                });
                            }

                            // Floating damage text
                            if (Game.Effects && Game.Effects.spawnText) {
                                Game.Effects.spawnText(p.x, p.y - 10, `-${p.damage}`, '#ff4444');
                            }
                            break;
                        }
                    }
                }

                // Check vs boss
                if (!hit && Game.Bosses && Game.Bosses.isAlive && Game.Bosses.isAlive()) {
                    const boss = Game.Bosses.getActive();
                    if (boss) {
                        const dist = U().dist(p, boss);
                        if (dist < p.size + boss.size) {
                            Game.Bosses.takeDamage(p.damage);
                            hit = true;

                            // Floating damage text
                            if (Game.Effects && Game.Effects.spawnText) {
                                Game.Effects.spawnText(p.x, p.y - 10, `-${p.damage}`, '#ffcc00');
                            }
                        }
                    }
                }

                if (hit) {
                    projs.splice(i, 1);
                }
            }
        },

        // ────────────────────────────────────────────────────────
        // CAMERA
        // ────────────────────────────────────────────────────────
        _updateCamera(dt) {
            if (!Game.Player || Game.Player.x === undefined) return;

            const W = C().CANVAS_W;
            const H = C().CANVAS_H;
            const TS = C().TILE_SIZE;

            // Target: center on player
            camera.targetX = Game.Player.x - W / 2;
            camera.targetY = Game.Player.y - H / 2;

            // Clamp to room bounds
            let roomPixelW = C().ROOM_W * TS;
            let roomPixelH = C().ROOM_H * TS;

            // Get actual room dimensions from level if available
            if (Game.Levels && Game.Levels.getCurrentTilemap) {
                const tilemap = Game.Levels.getCurrentTilemap();
                if (tilemap && tilemap.length > 0) {
                    roomPixelH = tilemap.length * TS;
                    roomPixelW = tilemap[0].length * TS;
                }
            }

            camera.targetX = U().clamp(camera.targetX, 0, Math.max(0, roomPixelW - W));
            camera.targetY = U().clamp(camera.targetY, 0, Math.max(0, roomPixelH - H));

            // Smooth lerp
            camera.x = U().lerp(camera.x, camera.targetX, CAMERA_LERP * dt);
            camera.y = U().lerp(camera.y, camera.targetY, CAMERA_LERP * dt);
        },

        // ────────────────────────────────────────────────────────
        // COLLISION
        // ────────────────────────────────────────────────────────
        checkWallCollision(x, y, size, tilemap) {
            if (!tilemap || tilemap.length === 0) {
                return { blocked: false, nx: x, ny: y };
            }

            const TS = C().TILE_SIZE;
            const half = size / 2;
            let blocked = false;
            let nx = x;
            let ny = y;

            // Check corners of the bounding box
            const corners = [
                { cx: x - half, cy: y - half }, // top-left
                { cx: x + half, cy: y - half }, // top-right
                { cx: x - half, cy: y + half }, // bottom-left
                { cx: x + half, cy: y + half }, // bottom-right
            ];

            for (const corner of corners) {
                const tileX = Math.floor(corner.cx / TS);
                const tileY = Math.floor(corner.cy / TS);

                // Out of bounds = wall
                if (tileY < 0 || tileY >= tilemap.length ||
                    tileX < 0 || tileX >= tilemap[0].length) {
                    blocked = true;
                    continue;
                }

                if (tilemap[tileY][tileX] === 1) {
                    blocked = true;
                }
            }

            if (blocked) {
                // Resolve by trying to push back to nearest non-wall position
                // Try X-axis resolution
                nx = this._resolveAxis(x, y, size, tilemap, 'x');
                ny = this._resolveAxis(x, y, size, tilemap, 'y');

                // If resolved position still collides, use both corrections
                const stillBlocked = this._isBlocked(nx, ny, size, tilemap);
                if (stillBlocked) {
                    nx = this._resolveAxis(nx, ny, size, tilemap, 'x');
                    ny = this._resolveAxis(nx, ny, size, tilemap, 'y');
                }
            }

            return { blocked, nx, ny };
        },

        _isBlocked(x, y, size, tilemap) {
            const TS = C().TILE_SIZE;
            const half = size / 2;
            const corners = [
                { cx: x - half, cy: y - half },
                { cx: x + half, cy: y - half },
                { cx: x - half, cy: y + half },
                { cx: x + half, cy: y + half },
            ];
            for (const corner of corners) {
                const tileX = Math.floor(corner.cx / TS);
                const tileY = Math.floor(corner.cy / TS);
                if (tileY < 0 || tileY >= tilemap.length ||
                    tileX < 0 || tileX >= tilemap[0].length) return true;
                if (tilemap[tileY][tileX] === 1) return true;
            }
            return false;
        },

        _resolveAxis(x, y, size, tilemap, axis) {
            const TS = C().TILE_SIZE;
            const half = size / 2;

            if (axis === 'x') {
                // Check left side
                const leftTile = Math.floor((x - half) / TS);
                const topTile = Math.floor((y - half) / TS);
                const botTile = Math.floor((y + half) / TS);

                let leftBlocked = false;
                let rightBlocked = false;

                for (let ty = topTile; ty <= botTile; ty++) {
                    if (ty < 0 || ty >= tilemap.length) continue;
                    if (leftTile >= 0 && leftTile < tilemap[0].length && tilemap[ty][leftTile] === 1) {
                        leftBlocked = true;
                    }
                    const rightTile = Math.floor((x + half) / TS);
                    if (rightTile >= 0 && rightTile < tilemap[0].length && tilemap[ty][rightTile] === 1) {
                        rightBlocked = true;
                    }
                }

                if (leftBlocked) x = (leftTile + 1) * TS + half;
                else if (rightBlocked) {
                    const rightTile = Math.floor((x + half) / TS);
                    x = rightTile * TS - half;
                }
                return x;
            } else {
                // Check top side
                const topTile = Math.floor((y - half) / TS);
                const leftTile = Math.floor((x - half) / TS);
                const rightTile = Math.floor((x + half) / TS);

                let topBlocked = false;
                let botBlocked = false;

                for (let tx = leftTile; tx <= rightTile; tx++) {
                    if (tx < 0 || tx >= tilemap[0].length) continue;
                    if (topTile >= 0 && topTile < tilemap.length && tilemap[topTile][tx] === 1) {
                        topBlocked = true;
                    }
                    const botTile = Math.floor((y + half) / TS);
                    if (botTile >= 0 && botTile < tilemap.length && tilemap[botTile][tx] === 1) {
                        botBlocked = true;
                    }
                }

                if (topBlocked) y = (topTile + 1) * TS + half;
                else if (botBlocked) {
                    const botTile = Math.floor((y + half) / TS);
                    y = botTile * TS - half;
                }
                return y;
            }
        },

        // ────────────────────────────────────────────────────────
        // PARTICLES
        // ────────────────────────────────────────────────────────
        addParticle(p) {
            particles.push({
                x: p.x || 0,
                y: p.y || 0,
                vx: p.vx || 0,
                vy: p.vy || 0,
                life: p.life || 30,
                maxLife: p.life || 30,
                color: p.color || C().COLORS.PARTICLE,
                size: p.size || 3,
            });
        },

        _updateParticles(dt) {
            for (let i = particles.length - 1; i >= 0; i--) {
                const p = particles[i];
                p.x += p.vx * dt;
                p.y += p.vy * dt;
                p.life -= dt;
                p.size *= 0.98;

                if (p.life <= 0 || p.size < 0.3) {
                    particles.splice(i, 1);
                }
            }
        },

        _drawParticles(ctx) {
            for (const p of particles) {
                const alpha = Math.max(0, p.life / p.maxLife);
                ctx.globalAlpha = alpha;
                ctx.fillStyle = p.color;
                ctx.shadowColor = p.color;
                ctx.shadowBlur = p.size * 2;

                ctx.beginPath();
                ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
                ctx.fill();
            }
            ctx.globalAlpha = 1;
            ctx.shadowBlur = 0;
        },

        // ────────────────────────────────────────────────────────
        // SCREEN DRAWS
        // ────────────────────────────────────────────────────────
        _drawMenu(ctx) {
            const W = C().CANVAS_W;
            const H = C().CANVAS_H;

            // Ambient particles
            const time = performance.now() / 1000;

            // Title
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';

            // Glow effect
            ctx.shadowColor = C().COLORS.PLAYER;
            ctx.shadowBlur = 30;
            ctx.fillStyle = C().COLORS.PLAYER;
            ctx.font = 'bold 48px monospace';
            ctx.fillText('VOID CRAWLER', W / 2, H / 3);
            ctx.shadowBlur = 0;

            // Subtitle pulse
            const pulse = 0.5 + 0.5 * Math.sin(time * 3);
            ctx.globalAlpha = 0.4 + pulse * 0.6;
            ctx.fillStyle = C().COLORS.TEXT;
            ctx.font = '18px monospace';
            ctx.fillText('CLICK TO BEGIN', W / 2, H / 2 + 40);
            ctx.globalAlpha = 1;

            // Controls hint
            ctx.fillStyle = C().COLORS.TEXT_DIM;
            ctx.font = '14px monospace';
            ctx.fillText('WASD — Move   |   MOUSE — Aim & Shoot   |   SPACE — Dash   |   ESC — Pause', W / 2, H - 60);
        },

        _drawPausedOverlay(ctx) {
            const W = C().CANVAS_W;
            const H = C().CANVAS_H;

            ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
            ctx.fillRect(0, 0, W, H);

            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.shadowColor = C().COLORS.PLAYER;
            ctx.shadowBlur = 20;
            ctx.fillStyle = C().COLORS.PLAYER;
            ctx.font = 'bold 36px monospace';
            ctx.fillText('PAUSED', W / 2, H / 2 - 20);
            ctx.shadowBlur = 0;

            ctx.fillStyle = C().COLORS.TEXT_DIM;
            ctx.font = '16px monospace';
            ctx.fillText('Press ESC to resume', W / 2, H / 2 + 30);
        },

        _drawGameOver(ctx) {
            const W = C().CANVAS_W;
            const H = C().CANVAS_H;

            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';

            ctx.shadowColor = C().COLORS.ENEMY;
            ctx.shadowBlur = 30;
            ctx.fillStyle = C().COLORS.ENEMY;
            ctx.font = 'bold 48px monospace';
            ctx.fillText('GAME OVER', W / 2, H / 3);
            ctx.shadowBlur = 0;

            ctx.fillStyle = C().COLORS.TEXT;
            ctx.font = '20px monospace';
            ctx.fillText(`Score: ${Game.state.score}`, W / 2, H / 2);
            ctx.fillText(`Kills: ${Game.state.kills}`, W / 2, H / 2 + 30);

            const pulse = 0.5 + 0.5 * Math.sin(performance.now() / 1000 * 3);
            ctx.globalAlpha = 0.4 + pulse * 0.6;
            ctx.fillStyle = C().COLORS.TEXT_DIM;
            ctx.font = '16px monospace';
            ctx.fillText('CLICK TO RESTART', W / 2, H / 2 + 80);
            ctx.globalAlpha = 1;
        },

        _drawVictory(ctx) {
            const W = C().CANVAS_W;
            const H = C().CANVAS_H;

            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';

            ctx.shadowColor = C().COLORS.XP;
            ctx.shadowBlur = 30;
            ctx.fillStyle = C().COLORS.XP;
            ctx.font = 'bold 48px monospace';
            ctx.fillText('VICTORY!', W / 2, H / 3);
            ctx.shadowBlur = 0;

            ctx.fillStyle = C().COLORS.TEXT;
            ctx.font = '20px monospace';
            ctx.fillText(`Final Score: ${Game.state.score}`, W / 2, H / 2);
            ctx.fillText(`Total Kills: ${Game.state.kills}`, W / 2, H / 2 + 30);
            ctx.fillText(`Time: ${Math.floor(Game.state.time)}s`, W / 2, H / 2 + 60);

            const pulse = 0.5 + 0.5 * Math.sin(performance.now() / 1000 * 3);
            ctx.globalAlpha = 0.4 + pulse * 0.6;
            ctx.fillStyle = C().COLORS.TEXT_DIM;
            ctx.font = '16px monospace';
            ctx.fillText('CLICK TO PLAY AGAIN', W / 2, H / 2 + 110);
            ctx.globalAlpha = 1;
        },

        // ────────────────────────────────────────────────────────
        // UTILITY: world<->screen coords
        // ────────────────────────────────────────────────────────
        screenToWorld(sx, sy) {
            return {
                x: sx + camera.x,
                y: sy + camera.y,
            };
        },

        worldToScreen(wx, wy) {
            return {
                x: wx - camera.x,
                y: wy - camera.y,
            };
        },
    };

    // Register on global
    window.Game = window.Game || {};
    window.Game.Engine = Engine;

    console.log('[Engine] Module loaded');
})();
