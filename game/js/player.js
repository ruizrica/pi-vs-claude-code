/**
 * PLAYER SYSTEM — Movement, shooting, dash, rendering
 * ====================================================
 * Provides: window.Game.Player
 * Depends on: contracts.js, engine.js
 */
(function () {
    'use strict';

    const C = () => Game.CONST;
    const U = () => Game.Utils;
    const E = () => Game.Engine;

    const Player = {
        // ── Properties ─────────────────────────────────────────
        x: 0,
        y: 0,
        hp: 0,
        maxHp: 0,
        speed: 0,
        alive: true,
        invulnerable: false,
        invulnerableTimer: 0,
        score: 0,

        // Dash
        dashTimer: 0,
        dashCooldown: 0,
        dashDirX: 0,
        dashDirY: 0,

        // Shooting
        shootCooldown: 0,
        projectiles: [],

        // Visual
        flashTimer: 0,
        aimAngle: 0,

        // ────────────────────────────────────────────────────────
        // INIT
        // ────────────────────────────────────────────────────────
        init() {
            this.hp = C().PLAYER_MAX_HP;
            this.maxHp = C().PLAYER_MAX_HP;
            this.speed = C().PLAYER_SPEED;
            this.alive = true;
            this.invulnerable = false;
            this.invulnerableTimer = 0;
            this.score = 0;
            this.dashTimer = 0;
            this.dashCooldown = 0;
            this.dashDirX = 0;
            this.dashDirY = 0;
            this.shootCooldown = 0;
            this.projectiles = [];
            this.flashTimer = 0;
            this.aimAngle = 0;

            // Spawn position — center of room
            const TS = C().TILE_SIZE;
            this.x = Math.floor(C().ROOM_W / 2) * TS + TS / 2;
            this.y = Math.floor(C().ROOM_H / 2) * TS + TS / 2;

            // Override spawn if level provides a spawn point
            if (Game.Levels && Game.Levels.getSpawnPoint) {
                const sp = Game.Levels.getSpawnPoint();
                if (sp) { this.x = sp.x; this.y = sp.y; }
            }

            console.log('[Player] Initialized at', this.x, this.y);
        },

        // ────────────────────────────────────────────────────────
        // UPDATE
        // ────────────────────────────────────────────────────────
        update(dt) {
            if (!this.alive) return;
            dt = dt || 1;

            this._updateTimers(dt);
            this._handleMovement(dt);
            this._handleShooting(dt);
            this._handleDashInput();
            this._updateProjectiles(dt);
            this._updateAimAngle();
        },

        _updateTimers(dt) {
            // Invulnerability timer (~0.3s = 18 frames at 60fps)
            if (this.invulnerableTimer > 0) {
                this.invulnerableTimer -= dt;
                if (this.invulnerableTimer <= 0) {
                    this.invulnerableTimer = 0;
                    // Only clear invulnerability if not dashing
                    if (this.dashTimer <= 0) {
                        this.invulnerable = false;
                    }
                }
            }

            // Flash timer
            if (this.flashTimer > 0) {
                this.flashTimer -= dt;
            }

            // Dash timer
            if (this.dashTimer > 0) {
                this.dashTimer -= dt;
                if (this.dashTimer <= 0) {
                    this.dashTimer = 0;
                    // End invulnerability if damage i-frames also expired
                    if (this.invulnerableTimer <= 0) {
                        this.invulnerable = false;
                    }
                }
            }

            // Dash cooldown
            if (this.dashCooldown > 0) {
                this.dashCooldown -= dt;
                if (this.dashCooldown < 0) this.dashCooldown = 0;
            }

            // Shoot cooldown
            if (this.shootCooldown > 0) {
                this.shootCooldown -= dt;
                if (this.shootCooldown < 0) this.shootCooldown = 0;
            }
        },

        _handleMovement(dt) {
            const keys = E().keys;
            let dx = 0, dy = 0;

            if (keys.w) dy -= 1;
            if (keys.s) dy += 1;
            if (keys.a) dx -= 1;
            if (keys.d) dx += 1;

            // Normalize diagonal movement
            if (dx !== 0 && dy !== 0) {
                const inv = 1 / Math.SQRT2;
                dx *= inv;
                dy *= inv;
            }

            // Determine speed
            let spd = this.speed;
            if (this.dashTimer > 0) {
                spd = C().PLAYER_DASH_SPEED;
                dx = this.dashDirX;
                dy = this.dashDirY;

                // Dash trail particles
                if (Math.random() < 0.6) {
                    E().addParticle({
                        x: this.x + (Math.random() - 0.5) * 10,
                        y: this.y + (Math.random() - 0.5) * 10,
                        vx: -dx * 2 + (Math.random() - 0.5) * 2,
                        vy: -dy * 2 + (Math.random() - 0.5) * 2,
                        life: 15 + Math.random() * 10,
                        color: C().COLORS.DASH_TRAIL,
                        size: 4 + Math.random() * 4,
                    });
                }
            }

            if (dx === 0 && dy === 0) return;

            const newX = this.x + dx * spd * dt;
            const newY = this.y + dy * spd * dt;

            // Get tilemap for collision
            const tilemap = this._getTilemap();

            if (tilemap) {
                const pSize = C().PLAYER_SIZE;

                // Try full move
                const full = E().checkWallCollision(newX, newY, pSize, tilemap);
                if (!full.blocked) {
                    this.x = newX;
                    this.y = newY;
                } else {
                    // Try X only
                    const xOnly = E().checkWallCollision(newX, this.y, pSize, tilemap);
                    if (!xOnly.blocked) {
                        this.x = newX;
                    } else {
                        this.x = xOnly.nx;
                    }

                    // Try Y only
                    const yOnly = E().checkWallCollision(this.x, newY, pSize, tilemap);
                    if (!yOnly.blocked) {
                        this.y = newY;
                    } else {
                        this.y = yOnly.ny;
                    }
                }
            } else {
                // No tilemap — free movement
                this.x = newX;
                this.y = newY;
            }
        },

        _handleShooting(dt) {
            const mouse = E().mouse;

            // Auto-fire while mouse is held
            if (mouse.down && this.shootCooldown <= 0) {
                this.shoot();
            }
        },

        _handleDashInput() {
            if (E().keys.space && this.dashCooldown <= 0 && this.dashTimer <= 0) {
                this.dash();
            }
        },

        _updateAimAngle() {
            const mouse = E().mouse;
            // Convert mouse screen position to world position
            const world = E().screenToWorld(mouse.x, mouse.y);
            this.aimAngle = Math.atan2(world.y - this.y, world.x - this.x);
        },

        _getTilemap() {
            if (Game.Levels && Game.Levels.getCurrentTilemap) {
                return Game.Levels.getCurrentTilemap();
            }
            return null;
        },

        // ────────────────────────────────────────────────────────
        // SHOOT
        // ────────────────────────────────────────────────────────
        shoot() {
            if (this.shootCooldown > 0) return;

            const mouse = E().mouse;
            const world = E().screenToWorld(mouse.x, mouse.y);
            const angle = Math.atan2(world.y - this.y, world.x - this.x);

            const projSpeed = C().PROJECTILE_SPEED;
            this.projectiles.push({
                x: this.x,
                y: this.y,
                vx: Math.cos(angle) * projSpeed,
                vy: Math.sin(angle) * projSpeed,
                damage: C().PROJECTILE_DAMAGE,
                size: C().PROJECTILE_SIZE,
                life: 120, // frames until auto-despawn
                trail: [],
            });

            this.shootCooldown = C().PLAYER_SHOOT_COOLDOWN;

            // Muzzle flash particles
            for (let i = 0; i < 4; i++) {
                E().addParticle({
                    x: this.x + Math.cos(angle) * 12,
                    y: this.y + Math.sin(angle) * 12,
                    vx: Math.cos(angle) * (2 + Math.random() * 3) + (Math.random() - 0.5) * 2,
                    vy: Math.sin(angle) * (2 + Math.random() * 3) + (Math.random() - 0.5) * 2,
                    life: 8 + Math.random() * 6,
                    color: C().COLORS.PROJ_PLAYER,
                    size: 2 + Math.random() * 2,
                });
            }

            Game.Events.emit('player-shoot', { x: this.x, y: this.y, angle });
        },

        // ────────────────────────────────────────────────────────
        // DASH
        // ────────────────────────────────────────────────────────
        dash() {
            if (this.dashCooldown > 0 || this.dashTimer > 0) return;

            const keys = E().keys;
            let dx = 0, dy = 0;

            if (keys.w) dy -= 1;
            if (keys.s) dy += 1;
            if (keys.a) dx -= 1;
            if (keys.d) dx += 1;

            // If no direction, dash toward mouse
            if (dx === 0 && dy === 0) {
                dx = Math.cos(this.aimAngle);
                dy = Math.sin(this.aimAngle);
            } else {
                // Normalize
                const len = Math.hypot(dx, dy);
                if (len > 0) {
                    dx /= len;
                    dy /= len;
                }
            }

            this.dashDirX = dx;
            this.dashDirY = dy;
            this.dashTimer = C().PLAYER_DASH_DURATION;
            this.dashCooldown = C().PLAYER_DASH_COOLDOWN;
            this.invulnerable = true;

            // Burst particles
            for (let i = 0; i < 12; i++) {
                const a = (Math.PI * 2 / 12) * i;
                E().addParticle({
                    x: this.x,
                    y: this.y,
                    vx: Math.cos(a) * 3,
                    vy: Math.sin(a) * 3,
                    life: 15 + Math.random() * 10,
                    color: C().COLORS.PLAYER,
                    size: 3 + Math.random() * 3,
                });
            }

            Game.Events.emit('player-dash', { x: this.x, y: this.y });
        },

        // ────────────────────────────────────────────────────────
        // TAKE DAMAGE
        // ────────────────────────────────────────────────────────
        takeDamage(amount) {
            if (!this.alive || this.invulnerable) return;

            this.hp -= amount;
            this.invulnerable = true;
            this.invulnerableTimer = 18; // ~0.3s at 60fps
            this.flashTimer = 18;

            // Hit particles
            for (let i = 0; i < 8; i++) {
                const a = Math.random() * Math.PI * 2;
                E().addParticle({
                    x: this.x,
                    y: this.y,
                    vx: Math.cos(a) * (2 + Math.random() * 3),
                    vy: Math.sin(a) * (2 + Math.random() * 3),
                    life: 15 + Math.random() * 10,
                    color: C().COLORS.ENEMY,
                    size: 3 + Math.random() * 2,
                });
            }

            // Screen shake
            U().screenShake(6, 10);

            Game.Events.emit('player-hit', { hp: this.hp, damage: amount });

            if (this.hp <= 0) {
                this.hp = 0;
                this.alive = false;
                this._deathEffect();
                Game.Events.emit('player-death', { score: this.score });

                // Transition to game over after a short delay
                setTimeout(() => {
                    Game.state.screen = 'gameover';
                }, 1500);
            }
        },

        _deathEffect() {
            // Big explosion of particles
            for (let i = 0; i < 30; i++) {
                const a = Math.random() * Math.PI * 2;
                const spd = 1 + Math.random() * 5;
                E().addParticle({
                    x: this.x,
                    y: this.y,
                    vx: Math.cos(a) * spd,
                    vy: Math.sin(a) * spd,
                    life: 30 + Math.random() * 30,
                    color: i % 2 === 0 ? C().COLORS.PLAYER : C().COLORS.ENEMY,
                    size: 3 + Math.random() * 5,
                });
            }
            U().screenShake(12, 20);
        },

        // ────────────────────────────────────────────────────────
        // PROJECTILE UPDATE
        // ────────────────────────────────────────────────────────
        _updateProjectiles(dt) {
            const tilemap = this._getTilemap();

            for (let i = this.projectiles.length - 1; i >= 0; i--) {
                const p = this.projectiles[i];

                p.x += p.vx * dt;
                p.y += p.vy * dt;
                p.life -= dt;

                // Store trail positions
                p.trail.push({ x: p.x, y: p.y });
                if (p.trail.length > 6) p.trail.shift();

                // Check wall collision
                if (tilemap) {
                    const tileX = Math.floor(p.x / C().TILE_SIZE);
                    const tileY = Math.floor(p.y / C().TILE_SIZE);
                    if (tileY >= 0 && tileY < tilemap.length &&
                        tileX >= 0 && tileX < tilemap[0].length) {
                        if (tilemap[tileY][tileX] === 1) {
                            // Wall hit — impact particles
                            for (let j = 0; j < 3; j++) {
                                E().addParticle({
                                    x: p.x,
                                    y: p.y,
                                    vx: (Math.random() - 0.5) * 4,
                                    vy: (Math.random() - 0.5) * 4,
                                    life: 8 + Math.random() * 8,
                                    color: C().COLORS.PROJ_PLAYER,
                                    size: 2 + Math.random() * 2,
                                });
                            }
                            this.projectiles.splice(i, 1);
                            continue;
                        }
                    } else {
                        // Out of bounds
                        this.projectiles.splice(i, 1);
                        continue;
                    }
                }

                // Life expired
                if (p.life <= 0) {
                    this.projectiles.splice(i, 1);
                    continue;
                }
            }
        },

        // ────────────────────────────────────────────────────────
        // DRAW
        // ────────────────────────────────────────────────────────
        draw(ctx) {
            if (!this.alive) return;

            const pColor = C().COLORS.PLAYER;
            const glowColor = C().COLORS.PLAYER_GLOW;
            const size = C().PLAYER_SIZE;
            const half = size / 2;

            // Flashing effect when invulnerable
            if (this.invulnerable && this.invulnerableTimer > 0) {
                // Blink every 3 frames
                if (Math.floor(this.flashTimer) % 6 < 3) {
                    ctx.globalAlpha = 0.3;
                } else {
                    ctx.globalAlpha = 1.0;
                }
            }

            // Dash afterglow
            if (this.dashTimer > 0) {
                ctx.shadowColor = pColor;
                ctx.shadowBlur = 25;
            }

            // Outer glow ring
            ctx.fillStyle = glowColor;
            ctx.beginPath();
            ctx.arc(this.x, this.y, size * 1.2, 0, Math.PI * 2);
            ctx.fill();

            // Main body — diamond shape
            ctx.fillStyle = pColor;
            ctx.shadowColor = pColor;
            ctx.shadowBlur = 15;

            ctx.beginPath();
            ctx.moveTo(this.x, this.y - half);       // top
            ctx.lineTo(this.x + half, this.y);        // right
            ctx.lineTo(this.x, this.y + half);        // bottom
            ctx.lineTo(this.x - half, this.y);        // left
            ctx.closePath();
            ctx.fill();

            // Inner highlight
            ctx.fillStyle = '#ffffff';
            ctx.globalAlpha = (ctx.globalAlpha || 1) * 0.4;
            ctx.beginPath();
            const innerSize = half * 0.4;
            ctx.moveTo(this.x, this.y - innerSize);
            ctx.lineTo(this.x + innerSize, this.y);
            ctx.lineTo(this.x, this.y + innerSize);
            ctx.lineTo(this.x - innerSize, this.y);
            ctx.closePath();
            ctx.fill();

            ctx.globalAlpha = 1;
            ctx.shadowBlur = 0;

            // ── Aim direction indicator ──
            this._drawAimIndicator(ctx);
        },

        _drawAimIndicator(ctx) {
            const pColor = C().COLORS.PLAYER;
            const indicatorDist = C().PLAYER_SIZE * 1.3;
            const indicatorLen = 8;

            const ax = this.x + Math.cos(this.aimAngle) * indicatorDist;
            const ay = this.y + Math.sin(this.aimAngle) * indicatorDist;
            const bx = this.x + Math.cos(this.aimAngle) * (indicatorDist + indicatorLen);
            const by = this.y + Math.sin(this.aimAngle) * (indicatorDist + indicatorLen);

            ctx.strokeStyle = pColor;
            ctx.lineWidth = 2;
            ctx.shadowColor = pColor;
            ctx.shadowBlur = 8;
            ctx.beginPath();
            ctx.moveTo(ax, ay);
            ctx.lineTo(bx, by);
            ctx.stroke();
            ctx.shadowBlur = 0;
            ctx.lineWidth = 1;
        },

        // ────────────────────────────────────────────────────────
        // DRAW PROJECTILES
        // ────────────────────────────────────────────────────────
        drawProjectiles(ctx) {
            const projColor = C().COLORS.PROJ_PLAYER;

            for (const p of this.projectiles) {
                // Trail
                if (p.trail.length > 1) {
                    for (let i = 0; i < p.trail.length - 1; i++) {
                        const alpha = (i + 1) / p.trail.length * 0.5;
                        const trailSize = p.size * (i + 1) / p.trail.length;
                        ctx.globalAlpha = alpha;
                        ctx.fillStyle = projColor;
                        ctx.beginPath();
                        ctx.arc(p.trail[i].x, p.trail[i].y, trailSize, 0, Math.PI * 2);
                        ctx.fill();
                    }
                }

                // Main bolt
                ctx.globalAlpha = 1;
                ctx.fillStyle = projColor;
                ctx.shadowColor = projColor;
                ctx.shadowBlur = 12;

                ctx.beginPath();
                ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
                ctx.fill();

                // Bright core
                ctx.fillStyle = '#ffffff';
                ctx.beginPath();
                ctx.arc(p.x, p.y, p.size * 0.4, 0, Math.PI * 2);
                ctx.fill();

                ctx.shadowBlur = 0;
            }
            ctx.globalAlpha = 1;
        },
    };

    // Register on global
    window.Game = window.Game || {};
    window.Game.Player = Player;

    console.log('[Player] Module loaded');
})();
