/**
 * ENEMY SYSTEM — Enemy types, AI, spawning, projectiles, rendering
 * =================================================================
 * Provides: window.Game.Enemies
 * Depends on: contracts.js (Game.CONST, Game.Events, Game.state, Game.Utils)
 *             engine.js   (Game.Engine — particles, wall collision)
 *             player.js   (Game.Player — position, takeDamage)
 */
(function () {
    'use strict';

    const C = () => Game.CONST;
    const U = () => Game.Utils;

    // ── ENEMY TYPE CONFIGS ─────────────────────────────────────
    const ENEMY_TYPES = {
        chaser: {
            color: '#ff2244',
            hpMult: 1,
            speedMult: 1.2,
            sizeMult: 1,
            damage: 1,
            score: 100,
            shape: 'triangle',
        },
        shooter: {
            color: '#ff66aa',
            hpMult: 0.8,
            speedMult: 0.7,
            sizeMult: 1.1,
            damage: 0.8,
            score: 150,
            shape: 'hexagon',
        },
        tank: {
            color: '#991122',
            hpMult: 3,
            speedMult: 0.5,
            sizeMult: 1.5,
            damage: 1.5,
            score: 250,
            shape: 'square',
        },
        dasher: {
            color: '#ff8800',
            hpMult: 0.9,
            speedMult: 2.0,
            sizeMult: 0.9,
            damage: 0.8,
            score: 175,
            shape: 'diamond',
        },
    };

    // ── STATE ──────────────────────────────────────────────────
    let enemies = [];
    let enemyProjectiles = [];

    // ── HELPER: Create enemy from config ───────────────────────
    function createEnemy(type, x, y) {
        const cfg = ENEMY_TYPES[type];
        if (!cfg) {
            console.warn('[Enemies] Unknown enemy type:', type);
            return null;
        }

        return {
            x: x,
            y: y,
            hp: Math.round(C().ENEMY_HP * cfg.hpMult),
            maxHp: Math.round(C().ENEMY_HP * cfg.hpMult),
            speed: C().ENEMY_SPEED * cfg.speedMult,
            size: C().ENEMY_SIZE * cfg.sizeMult,
            type: type,
            alive: true,
            damage: Math.round(C().ENEMY_DAMAGE * cfg.damage),
            shootCooldown: C().ENEMY_SHOOT_COOLDOWN,
            flashTimer: 0,
            color: cfg.color,
            shape: cfg.shape,
            score: cfg.score,

            // Type-specific AI state
            aiTimer: 0,
            dashDir: null,        // dasher: current dash direction
            dashTimer: 0,         // dasher: frames remaining in dash
            dashCooldown: 0,      // dasher: cooldown between dashes
            chargeTimer: 0,       // tank: charge cooldown
            chargeDir: null,      // tank: charge direction
            charging: false,      // tank: currently charging?
            chargeDuration: 0,    // tank: frames in charge
        };
    }

    // ── HELPER: Get tilemap safely ─────────────────────────────
    function getTilemap() {
        if (Game.Levels && Game.Levels.getCurrentTilemap) {
            return Game.Levels.getCurrentTilemap();
        }
        return null;
    }

    // ── HELPER: Try to move enemy, respecting walls ────────────
    function moveEnemy(enemy, dx, dy, dt) {
        const newX = enemy.x + dx * dt;
        const newY = enemy.y + dy * dt;
        const tilemap = getTilemap();

        if (tilemap && Game.Engine && Game.Engine.checkWallCollision) {
            // Try full move
            const full = Game.Engine.checkWallCollision(newX, newY, enemy.size, tilemap);
            if (!full.blocked) {
                enemy.x = newX;
                enemy.y = newY;
            } else {
                // Try X only
                const xOnly = Game.Engine.checkWallCollision(newX, enemy.y, enemy.size, tilemap);
                if (!xOnly.blocked) {
                    enemy.x = newX;
                } else {
                    enemy.x = xOnly.nx;
                }
                // Try Y only
                const yOnly = Game.Engine.checkWallCollision(enemy.x, newY, enemy.size, tilemap);
                if (!yOnly.blocked) {
                    enemy.y = newY;
                } else {
                    enemy.y = yOnly.ny;
                }
            }
        } else {
            enemy.x = newX;
            enemy.y = newY;
        }
    }

    // ── HELPER: Spawn death particles ──────────────────────────
    function spawnDeathParticles(enemy) {
        if (!Game.Engine || !Game.Engine.addParticle) return;
        const count = 15;
        for (let i = 0; i < count; i++) {
            const angle = (Math.PI * 2 / count) * i + Math.random() * 0.3;
            const spd = 1.5 + Math.random() * 4;
            Game.Engine.addParticle({
                x: enemy.x + (Math.random() - 0.5) * enemy.size,
                y: enemy.y + (Math.random() - 0.5) * enemy.size,
                vx: Math.cos(angle) * spd,
                vy: Math.sin(angle) * spd,
                life: 20 + Math.random() * 25,
                color: i % 3 === 0 ? '#ffffff' : enemy.color,
                size: 2 + Math.random() * 4,
            });
        }
    }

    // ── HELPER: Fire projectile at player ──────────────────────
    function shootAtPlayer(enemy, speed, size) {
        if (!Game.Player) return;
        const px = Game.Player.x;
        const py = Game.Player.y;
        const angle = Math.atan2(py - enemy.y, px - enemy.x);
        const projSpeed = speed || 4;
        const projSize = size || 4;

        enemyProjectiles.push({
            x: enemy.x,
            y: enemy.y,
            vx: Math.cos(angle) * projSpeed,
            vy: Math.sin(angle) * projSpeed,
            damage: enemy.damage,
            size: projSize,
            life: 180,
            color: C().COLORS.PROJ_ENEMY,
        });
    }

    // ── HELPER: Fire projectile at specific angle ──────────────
    function shootAtAngle(x, y, angle, speed, damage, size) {
        const projSpeed = speed || 4;
        const projSize = size || 4;

        enemyProjectiles.push({
            x: x,
            y: y,
            vx: Math.cos(angle) * projSpeed,
            vy: Math.sin(angle) * projSpeed,
            damage: damage || C().ENEMY_DAMAGE,
            size: projSize,
            life: 180,
            color: C().COLORS.PROJ_ENEMY,
        });
    }

    // ══════════════════════════════════════════════════════════
    // AI UPDATE PER TYPE
    // ══════════════════════════════════════════════════════════

    function updateChaser(enemy, dt) {
        if (!Game.Player || !Game.Player.alive) return;
        const px = Game.Player.x;
        const py = Game.Player.y;
        const angle = Math.atan2(py - enemy.y, px - enemy.x);

        moveEnemy(enemy,
            Math.cos(angle) * enemy.speed,
            Math.sin(angle) * enemy.speed,
            dt
        );

        // Melee damage on contact
        const dist = U().dist(enemy, Game.Player);
        if (dist < enemy.size + C().PLAYER_SIZE / 2) {
            Game.Player.takeDamage(enemy.damage);
        }
    }

    function updateShooter(enemy, dt) {
        if (!Game.Player || !Game.Player.alive) return;
        const px = Game.Player.x;
        const py = Game.Player.y;
        const dist = U().dist(enemy, { x: px, y: py });
        const idealDist = 200;
        const angle = Math.atan2(py - enemy.y, px - enemy.x);

        // Keep distance: move toward if far, away if close
        if (dist > idealDist + 30) {
            moveEnemy(enemy,
                Math.cos(angle) * enemy.speed,
                Math.sin(angle) * enemy.speed,
                dt
            );
        } else if (dist < idealDist - 30) {
            moveEnemy(enemy,
                -Math.cos(angle) * enemy.speed,
                -Math.sin(angle) * enemy.speed,
                dt
            );
        } else {
            // Strafe perpendicular
            const strafeAngle = angle + Math.PI / 2;
            moveEnemy(enemy,
                Math.cos(strafeAngle) * enemy.speed * 0.5,
                Math.sin(strafeAngle) * enemy.speed * 0.5,
                dt
            );
        }

        // Shooting
        enemy.shootCooldown -= dt;
        if (enemy.shootCooldown <= 0) {
            shootAtPlayer(enemy, 3.5, 4);
            enemy.shootCooldown = C().ENEMY_SHOOT_COOLDOWN;
        }
    }

    function updateTank(enemy, dt) {
        if (!Game.Player || !Game.Player.alive) return;
        const px = Game.Player.x;
        const py = Game.Player.y;
        const angle = Math.atan2(py - enemy.y, px - enemy.x);

        // Charge mechanic
        enemy.chargeTimer -= dt;

        if (enemy.charging) {
            // During charge — move fast in charge direction
            const chargeSpeed = enemy.speed * 4;
            moveEnemy(enemy,
                enemy.chargeDir.x * chargeSpeed,
                enemy.chargeDir.y * chargeSpeed,
                dt
            );
            enemy.chargeDuration -= dt;

            // Damage on contact during charge
            const dist = U().dist(enemy, Game.Player);
            if (dist < enemy.size + C().PLAYER_SIZE / 2) {
                Game.Player.takeDamage(enemy.damage * 2);
            }

            if (enemy.chargeDuration <= 0) {
                enemy.charging = false;
                enemy.chargeTimer = 150; // Cooldown before next charge (~2.5s)
            }
        } else {
            // Slow approach
            moveEnemy(enemy,
                Math.cos(angle) * enemy.speed,
                Math.sin(angle) * enemy.speed,
                dt
            );

            // Start charge when ready and close enough
            if (enemy.chargeTimer <= 0) {
                const dist = U().dist(enemy, { x: px, y: py });
                if (dist < 300) {
                    enemy.charging = true;
                    enemy.chargeDuration = 20; // ~0.33s charge
                    enemy.chargeDir = {
                        x: Math.cos(angle),
                        y: Math.sin(angle),
                    };
                    // Charge flash
                    enemy.flashTimer = 5;
                }
            }

            // Melee damage on contact
            const dist = U().dist(enemy, Game.Player);
            if (dist < enemy.size + C().PLAYER_SIZE / 2) {
                Game.Player.takeDamage(enemy.damage);
            }
        }
    }

    function updateDasher(enemy, dt) {
        if (!Game.Player || !Game.Player.alive) return;

        enemy.dashCooldown -= dt;

        if (enemy.dashTimer > 0) {
            // Currently dashing
            if (enemy.dashDir) {
                const dashSpeed = enemy.speed * 3;
                moveEnemy(enemy,
                    enemy.dashDir.x * dashSpeed,
                    enemy.dashDir.y * dashSpeed,
                    dt
                );
            }
            enemy.dashTimer -= dt;

            // Trail particles
            if (Game.Engine && Game.Engine.addParticle && Math.random() < 0.5) {
                Game.Engine.addParticle({
                    x: enemy.x + (Math.random() - 0.5) * 8,
                    y: enemy.y + (Math.random() - 0.5) * 8,
                    vx: (Math.random() - 0.5) * 2,
                    vy: (Math.random() - 0.5) * 2,
                    life: 10 + Math.random() * 10,
                    color: enemy.color,
                    size: 2 + Math.random() * 3,
                });
            }

            // Melee damage on contact during dash
            const dist = U().dist(enemy, Game.Player);
            if (dist < enemy.size + C().PLAYER_SIZE / 2) {
                Game.Player.takeDamage(enemy.damage);
            }
        } else if (enemy.dashCooldown <= 0) {
            // Start new dash — random-ish direction biased toward player
            const px = Game.Player.x;
            const py = Game.Player.y;
            const toPlayer = Math.atan2(py - enemy.y, px - enemy.x);
            // Random angle, biased ~60° toward player
            const randomAngle = toPlayer + (Math.random() - 0.5) * Math.PI * 1.2;
            enemy.dashDir = {
                x: Math.cos(randomAngle),
                y: Math.sin(randomAngle),
            };
            enemy.dashTimer = 15 + Math.random() * 10; // ~0.25-0.42s dash
            enemy.dashCooldown = 30 + Math.random() * 30; // ~0.5-1s between dashes
        } else {
            // Idle — slow drift toward player
            const px = Game.Player.x;
            const py = Game.Player.y;
            const angle = Math.atan2(py - enemy.y, px - enemy.x);
            moveEnemy(enemy,
                Math.cos(angle) * enemy.speed * 0.3,
                Math.sin(angle) * enemy.speed * 0.3,
                dt
            );
        }
    }

    // AI dispatch table
    const AI_UPDATE = {
        chaser: updateChaser,
        shooter: updateShooter,
        tank: updateTank,
        dasher: updateDasher,
    };

    // ══════════════════════════════════════════════════════════
    // DRAWING HELPERS
    // ══════════════════════════════════════════════════════════

    function drawTriangle(ctx, x, y, size, color) {
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.moveTo(x, y - size);
        ctx.lineTo(x + size * 0.866, y + size * 0.5);
        ctx.lineTo(x - size * 0.866, y + size * 0.5);
        ctx.closePath();
        ctx.fill();
    }

    function drawHexagon(ctx, x, y, size, color) {
        ctx.fillStyle = color;
        ctx.beginPath();
        for (let i = 0; i < 6; i++) {
            const angle = (Math.PI / 3) * i - Math.PI / 6;
            const px = x + Math.cos(angle) * size;
            const py = y + Math.sin(angle) * size;
            if (i === 0) ctx.moveTo(px, py);
            else ctx.lineTo(px, py);
        }
        ctx.closePath();
        ctx.fill();
    }

    function drawSquare(ctx, x, y, size, color) {
        ctx.fillStyle = color;
        ctx.fillRect(x - size, y - size, size * 2, size * 2);
    }

    function drawDiamond(ctx, x, y, size, color) {
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.moveTo(x, y - size);
        ctx.lineTo(x + size, y);
        ctx.lineTo(x, y + size);
        ctx.lineTo(x - size, y);
        ctx.closePath();
        ctx.fill();
    }

    const SHAPE_DRAW = {
        triangle: drawTriangle,
        hexagon: drawHexagon,
        square: drawSquare,
        diamond: drawDiamond,
    };

    function drawHPBar(ctx, enemy) {
        if (enemy.hp >= enemy.maxHp) return; // Only show when damaged

        const barW = enemy.size * 2;
        const barH = 4;
        const bx = enemy.x - barW / 2;
        const by = enemy.y - enemy.size - 10;
        const ratio = Math.max(0, enemy.hp / enemy.maxHp);

        // Background
        ctx.fillStyle = C().COLORS.HP_BAR_BG;
        ctx.fillRect(bx, by, barW, barH);

        // Foreground
        const hpColor = ratio > 0.5 ? C().COLORS.HP_BAR : (ratio > 0.25 ? '#ffaa00' : '#ff3333');
        ctx.fillStyle = hpColor;
        ctx.fillRect(bx, by, barW * ratio, barH);

        // Border
        ctx.strokeStyle = '#ffffff22';
        ctx.lineWidth = 1;
        ctx.strokeRect(bx, by, barW, barH);
    }

    // ══════════════════════════════════════════════════════════
    // MAIN MODULE
    // ══════════════════════════════════════════════════════════

    const Enemies = {
        // ── init ───────────────────────────────────────────────
        init() {
            enemies = [];
            enemyProjectiles = [];
        },

        // ── spawnWave ──────────────────────────────────────────
        spawnWave(enemyList) {
            if (!Array.isArray(enemyList)) return;

            for (const cfg of enemyList) {
                const enemy = createEnemy(cfg.type, cfg.x, cfg.y);
                if (enemy) {
                    enemies.push(enemy);
                }
            }

            Game.state.enemiesRemaining = this.count();
            Game.state.totalEnemies = enemies.length;
        },

        // ── update ─────────────────────────────────────────────
        update(dt) {
            dt = dt || 1;

            // Update enemies
            for (let i = enemies.length - 1; i >= 0; i--) {
                const enemy = enemies[i];

                if (!enemy.alive) continue;

                // Flash timer
                if (enemy.flashTimer > 0) {
                    enemy.flashTimer -= dt;
                }

                // Death check
                if (enemy.hp <= 0) {
                    enemy.alive = false;
                    spawnDeathParticles(enemy);

                    Game.state.kills++;
                    Game.state.score += enemy.score;
                    Game.state.enemiesRemaining = this.count() - 1; // -1 because we haven't processed yet

                    Game.Events.emit('enemy-killed', {
                        type: enemy.type,
                        x: enemy.x,
                        y: enemy.y,
                        score: enemy.score,
                    });

                    continue;
                }

                // AI update per type
                const aiFn = AI_UPDATE[enemy.type];
                if (aiFn) {
                    aiFn(enemy, dt);
                }
            }

            // Update enemy projectiles
            this._updateProjectiles(dt);
        },

        // ── Update enemy projectiles ───────────────────────────
        _updateProjectiles(dt) {
            const tilemap = getTilemap();

            for (let i = enemyProjectiles.length - 1; i >= 0; i--) {
                const p = enemyProjectiles[i];

                p.x += p.vx * dt;
                p.y += p.vy * dt;
                p.life -= dt;

                // Wall collision
                if (tilemap) {
                    const tileX = Math.floor(p.x / C().TILE_SIZE);
                    const tileY = Math.floor(p.y / C().TILE_SIZE);
                    if (tileY < 0 || tileY >= tilemap.length ||
                        tileX < 0 || tileX >= tilemap[0].length ||
                        tilemap[tileY][tileX] === 1) {
                        enemyProjectiles.splice(i, 1);
                        continue;
                    }
                }

                // Hit player
                if (Game.Player && Game.Player.alive) {
                    const dist = U().dist(p, Game.Player);
                    if (dist < p.size + C().PLAYER_SIZE / 2) {
                        Game.Player.takeDamage(p.damage);

                        // Impact particles
                        if (Game.Engine && Game.Engine.addParticle) {
                            for (let j = 0; j < 4; j++) {
                                const a = Math.random() * Math.PI * 2;
                                Game.Engine.addParticle({
                                    x: p.x,
                                    y: p.y,
                                    vx: Math.cos(a) * (1 + Math.random() * 3),
                                    vy: Math.sin(a) * (1 + Math.random() * 3),
                                    life: 8 + Math.random() * 8,
                                    color: p.color,
                                    size: 2 + Math.random() * 2,
                                });
                            }
                        }

                        enemyProjectiles.splice(i, 1);
                        continue;
                    }
                }

                // Life expired
                if (p.life <= 0) {
                    enemyProjectiles.splice(i, 1);
                }
            }
        },

        // ── draw ───────────────────────────────────────────────
        draw(ctx) {
            // Draw enemy projectiles
            this._drawProjectiles(ctx);

            // Draw enemies
            for (const enemy of enemies) {
                if (!enemy.alive) continue;

                ctx.save();

                // Glow aura
                ctx.shadowColor = enemy.color;
                ctx.shadowBlur = 12;

                // Determine draw color (flash white on hit)
                let drawColor = enemy.color;
                if (enemy.flashTimer > 0 && Math.floor(enemy.flashTimer) % 4 < 2) {
                    drawColor = '#ffffff';
                    ctx.shadowColor = '#ffffff';
                    ctx.shadowBlur = 20;
                }

                // Draw shape
                const drawFn = SHAPE_DRAW[enemy.shape];
                if (drawFn) {
                    drawFn(ctx, enemy.x, enemy.y, enemy.size * 0.6, drawColor);
                }

                // Inner bright core
                ctx.globalAlpha = 0.3;
                if (drawFn) {
                    drawFn(ctx, enemy.x, enemy.y, enemy.size * 0.25, '#ffffff');
                }
                ctx.globalAlpha = 1;

                ctx.shadowBlur = 0;

                // HP bar
                drawHPBar(ctx, enemy);

                // Charge indicator for tank
                if (enemy.type === 'tank' && enemy.charging) {
                    ctx.strokeStyle = '#ff4444';
                    ctx.lineWidth = 2;
                    ctx.shadowColor = '#ff4444';
                    ctx.shadowBlur = 10;
                    ctx.beginPath();
                    ctx.arc(enemy.x, enemy.y, enemy.size * 1.2, 0, Math.PI * 2);
                    ctx.stroke();
                    ctx.shadowBlur = 0;
                }

                ctx.restore();
            }
        },

        // ── Draw enemy projectiles ─────────────────────────────
        _drawProjectiles(ctx) {
            for (const p of enemyProjectiles) {
                ctx.save();

                ctx.fillStyle = p.color || C().COLORS.PROJ_ENEMY;
                ctx.shadowColor = p.color || C().COLORS.PROJ_ENEMY;
                ctx.shadowBlur = 10;

                ctx.beginPath();
                ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
                ctx.fill();

                // Bright core
                ctx.fillStyle = '#ffffff';
                ctx.globalAlpha = 0.6;
                ctx.beginPath();
                ctx.arc(p.x, p.y, p.size * 0.4, 0, Math.PI * 2);
                ctx.fill();

                ctx.restore();
            }
        },

        // ── getAll ─────────────────────────────────────────────
        getAll() {
            return enemies.filter(e => e.alive);
        },

        // ── getEnemyProjectiles ────────────────────────────────
        getEnemyProjectiles() {
            return enemyProjectiles;
        },

        // ── addProjectile (for boss system to use) ─────────────
        addProjectile(proj) {
            enemyProjectiles.push(proj);
        },

        // ── clear ──────────────────────────────────────────────
        clear() {
            enemies = [];
            enemyProjectiles = [];
        },

        // ── count ──────────────────────────────────────────────
        count() {
            let alive = 0;
            for (const e of enemies) {
                if (e.alive) alive++;
            }
            return alive;
        },
    };

    // Register on global
    window.Game = window.Game || {};
    window.Game.Enemies = Enemies;

    console.log('[Enemies] Module loaded');
})();
