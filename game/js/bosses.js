/**
 * BOSS SYSTEM — Three unique bosses with phases, attack patterns, dramatic effects
 * ================================================================================
 * Provides: window.Game.Bosses
 * Depends on: contracts.js (Game.CONST, Game.Events, Game.state, Game.Utils)
 *             engine.js   (Game.Engine — particles)
 *             enemies.js  (Game.Enemies — spawn chasers, projectile array)
 */
(function () {
    'use strict';

    const C = () => Game.CONST;
    const U = () => Game.Utils;

    // ── STATE ──────────────────────────────────────────────────
    let activeBoss = null;
    let bossProjectiles = [];

    // ── BOSS DEFINITIONS ───────────────────────────────────────
    const BOSS_DEFS = [
        // Level 0 — The Warden (orange)
        {
            name: 'The Warden',
            color: '#ff6600',
            colorAlt: '#ff9933',
            shape: 'octagon',
            phaseCount: 2,
        },
        // Level 1 — The Sorcerer (purple)
        {
            name: 'The Sorcerer',
            color: '#cc00ff',
            colorAlt: '#ee66ff',
            shape: 'diamond',
            phaseCount: 2,
        },
        // Level 2 — The Void King (crimson)
        {
            name: 'The Void King',
            color: '#ff0044',
            colorAlt: '#ff3366',
            shape: 'star',
            phaseCount: 3,
        },
    ];

    // ══════════════════════════════════════════════════════════
    // BOSS FACTORY
    // ══════════════════════════════════════════════════════════

    function createBoss(level) {
        const def = BOSS_DEFS[level];
        if (!def) return null;

        const TS = C().TILE_SIZE;
        // Spawn in upper area of the room
        const spawnX = Math.floor(C().ROOM_W / 2) * TS + TS / 2;
        const spawnY = Math.floor(C().ROOM_H * 0.3) * TS + TS / 2;

        const boss = {
            // Identity
            level: level,
            name: def.name,
            color: def.color,
            colorAlt: def.colorAlt,
            shape: def.shape,

            // Position & movement
            x: spawnX,
            y: spawnY,
            size: C().BOSS_SIZE,
            speed: C().BOSS_SPEED[level],

            // Combat
            hp: C().BOSS_HP[level],
            maxHp: C().BOSS_HP[level],
            damage: C().BOSS_DAMAGE[level],
            alive: true,

            // Phase
            phase: 1,
            phaseCount: def.phaseCount,
            phaseTransitioned: { 2: false, 3: false },

            // Timers (in frames at 60fps)
            shootTimer: 0,
            specialTimer: 0,
            dashTimer: 0,
            dashCooldown: 0,
            dashDir: null,
            moveAngle: 0,

            // Visual
            flashTimer: 0,
            auraPhase: 0,       // for pulsating aura
            rotation: 0,        // rotating shield/shape

            // Warden-specific
            fireTrail: [],

            // Sorcerer-specific
            shieldOrbs: [],
            clones: [],
            teleportTimer: 0,
            spiralAngle: 0,

            // Void King-specific
            laserAngle: 0,
            laserActive: false,
            laserTimer: 0,
            voidZones: [],
            enrageTimer: 0,
            bulletHellAngle: 0,

            // Death animation
            deathTimer: 0,
            dying: false,
        };

        // Sorcerer: init shield orbs
        if (level === 1) {
            for (let i = 0; i < 3; i++) {
                boss.shieldOrbs.push({
                    angle: (Math.PI * 2 / 3) * i,
                    hp: 30,
                    maxHp: 30,
                    alive: true,
                    orbitRadius: boss.size * 2,
                    speed: 0.02,
                });
            }
        }

        return boss;
    }

    // ══════════════════════════════════════════════════════════
    // PHASE MANAGEMENT
    // ══════════════════════════════════════════════════════════

    function checkPhaseTransition(boss) {
        if (!boss || !boss.alive) return;

        const hpRatio = boss.hp / boss.maxHp;

        // Phase 2 at <= 50%
        if (boss.phase === 1 && hpRatio <= 0.5 && !boss.phaseTransitioned[2]) {
            boss.phase = 2;
            boss.phaseTransitioned[2] = true;
            onPhaseChange(boss, 2);
        }

        // Phase 3 at <= 25% (Void King only)
        if (boss.level === 2 && boss.phase === 2 && hpRatio <= 0.25 && !boss.phaseTransitioned[3]) {
            boss.phase = 3;
            boss.phaseTransitioned[3] = true;
            onPhaseChange(boss, 3);
        }
    }

    function onPhaseChange(boss, phase) {
        // Screen shake
        U().screenShake(10, 20);

        // Burst of particles
        if (Game.Engine && Game.Engine.addParticle) {
            for (let i = 0; i < 25; i++) {
                const a = Math.random() * Math.PI * 2;
                const spd = 2 + Math.random() * 5;
                Game.Engine.addParticle({
                    x: boss.x + (Math.random() - 0.5) * boss.size,
                    y: boss.y + (Math.random() - 0.5) * boss.size,
                    vx: Math.cos(a) * spd,
                    vy: Math.sin(a) * spd,
                    life: 25 + Math.random() * 30,
                    color: boss.color,
                    size: 3 + Math.random() * 5,
                });
            }
        }

        Game.Events.emit('boss-phase-change', {
            name: boss.name,
            level: boss.level,
            phase: phase,
        });
    }

    // ══════════════════════════════════════════════════════════
    // BOSS DEATH
    // ══════════════════════════════════════════════════════════

    function onBossDeath(boss) {
        boss.alive = false;
        boss.dying = true;
        boss.deathTimer = 90; // ~1.5s death animation

        U().screenShake(15, 30);

        // Massive particle explosion
        if (Game.Engine && Game.Engine.addParticle) {
            for (let i = 0; i < 60; i++) {
                const a = Math.random() * Math.PI * 2;
                const spd = 1 + Math.random() * 7;
                Game.Engine.addParticle({
                    x: boss.x + (Math.random() - 0.5) * boss.size * 2,
                    y: boss.y + (Math.random() - 0.5) * boss.size * 2,
                    vx: Math.cos(a) * spd,
                    vy: Math.sin(a) * spd,
                    life: 40 + Math.random() * 50,
                    color: i % 4 === 0 ? '#ffffff' : (i % 3 === 0 ? boss.colorAlt : boss.color),
                    size: 3 + Math.random() * 6,
                });
            }
        }

        Game.state.bossDefeated = true;
        Game.state.bossActive = false;

        Game.Events.emit('boss-defeated', {
            name: boss.name,
            level: boss.level,
        });
    }

    // ══════════════════════════════════════════════════════════
    // HELPER: add projectile to enemy projectile system
    // ══════════════════════════════════════════════════════════

    function addProjectile(x, y, vx, vy, damage, size, color, life) {
        const proj = {
            x: x,
            y: y,
            vx: vx,
            vy: vy,
            damage: damage || C().ENEMY_DAMAGE,
            size: size || 5,
            life: life || 180,
            color: color || C().COLORS.PROJ_ENEMY,
        };

        // Use enemy projectile system if available
        if (Game.Enemies && Game.Enemies.addProjectile) {
            Game.Enemies.addProjectile(proj);
        } else {
            bossProjectiles.push(proj);
        }
    }

    function shootSpread(boss, count, speed, spread) {
        if (!Game.Player) return;
        const angle = Math.atan2(Game.Player.y - boss.y, Game.Player.x - boss.x);
        const halfSpread = spread / 2;
        const step = count > 1 ? spread / (count - 1) : 0;

        for (let i = 0; i < count; i++) {
            const a = count > 1 ? angle - halfSpread + step * i : angle;
            addProjectile(
                boss.x, boss.y,
                Math.cos(a) * speed,
                Math.sin(a) * speed,
                boss.damage,
                5,
                boss.color
            );
        }
    }

    function shootRing(boss, count, speed) {
        for (let i = 0; i < count; i++) {
            const a = (Math.PI * 2 / count) * i;
            addProjectile(
                boss.x, boss.y,
                Math.cos(a) * speed,
                Math.sin(a) * speed,
                boss.damage,
                4,
                boss.color
            );
        }
    }

    function shootSpiral(boss, speed, angleOffset) {
        const a = angleOffset || boss.spiralAngle || 0;
        addProjectile(
            boss.x, boss.y,
            Math.cos(a) * speed,
            Math.sin(a) * speed,
            boss.damage,
            4,
            boss.colorAlt
        );
    }

    // ══════════════════════════════════════════════════════════
    // WARDEN AI (Level 0)
    // ══════════════════════════════════════════════════════════

    function updateWarden(boss, dt) {
        if (!Game.Player) return;

        const px = Game.Player.x;
        const py = Game.Player.y;
        const angle = Math.atan2(py - boss.y, px - boss.x);

        boss.rotation += 0.015 * dt;
        boss.shootTimer -= dt;
        boss.dashCooldown -= dt;

        // --- MOVEMENT ---
        const moveSpeed = boss.phase === 2 ? boss.speed * 1.5 : boss.speed;

        if (boss.dashTimer > 0) {
            // Dashing
            const dashSpeed = boss.speed * 5;
            boss.x += boss.dashDir.x * dashSpeed * dt;
            boss.y += boss.dashDir.y * dashSpeed * dt;
            boss.dashTimer -= dt;

            // Fire trail particles
            if (Game.Engine && Game.Engine.addParticle) {
                for (let i = 0; i < 2; i++) {
                    Game.Engine.addParticle({
                        x: boss.x + (Math.random() - 0.5) * boss.size,
                        y: boss.y + (Math.random() - 0.5) * boss.size,
                        vx: (Math.random() - 0.5) * 2,
                        vy: (Math.random() - 0.5) * 2,
                        life: 20 + Math.random() * 15,
                        color: '#ff4400',
                        size: 4 + Math.random() * 4,
                    });
                }
            }
        } else {
            // Chase player
            boss.x += Math.cos(angle) * moveSpeed * dt;
            boss.y += Math.sin(angle) * moveSpeed * dt;
        }

        // --- DASH ATTACK (every ~5s = 300 frames) ---
        if (boss.dashCooldown <= 0 && boss.dashTimer <= 0) {
            boss.dashDir = { x: Math.cos(angle), y: Math.sin(angle) };
            boss.dashTimer = 18; // ~0.3s dash
            boss.dashCooldown = 300;
            boss.flashTimer = 5;
        }

        // --- SHOOTING ---
        if (boss.shootTimer <= 0) {
            if (boss.phase === 1) {
                // 3-bullet spread every 2s (120 frames)
                shootSpread(boss, 3, 4, Math.PI / 4);
                boss.shootTimer = 120;
            } else {
                // Phase 2: 5-bullet ring every 1.5s
                shootRing(boss, 5, 3.5);
                boss.shootTimer = 90;
            }
        }

        // --- PHASE 2: spawn chasers every 8s (480 frames) ---
        if (boss.phase === 2) {
            boss.specialTimer -= dt;
            if (boss.specialTimer <= 0) {
                if (Game.Enemies && Game.Enemies.spawnWave) {
                    Game.Enemies.spawnWave([
                        { type: 'chaser', x: boss.x - 40, y: boss.y - 40 },
                        { type: 'chaser', x: boss.x + 40, y: boss.y + 40 },
                    ]);
                }
                boss.specialTimer = 480;
            }
        }
    }

    // ══════════════════════════════════════════════════════════
    // SORCERER AI (Level 1)
    // ══════════════════════════════════════════════════════════

    function updateSorcerer(boss, dt) {
        if (!Game.Player) return;

        const px = Game.Player.x;
        const py = Game.Player.y;

        boss.rotation += 0.02 * dt;
        boss.shootTimer -= dt;
        boss.teleportTimer -= dt;
        boss.spiralAngle += 0.08 * dt;

        // --- Update shield orbs ---
        for (const orb of boss.shieldOrbs) {
            if (!orb.alive) continue;
            orb.angle += orb.speed * dt;
        }

        // --- TELEPORT (every ~4s = 240 frames) ---
        if (boss.teleportTimer <= 0) {
            const TS = C().TILE_SIZE;
            const margin = 3 * TS;
            const roomW = C().ROOM_W * TS;
            const roomH = C().ROOM_H * TS;

            boss.x = margin + Math.random() * (roomW - margin * 2);
            boss.y = margin + Math.random() * (roomH - margin * 2);

            // Teleport particles at new position
            if (Game.Engine && Game.Engine.addParticle) {
                for (let i = 0; i < 15; i++) {
                    const a = Math.random() * Math.PI * 2;
                    Game.Engine.addParticle({
                        x: boss.x,
                        y: boss.y,
                        vx: Math.cos(a) * (2 + Math.random() * 3),
                        vy: Math.sin(a) * (2 + Math.random() * 3),
                        life: 15 + Math.random() * 15,
                        color: boss.color,
                        size: 3 + Math.random() * 4,
                    });
                }
            }

            boss.teleportTimer = boss.phase === 2 ? 180 : 240;
        }

        // --- SHOOTING ---
        if (boss.shootTimer <= 0) {
            if (boss.phase === 1) {
                // Homing orbs — shoot at player with slight homing
                const angle = Math.atan2(py - boss.y, px - boss.x);
                for (let i = 0; i < 3; i++) {
                    const a = angle + (i - 1) * 0.15;
                    addProjectile(
                        boss.x, boss.y,
                        Math.cos(a) * 3,
                        Math.sin(a) * 3,
                        boss.damage,
                        6,
                        boss.color,
                        200
                    );
                }
                boss.shootTimer = 100;
            } else {
                // Phase 2: spiral pattern
                for (let i = 0; i < 4; i++) {
                    shootSpiral(boss, 3, boss.spiralAngle + (Math.PI / 2) * i);
                }
                boss.shootTimer = 15; // Rapid spiral
            }
        }

        // --- PHASE 2: Shadow clones ---
        if (boss.phase === 2) {
            boss.specialTimer -= dt;
            if (boss.specialTimer <= 0 && boss.clones.length < 2) {
                // Create shadow clones at random positions
                for (let i = boss.clones.length; i < 2; i++) {
                    boss.clones.push({
                        x: boss.x + (Math.random() - 0.5) * 200,
                        y: boss.y + (Math.random() - 0.5) * 200,
                        hp: 1,
                        alive: true,
                        alpha: 0.5,
                        rotation: Math.random() * Math.PI * 2,
                    });
                }
                boss.specialTimer = 360; // ~6s
            }

            // Update clones
            for (let i = boss.clones.length - 1; i >= 0; i--) {
                const clone = boss.clones[i];
                if (!clone.alive) {
                    boss.clones.splice(i, 1);
                    continue;
                }
                clone.rotation += 0.02 * dt;
            }
        }

        // --- Slow float/drift movement ---
        const angle = Math.atan2(py - boss.y, px - boss.x);
        const dist = U().dist(boss, Game.Player);
        if (dist > 250) {
            boss.x += Math.cos(angle) * boss.speed * 0.3 * dt;
            boss.y += Math.sin(angle) * boss.speed * 0.3 * dt;
        } else if (dist < 150) {
            boss.x -= Math.cos(angle) * boss.speed * 0.3 * dt;
            boss.y -= Math.sin(angle) * boss.speed * 0.3 * dt;
        }
    }

    // ══════════════════════════════════════════════════════════
    // VOID KING AI (Level 2)
    // ══════════════════════════════════════════════════════════

    function updateVoidKing(boss, dt) {
        if (!Game.Player) return;

        const px = Game.Player.x;
        const py = Game.Player.y;
        const angle = Math.atan2(py - boss.y, px - boss.x);

        boss.rotation += 0.01 * dt;
        boss.shootTimer -= dt;
        boss.bulletHellAngle += 0.05 * dt;
        boss.laserTimer -= dt;

        const speedMult = boss.phase === 3 ? 1.8 : (boss.phase === 2 ? 1.3 : 1.0);

        // --- MOVEMENT: slow ominous drift toward player ---
        const dist = U().dist(boss, Game.Player);
        if (dist > 180) {
            boss.x += Math.cos(angle) * boss.speed * 0.5 * speedMult * dt;
            boss.y += Math.sin(angle) * boss.speed * 0.5 * speedMult * dt;
        }

        // --- PHASE 1: Laser beams + bullet hell ---
        if (boss.phase >= 1) {
            // Laser sweep
            if (boss.laserTimer <= 0) {
                boss.laserActive = true;
                boss.laserAngle = angle;
                boss.laserTimer = boss.phase === 3 ? 120 : 180; // more frequent in phase 3
            }

            if (boss.laserActive) {
                boss.laserAngle += 0.03 * dt;
                boss.specialTimer = (boss.specialTimer || 0) + dt;
                if (boss.specialTimer > 60) {
                    boss.laserActive = false;
                    boss.specialTimer = 0;
                }
            }

            // Bullet hell pattern
            if (boss.shootTimer <= 0) {
                const bulletCount = boss.phase === 3 ? 8 : (boss.phase === 2 ? 6 : 4);
                const bulletSpeed = boss.phase === 3 ? 4 : 3;
                for (let i = 0; i < bulletCount; i++) {
                    const a = boss.bulletHellAngle + (Math.PI * 2 / bulletCount) * i;
                    addProjectile(
                        boss.x, boss.y,
                        Math.cos(a) * bulletSpeed,
                        Math.sin(a) * bulletSpeed,
                        boss.damage,
                        4,
                        boss.color
                    );
                }
                boss.shootTimer = boss.phase === 3 ? 20 : (boss.phase === 2 ? 35 : 50);
            }
        }

        // --- PHASE 2: Void zones + rapid fire ---
        if (boss.phase >= 2) {
            boss.enrageTimer -= dt;

            // Spawn void zones periodically
            if (boss.enrageTimer <= 0) {
                boss.voidZones.push({
                    x: px + (Math.random() - 0.5) * 200,
                    y: py + (Math.random() - 0.5) * 200,
                    radius: 20,
                    maxRadius: 60,
                    life: 300, // ~5s
                    growing: true,
                    damage: boss.damage * 0.5,
                });
                boss.enrageTimer = boss.phase === 3 ? 90 : 150;
            }

            // Update void zones
            for (let i = boss.voidZones.length - 1; i >= 0; i--) {
                const vz = boss.voidZones[i];
                vz.life -= dt;

                if (vz.growing && vz.radius < vz.maxRadius) {
                    vz.radius += 0.5 * dt;
                    if (vz.radius >= vz.maxRadius) vz.growing = false;
                }

                // Damage player if inside
                if (Game.Player && Game.Player.alive) {
                    const vzDist = U().dist(vz, Game.Player);
                    if (vzDist < vz.radius) {
                        Game.Player.takeDamage(vz.damage * dt / 60);
                    }
                }

                if (vz.life <= 0) {
                    boss.voidZones.splice(i, 1);
                }
            }
        }

        // --- PHASE 3: Aimed shots combo + screen shake ---
        if (boss.phase === 3) {
            // Constant screen shake
            if (Game.state.shakeTimer <= 0) {
                U().screenShake(3, 5);
            }

            // Aimed shots at player mixed in
            if (Math.random() < 0.03 * dt) {
                shootSpread(boss, 3, 5, Math.PI / 6);
            }
        }
    }

    // AI dispatch
    const BOSS_AI = [updateWarden, updateSorcerer, updateVoidKing];

    // ══════════════════════════════════════════════════════════
    // DRAWING
    // ══════════════════════════════════════════════════════════

    function drawOctagon(ctx, x, y, size, rotation) {
        ctx.beginPath();
        for (let i = 0; i < 8; i++) {
            const a = (Math.PI / 4) * i + rotation;
            const px = x + Math.cos(a) * size;
            const py = y + Math.sin(a) * size;
            if (i === 0) ctx.moveTo(px, py);
            else ctx.lineTo(px, py);
        }
        ctx.closePath();
    }

    function drawDiamond(ctx, x, y, size, rotation) {
        ctx.beginPath();
        for (let i = 0; i < 4; i++) {
            const a = (Math.PI / 2) * i + rotation;
            const px = x + Math.cos(a) * size;
            const py = y + Math.sin(a) * size;
            if (i === 0) ctx.moveTo(px, py);
            else ctx.lineTo(px, py);
        }
        ctx.closePath();
    }

    function drawStar(ctx, x, y, size, rotation, points) {
        const pts = points || 5;
        ctx.beginPath();
        for (let i = 0; i < pts * 2; i++) {
            const a = (Math.PI / pts) * i + rotation;
            const r = i % 2 === 0 ? size : size * 0.5;
            const px = x + Math.cos(a) * r;
            const py = y + Math.sin(a) * r;
            if (i === 0) ctx.moveTo(px, py);
            else ctx.lineTo(px, py);
        }
        ctx.closePath();
    }

    function drawBossAura(ctx, boss) {
        boss.auraPhase += 0.04;
        const pulse = 0.7 + 0.3 * Math.sin(boss.auraPhase);
        const auraSize = boss.size * 1.8 * pulse;

        // Outer glow
        const gradient = ctx.createRadialGradient(
            boss.x, boss.y, boss.size * 0.5,
            boss.x, boss.y, auraSize
        );
        gradient.addColorStop(0, boss.color + '44');
        gradient.addColorStop(0.5, boss.color + '22');
        gradient.addColorStop(1, boss.color + '00');

        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(boss.x, boss.y, auraSize, 0, Math.PI * 2);
        ctx.fill();
    }

    function drawWarden(ctx, boss) {
        const size = boss.size;

        // Rotating shield segments
        ctx.strokeStyle = boss.colorAlt;
        ctx.lineWidth = 3;
        ctx.shadowColor = boss.colorAlt;
        ctx.shadowBlur = 8;
        for (let i = 0; i < 4; i++) {
            const a = boss.rotation + (Math.PI / 2) * i;
            const arcStart = a - 0.3;
            const arcEnd = a + 0.3;
            ctx.beginPath();
            ctx.arc(boss.x, boss.y, size * 1.4, arcStart, arcEnd);
            ctx.stroke();
        }

        // Main octagon body
        let drawColor = boss.color;
        if (boss.flashTimer > 0 && Math.floor(boss.flashTimer) % 4 < 2) {
            drawColor = '#ffffff';
        }

        ctx.fillStyle = drawColor;
        ctx.shadowColor = drawColor;
        ctx.shadowBlur = 15;
        drawOctagon(ctx, boss.x, boss.y, size, boss.rotation);
        ctx.fill();

        // Inner core
        ctx.fillStyle = '#ffffff';
        ctx.globalAlpha = 0.3;
        drawOctagon(ctx, boss.x, boss.y, size * 0.4, boss.rotation + Math.PI / 8);
        ctx.fill();
        ctx.globalAlpha = 1;

        // Armor lines
        ctx.strokeStyle = boss.colorAlt;
        ctx.lineWidth = 2;
        ctx.shadowBlur = 0;
        drawOctagon(ctx, boss.x, boss.y, size * 0.7, boss.rotation);
        ctx.stroke();
    }

    function drawSorcerer(ctx, boss) {
        const size = boss.size;

        // Orbiting energy orbs (shield)
        for (const orb of boss.shieldOrbs) {
            if (!orb.alive) continue;
            const ox = boss.x + Math.cos(orb.angle) * orb.orbitRadius;
            const oy = boss.y + Math.sin(orb.angle) * orb.orbitRadius;

            ctx.fillStyle = boss.colorAlt;
            ctx.shadowColor = boss.colorAlt;
            ctx.shadowBlur = 12;
            ctx.beginPath();
            ctx.arc(ox, oy, 8, 0, Math.PI * 2);
            ctx.fill();

            // Orb HP indicator
            if (orb.hp < orb.maxHp) {
                ctx.globalAlpha = 0.7;
                ctx.fillStyle = '#ffffff';
                ctx.beginPath();
                ctx.arc(ox, oy, 8 * (orb.hp / orb.maxHp), 0, Math.PI * 2);
                ctx.fill();
                ctx.globalAlpha = 1;
            }
        }

        // Main diamond body
        let drawColor = boss.color;
        if (boss.flashTimer > 0 && Math.floor(boss.flashTimer) % 4 < 2) {
            drawColor = '#ffffff';
        }

        ctx.fillStyle = drawColor;
        ctx.shadowColor = drawColor;
        ctx.shadowBlur = 20;
        drawDiamond(ctx, boss.x, boss.y, size, boss.rotation);
        ctx.fill();

        // Inner energy core
        ctx.fillStyle = '#ffffff';
        ctx.globalAlpha = 0.4;
        drawDiamond(ctx, boss.x, boss.y, size * 0.35, -boss.rotation);
        ctx.fill();
        ctx.globalAlpha = 1;

        // Floating effect — slight bob
        const bob = Math.sin(boss.auraPhase * 2) * 3;
        ctx.translate(0, bob);

        // Shadow clones
        for (const clone of boss.clones) {
            if (!clone.alive) continue;
            ctx.globalAlpha = clone.alpha;
            ctx.fillStyle = boss.color;
            ctx.shadowColor = boss.color;
            ctx.shadowBlur = 10;
            drawDiamond(ctx, clone.x, clone.y, size * 0.8, clone.rotation);
            ctx.fill();
            ctx.globalAlpha = 1;
        }

        ctx.translate(0, -bob);
    }

    function drawVoidKing(ctx, boss) {
        const size = boss.size * (1 + 0.05 * Math.sin(boss.auraPhase * 3));

        // Void zones
        for (const vz of boss.voidZones) {
            const vzAlpha = Math.max(0, Math.min(1, vz.life / 60)) * 0.4;
            ctx.fillStyle = boss.color;
            ctx.globalAlpha = vzAlpha;
            ctx.shadowColor = boss.color;
            ctx.shadowBlur = 20;
            ctx.beginPath();
            ctx.arc(vz.x, vz.y, vz.radius, 0, Math.PI * 2);
            ctx.fill();

            // Danger ring
            ctx.strokeStyle = '#ff0044';
            ctx.lineWidth = 2;
            ctx.globalAlpha = vzAlpha * 1.5;
            ctx.beginPath();
            ctx.arc(vz.x, vz.y, vz.radius, 0, Math.PI * 2);
            ctx.stroke();

            ctx.globalAlpha = 1;
        }

        // Laser beam
        if (boss.laserActive) {
            const laserLen = 800;
            const lx = boss.x + Math.cos(boss.laserAngle) * laserLen;
            const ly = boss.y + Math.sin(boss.laserAngle) * laserLen;

            // Beam glow
            ctx.strokeStyle = boss.color;
            ctx.shadowColor = boss.color;
            ctx.shadowBlur = 30;
            ctx.lineWidth = 8;
            ctx.globalAlpha = 0.3;
            ctx.beginPath();
            ctx.moveTo(boss.x, boss.y);
            ctx.lineTo(lx, ly);
            ctx.stroke();

            // Beam core
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 3;
            ctx.globalAlpha = 0.8;
            ctx.beginPath();
            ctx.moveTo(boss.x, boss.y);
            ctx.lineTo(lx, ly);
            ctx.stroke();
            ctx.globalAlpha = 1;
            ctx.shadowBlur = 0;

            // Check laser damage to player
            if (Game.Player && Game.Player.alive) {
                // Simple line-circle intersection
                const pDist = pointToLineDist(
                    Game.Player.x, Game.Player.y,
                    boss.x, boss.y, lx, ly
                );
                if (pDist < C().PLAYER_SIZE) {
                    Game.Player.takeDamage(boss.damage * 0.3);
                }
            }
        }

        // Main star/pentagram body
        let drawColor = boss.color;
        if (boss.flashTimer > 0 && Math.floor(boss.flashTimer) % 4 < 2) {
            drawColor = '#ffffff';
        }

        ctx.fillStyle = drawColor;
        ctx.shadowColor = drawColor;
        ctx.shadowBlur = 25;
        drawStar(ctx, boss.x, boss.y, size, boss.rotation, 5);
        ctx.fill();

        // Inner pulsating core
        ctx.fillStyle = '#ffffff';
        ctx.globalAlpha = 0.3 + 0.2 * Math.sin(boss.auraPhase * 4);
        drawStar(ctx, boss.x, boss.y, size * 0.4, -boss.rotation * 2, 5);
        ctx.fill();
        ctx.globalAlpha = 1;

        // Phase 2+: darker room effect (vignette overlay hint)
        if (boss.phase >= 2) {
            ctx.shadowBlur = 0;
        }
    }

    // Helper: point-to-line distance
    function pointToLineDist(px, py, x1, y1, x2, y2) {
        const A = px - x1;
        const B = py - y1;
        const C = x2 - x1;
        const D = y2 - y1;
        const dot = A * C + B * D;
        const lenSq = C * C + D * D;
        let t = lenSq > 0 ? dot / lenSq : -1;
        t = Math.max(0, Math.min(1, t));
        const nearX = x1 + t * C;
        const nearY = y1 + t * D;
        return Math.hypot(px - nearX, py - nearY);
    }

    const BOSS_DRAW = [drawWarden, drawSorcerer, drawVoidKing];

    // ══════════════════════════════════════════════════════════
    // MAIN MODULE
    // ══════════════════════════════════════════════════════════

    const Bosses = {
        // ── init ───────────────────────────────────────────────
        init() {
            activeBoss = null;
            bossProjectiles = [];
        },

        // ── spawn ──────────────────────────────────────────────
        spawn(level) {
            activeBoss = createBoss(level);
            if (activeBoss) {
                Game.state.bossActive = true;
                Game.state.bossDefeated = false;

                // Dramatic entrance shake
                U().screenShake(8, 15);

                // Entrance particles
                if (Game.Engine && Game.Engine.addParticle) {
                    for (let i = 0; i < 30; i++) {
                        const a = Math.random() * Math.PI * 2;
                        const spd = 1 + Math.random() * 4;
                        Game.Engine.addParticle({
                            x: activeBoss.x,
                            y: activeBoss.y,
                            vx: Math.cos(a) * spd,
                            vy: Math.sin(a) * spd,
                            life: 20 + Math.random() * 30,
                            color: activeBoss.color,
                            size: 3 + Math.random() * 5,
                        });
                    }
                }

                Game.Events.emit('boss-spawn', {
                    name: activeBoss.name,
                    level: level,
                });
            }
        },

        // ── update ─────────────────────────────────────────────
        update(dt) {
            dt = dt || 1;

            if (!activeBoss) return;

            // Death animation
            if (activeBoss.dying) {
                activeBoss.deathTimer -= dt;

                // Continuous explosion particles during death
                if (Game.Engine && Game.Engine.addParticle && Math.random() < 0.5) {
                    const a = Math.random() * Math.PI * 2;
                    Game.Engine.addParticle({
                        x: activeBoss.x + (Math.random() - 0.5) * activeBoss.size * 2,
                        y: activeBoss.y + (Math.random() - 0.5) * activeBoss.size * 2,
                        vx: Math.cos(a) * (1 + Math.random() * 4),
                        vy: Math.sin(a) * (1 + Math.random() * 4),
                        life: 15 + Math.random() * 20,
                        color: Math.random() > 0.5 ? '#ffffff' : activeBoss.color,
                        size: 3 + Math.random() * 5,
                    });
                }

                // Screen flash on final frame for Void King
                if (activeBoss.deathTimer <= 0) {
                    if (activeBoss.level === 2) {
                        // Massive final explosion
                        U().screenShake(20, 40);
                        if (Game.Engine && Game.Engine.addParticle) {
                            for (let i = 0; i < 80; i++) {
                                const a = Math.random() * Math.PI * 2;
                                const spd = 2 + Math.random() * 8;
                                Game.Engine.addParticle({
                                    x: activeBoss.x,
                                    y: activeBoss.y,
                                    vx: Math.cos(a) * spd,
                                    vy: Math.sin(a) * spd,
                                    life: 50 + Math.random() * 50,
                                    color: i % 3 === 0 ? '#ffffff' : activeBoss.color,
                                    size: 4 + Math.random() * 8,
                                });
                            }
                        }
                    }
                    activeBoss = null;
                    return;
                }
                return;
            }

            if (!activeBoss.alive) return;

            // Flash timer
            if (activeBoss.flashTimer > 0) {
                activeBoss.flashTimer -= dt;
            }

            // Death check
            if (activeBoss.hp <= 0) {
                onBossDeath(activeBoss);
                return;
            }

            // Phase check
            checkPhaseTransition(activeBoss);

            // AI per boss type
            const aiFn = BOSS_AI[activeBoss.level];
            if (aiFn) {
                aiFn(activeBoss, dt);
            }

            // Update local boss projectiles (fallback if enemy system not available)
            this._updateProjectiles(dt);
        },

        // ── local projectile update (fallback) ─────────────────
        _updateProjectiles(dt) {
            for (let i = bossProjectiles.length - 1; i >= 0; i--) {
                const p = bossProjectiles[i];
                p.x += p.vx * dt;
                p.y += p.vy * dt;
                p.life -= dt;

                // Hit player
                if (Game.Player && Game.Player.alive) {
                    const dist = U().dist(p, Game.Player);
                    if (dist < p.size + C().PLAYER_SIZE / 2) {
                        Game.Player.takeDamage(p.damage);
                        bossProjectiles.splice(i, 1);
                        continue;
                    }
                }

                if (p.life <= 0) {
                    bossProjectiles.splice(i, 1);
                }
            }
        },

        // ── draw ───────────────────────────────────────────────
        draw(ctx) {
            if (!activeBoss) return;

            ctx.save();

            // Draw aura
            drawBossAura(ctx, activeBoss);

            // Draw boss shape per type
            const drawFn = BOSS_DRAW[activeBoss.level];
            if (drawFn) {
                drawFn(ctx, activeBoss);
            }

            ctx.shadowBlur = 0;

            // Draw local boss projectiles
            for (const p of bossProjectiles) {
                ctx.fillStyle = p.color || activeBoss.color;
                ctx.shadowColor = p.color || activeBoss.color;
                ctx.shadowBlur = 8;
                ctx.beginPath();
                ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
                ctx.fill();

                ctx.fillStyle = '#ffffff';
                ctx.globalAlpha = 0.5;
                ctx.beginPath();
                ctx.arc(p.x, p.y, p.size * 0.4, 0, Math.PI * 2);
                ctx.fill();
                ctx.globalAlpha = 1;
            }

            ctx.shadowBlur = 0;

            // Death flash effect
            if (activeBoss.dying) {
                const flashAlpha = Math.max(0, 1 - activeBoss.deathTimer / 90) * 0.6;
                if (activeBoss.level === 2) {
                    ctx.fillStyle = `rgba(255, 255, 255, ${flashAlpha})`;
                    ctx.fillRect(
                        activeBoss.x - C().CANVAS_W,
                        activeBoss.y - C().CANVAS_H,
                        C().CANVAS_W * 2,
                        C().CANVAS_H * 2
                    );
                }
            }

            ctx.restore();
        },

        // ── getActive ──────────────────────────────────────────
        getActive() {
            return activeBoss;
        },

        // ── isAlive ────────────────────────────────────────────
        isAlive() {
            return activeBoss !== null && activeBoss.alive && !activeBoss.dying;
        },

        // ── takeDamage (called by collision system) ────────────
        takeDamage(amount) {
            if (!activeBoss || !activeBoss.alive) return;

            // Check shield orbs first (Sorcerer)
            if (activeBoss.level === 1) {
                for (const orb of activeBoss.shieldOrbs) {
                    if (orb.alive) {
                        orb.hp -= amount;
                        if (orb.hp <= 0) {
                            orb.alive = false;
                            // Orb destroyed particles
                            if (Game.Engine && Game.Engine.addParticle) {
                                for (let i = 0; i < 10; i++) {
                                    const a = Math.random() * Math.PI * 2;
                                    const ox = activeBoss.x + Math.cos(orb.angle) * orb.orbitRadius;
                                    const oy = activeBoss.y + Math.sin(orb.angle) * orb.orbitRadius;
                                    Game.Engine.addParticle({
                                        x: ox, y: oy,
                                        vx: Math.cos(a) * 3, vy: Math.sin(a) * 3,
                                        life: 20, color: activeBoss.colorAlt, size: 4,
                                    });
                                }
                            }
                        }
                        return; // Shield orb absorbed the hit
                    }
                }
            }

            activeBoss.hp -= amount;
            activeBoss.flashTimer = 8;

            // Screen shake on hit
            U().screenShake(4, 6);

            // Hit particles
            if (Game.Engine && Game.Engine.addParticle) {
                for (let i = 0; i < 5; i++) {
                    const a = Math.random() * Math.PI * 2;
                    Game.Engine.addParticle({
                        x: activeBoss.x + (Math.random() - 0.5) * activeBoss.size,
                        y: activeBoss.y + (Math.random() - 0.5) * activeBoss.size,
                        vx: Math.cos(a) * (2 + Math.random() * 3),
                        vy: Math.sin(a) * (2 + Math.random() * 3),
                        life: 12 + Math.random() * 12,
                        color: activeBoss.color,
                        size: 2 + Math.random() * 3,
                    });
                }
            }
        },

        // ── getBossProjectiles (for external collision checks) ─
        getBossProjectiles() {
            return bossProjectiles;
        },
    };

    // Register on global
    window.Game = window.Game || {};
    window.Game.Bosses = Bosses;

    console.log('[Bosses] Module loaded');
})();
