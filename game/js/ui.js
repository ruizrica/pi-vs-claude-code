/**
 * UI/HUD SYSTEM — All in-game and screen-state UI rendering
 * ===========================================================
 * Provides: window.Game.UI
 * Depends on: contracts.js (Game.CONST, Game.state, Game.Utils)
 *
 * Reads from (guarded):
 *   Game.Player      — hp, maxHp, dashCooldown
 *   Game.Enemies     — getAll(), count()
 *   Game.Bosses      — getActive()
 *   Game.Levels      — getCurrentTilemap()
 *   Game.Engine      — camera
 */
(function () {
    'use strict';

    const C = () => Game.CONST;
    const COLORS = () => C().COLORS;
    const W = 960;
    const H = 640;

    // ── INTERNAL STATE ─────────────────────────────────────────
    let menuParticles = [];
    let menuShapes = [];
    let hpFlashTimer = 0;
    let lastPlayerHp = -1;
    let frameCount = 0;

    // ── HELPERS ────────────────────────────────────────────────

    function now() { return performance.now() / 1000; }

    /** Draw a rounded rectangle */
    function roundRect(ctx, x, y, w, h, r) {
        r = Math.min(r, w / 2, h / 2);
        ctx.beginPath();
        ctx.moveTo(x + r, y);
        ctx.lineTo(x + w - r, y);
        ctx.arcTo(x + w, y, x + w, y + r, r);
        ctx.lineTo(x + w, y + h - r);
        ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
        ctx.lineTo(x + r, y + h);
        ctx.arcTo(x, y + h, x, y + h - r, r);
        ctx.lineTo(x, y + r);
        ctx.arcTo(x, y, x + r, y, r);
        ctx.closePath();
    }

    /** Format seconds as M:SS */
    function fmtTime(secs) {
        const m = Math.floor(secs / 60);
        const s = Math.floor(secs % 60);
        return `${m}:${s.toString().padStart(2, '0')}`;
    }

    // ── MENU PARTICLE SYSTEM ──────────────────────────────────

    function initMenuParticles() {
        menuParticles = [];
        for (let i = 0; i < 60; i++) {
            menuParticles.push({
                x: Math.random() * W,
                y: Math.random() * H,
                vx: (Math.random() - 0.5) * 0.3,
                vy: (Math.random() - 0.5) * 0.3,
                size: Math.random() * 2 + 0.5,
                alpha: Math.random() * 0.4 + 0.1,
            });
        }
    }

    function initMenuShapes() {
        menuShapes = [];
        const types = ['triangle', 'hexagon', 'diamond'];
        for (let i = 0; i < 8; i++) {
            menuShapes.push({
                x: Math.random() * W,
                y: Math.random() * H,
                vx: (Math.random() - 0.5) * 0.2,
                vy: (Math.random() - 0.5) * 0.15,
                rotation: Math.random() * Math.PI * 2,
                rotSpeed: (Math.random() - 0.5) * 0.01,
                size: Math.random() * 20 + 15,
                type: types[Math.floor(Math.random() * types.length)],
                alpha: Math.random() * 0.12 + 0.04,
            });
        }
    }

    function updateMenuParticles() {
        for (const p of menuParticles) {
            p.x += p.vx;
            p.y += p.vy;
            if (p.x < 0) p.x = W;
            if (p.x > W) p.x = 0;
            if (p.y < 0) p.y = H;
            if (p.y > H) p.y = 0;
        }
        for (const s of menuShapes) {
            s.x += s.vx;
            s.y += s.vy;
            s.rotation += s.rotSpeed;
            if (s.x < -50) s.x = W + 50;
            if (s.x > W + 50) s.x = -50;
            if (s.y < -50) s.y = H + 50;
            if (s.y > H + 50) s.y = -50;
        }
    }

    function drawMenuParticles(ctx) {
        updateMenuParticles();
        for (const p of menuParticles) {
            ctx.globalAlpha = p.alpha;
            ctx.fillStyle = COLORS().TEXT_DIM;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.globalAlpha = 1;
    }

    function drawMenuShapes(ctx) {
        for (const s of menuShapes) {
            ctx.save();
            ctx.globalAlpha = s.alpha;
            ctx.translate(s.x, s.y);
            ctx.rotate(s.rotation);
            ctx.strokeStyle = COLORS().PLAYER;
            ctx.lineWidth = 1;

            if (s.type === 'triangle') {
                ctx.beginPath();
                for (let i = 0; i < 3; i++) {
                    const a = (Math.PI * 2 / 3) * i - Math.PI / 2;
                    const px = Math.cos(a) * s.size;
                    const py = Math.sin(a) * s.size;
                    i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
                }
                ctx.closePath();
                ctx.stroke();
            } else if (s.type === 'hexagon') {
                ctx.beginPath();
                for (let i = 0; i < 6; i++) {
                    const a = (Math.PI * 2 / 6) * i;
                    const px = Math.cos(a) * s.size;
                    const py = Math.sin(a) * s.size;
                    i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
                }
                ctx.closePath();
                ctx.stroke();
            } else if (s.type === 'diamond') {
                ctx.beginPath();
                ctx.moveTo(0, -s.size);
                ctx.lineTo(s.size * 0.6, 0);
                ctx.lineTo(0, s.size);
                ctx.lineTo(-s.size * 0.6, 0);
                ctx.closePath();
                ctx.stroke();
            }

            ctx.restore();
        }
    }

    // ── MINIMAP ────────────────────────────────────────────────

    function drawMinimap(ctx) {
        const tilemap = Game.Levels?.getCurrentTilemap?.();
        if (!tilemap || tilemap.length === 0) return;

        const mmW = 120;
        const mmH = 80;
        const mmX = W - mmW - 12;
        const mmY = H - mmH - 12;
        const rows = tilemap.length;
        const cols = tilemap[0]?.length || 0;
        if (rows === 0 || cols === 0) return;

        const tileW = mmW / cols;
        const tileH = mmH / rows;

        // Background
        ctx.fillStyle = COLORS().MINIMAP_BG;
        roundRect(ctx, mmX - 4, mmY - 4, mmW + 8, mmH + 8, 4);
        ctx.fill();

        // Tiles
        for (let y = 0; y < rows; y++) {
            for (let x = 0; x < cols; x++) {
                const tile = tilemap[y][x];
                if (tile === 1) {
                    ctx.fillStyle = '#2a2a44';
                    ctx.fillRect(mmX + x * tileW, mmY + y * tileH, tileW + 0.5, tileH + 0.5);
                } else if (tile === 2) {
                    ctx.fillStyle = COLORS().DOOR_LOCKED;
                    ctx.fillRect(mmX + x * tileW, mmY + y * tileH, tileW + 0.5, tileH + 0.5);
                } else if (tile === 3) {
                    ctx.fillStyle = COLORS().DOOR;
                    ctx.fillRect(mmX + x * tileW, mmY + y * tileH, tileW + 0.5, tileH + 0.5);
                }
            }
        }

        const TS = C().TILE_SIZE;

        // Enemy dots
        const enemies = Game.Enemies?.getAll?.();
        if (enemies) {
            ctx.fillStyle = COLORS().ENEMY;
            for (const e of enemies) {
                const ex = mmX + (e.x / TS) * tileW;
                const ey = mmY + (e.y / TS) * tileH;
                ctx.fillRect(ex - 1, ey - 1, 2, 2);
            }
        }

        // Boss dot
        if (Game.state.bossActive) {
            const boss = Game.Bosses?.getActive?.();
            if (boss && boss.x !== undefined) {
                ctx.fillStyle = COLORS().BOSS_1;
                const bx = mmX + (boss.x / TS) * tileW;
                const by = mmY + (boss.y / TS) * tileH;
                ctx.fillRect(bx - 2, by - 2, 4, 4);
            }
        }

        // Player dot
        const px = Game.Player?.x;
        const py = Game.Player?.y;
        if (px !== undefined && py !== undefined) {
            ctx.fillStyle = COLORS().PLAYER;
            ctx.shadowColor = COLORS().PLAYER;
            ctx.shadowBlur = 4;
            const playerMmX = mmX + (px / TS) * tileW;
            const playerMmY = mmY + (py / TS) * tileH;
            ctx.fillRect(playerMmX - 1.5, playerMmY - 1.5, 3, 3);
            ctx.shadowBlur = 0;
        }

        // Border
        ctx.strokeStyle = '#333355';
        ctx.lineWidth = 1;
        roundRect(ctx, mmX - 4, mmY - 4, mmW + 8, mmH + 8, 4);
        ctx.stroke();
    }

    // ── THE UI MODULE ──────────────────────────────────────────

    const UI = {

        // ────────────────────────────────────────────────────────
        // INIT
        // ────────────────────────────────────────────────────────
        init() {
            frameCount = 0;
            hpFlashTimer = 0;
            lastPlayerHp = Game.Player?.hp ?? -1;
            initMenuParticles();
            initMenuShapes();
        },

        // ────────────────────────────────────────────────────────
        // DRAW — main dispatcher
        // ────────────────────────────────────────────────────────
        draw(ctx) {
            ctx.save();
            frameCount++;

            const screen = Game.state.screen;

            switch (screen) {
                case 'menu':
                    this.drawMenu(ctx);
                    break;
                case 'playing':
                    this.drawHUD(ctx);
                    break;
                case 'paused':
                    this.drawHUD(ctx);
                    this.drawPause(ctx);
                    break;
                case 'gameover':
                    this.drawGameOver(ctx);
                    break;
                case 'victory':
                    this.drawVictory(ctx);
                    break;
                case 'levelcomplete':
                    this.drawHUD(ctx);
                    this.drawLevelComplete(ctx);
                    break;
            }

            // Restore all canvas state
            ctx.restore();
            ctx.globalAlpha = 1;
            ctx.shadowBlur = 0;
            ctx.shadowColor = 'transparent';
        },

        // ────────────────────────────────────────────────────────
        // MAIN MENU
        // ────────────────────────────────────────────────────────
        drawMenu(ctx) {
            const t = now();

            // Dark background
            ctx.fillStyle = COLORS().BG;
            ctx.fillRect(0, 0, W, H);

            // Animated particles & shapes
            drawMenuParticles(ctx);
            drawMenuShapes(ctx);

            // Vignette overlay
            const grad = ctx.createRadialGradient(W / 2, H / 2, W * 0.2, W / 2, H / 2, W * 0.7);
            grad.addColorStop(0, 'transparent');
            grad.addColorStop(1, 'rgba(0, 0, 0, 0.6)');
            ctx.fillStyle = grad;
            ctx.fillRect(0, 0, W, H);

            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';

            // Title glow
            ctx.shadowColor = COLORS().PLAYER;
            ctx.shadowBlur = 40;
            ctx.fillStyle = COLORS().PLAYER;
            ctx.font = 'bold 56px monospace';
            ctx.fillText('DARK DESCENT', W / 2, H * 0.28);
            // Double-draw for stronger glow
            ctx.shadowBlur = 60;
            ctx.fillText('DARK DESCENT', W / 2, H * 0.28);
            ctx.shadowBlur = 0;

            // Subtitle
            ctx.fillStyle = COLORS().TEXT_DIM;
            ctx.font = '18px monospace';
            ctx.fillText('A Dungeon of Shadows', W / 2, H * 0.28 + 50);

            // Decorative line
            ctx.strokeStyle = COLORS().PLAYER;
            ctx.globalAlpha = 0.2;
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(W * 0.3, H * 0.28 + 75);
            ctx.lineTo(W * 0.7, H * 0.28 + 75);
            ctx.stroke();
            ctx.globalAlpha = 1;

            // "Press ENTER to Start" — pulsing
            const pulse = 0.4 + 0.6 * Math.sin(t * 3);
            ctx.globalAlpha = pulse;
            ctx.shadowColor = COLORS().PLAYER;
            ctx.shadowBlur = 15;
            ctx.fillStyle = '#ffffff';
            ctx.font = 'bold 22px monospace';
            ctx.fillText('Press ENTER to Start', W / 2, H * 0.58);
            ctx.shadowBlur = 0;
            ctx.globalAlpha = 1;

            // Controls hint
            ctx.fillStyle = COLORS().TEXT_DIM;
            ctx.font = '13px monospace';
            ctx.fillText(
                'WASD to Move  |  Mouse to Aim/Shoot  |  SPACE to Dash  |  ESC to Pause',
                W / 2,
                H - 50
            );

            // Version / credit
            ctx.globalAlpha = 0.3;
            ctx.font = '11px monospace';
            ctx.fillText('v1.0', W / 2, H - 25);
            ctx.globalAlpha = 1;
        },

        // ────────────────────────────────────────────────────────
        // IN-GAME HUD
        // ────────────────────────────────────────────────────────
        drawHUD(ctx) {
            const colors = COLORS();

            // ── HP damage flash detection ──────────────
            const currentHp = Game.Player?.hp ?? 0;
            if (lastPlayerHp >= 0 && currentHp < lastPlayerHp) {
                hpFlashTimer = 20; // frames
            }
            lastPlayerHp = currentHp;
            if (hpFlashTimer > 0) hpFlashTimer--;

            // ── TOP-LEFT: HP Bar ───────────────────────
            {
                const hp = Game.Player?.hp ?? 0;
                const maxHp = Game.Player?.maxHp ?? C().PLAYER_MAX_HP;
                const ratio = Math.max(0, Math.min(1, hp / maxHp));

                const barX = 16;
                const barY = 16;
                const barW = 220;
                const barH = 22;
                const r = 6;

                // Background
                ctx.fillStyle = colors.HP_BAR_BG;
                roundRect(ctx, barX, barY, barW, barH, r);
                ctx.fill();

                // Fill
                if (ratio > 0) {
                    const fillColor = hpFlashTimer > 0 ? '#ff2244' : colors.HP_BAR;
                    ctx.fillStyle = fillColor;
                    // Glow when flashing
                    if (hpFlashTimer > 0) {
                        ctx.shadowColor = '#ff2244';
                        ctx.shadowBlur = 10;
                    }
                    roundRect(ctx, barX, barY, barW * ratio, barH, r);
                    ctx.fill();
                    ctx.shadowBlur = 0;
                }

                // Border
                ctx.strokeStyle = '#333355';
                ctx.lineWidth = 1;
                roundRect(ctx, barX, barY, barW, barH, r);
                ctx.stroke();

                // Text overlay
                ctx.fillStyle = '#ffffff';
                ctx.font = 'bold 12px monospace';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText(`${Math.ceil(hp)} / ${maxHp}`, barX + barW / 2, barY + barH / 2);
            }

            // ── TOP-RIGHT: Score & Kills ───────────────
            {
                ctx.textAlign = 'right';
                ctx.textBaseline = 'top';

                ctx.fillStyle = colors.XP;
                ctx.shadowColor = colors.XP;
                ctx.shadowBlur = 6;
                ctx.font = 'bold 18px monospace';
                ctx.fillText(`SCORE: ${Game.state.score}`, W - 20, 16);
                ctx.shadowBlur = 0;

                ctx.fillStyle = colors.TEXT;
                ctx.font = '14px monospace';
                ctx.fillText(`KILLS: ${Game.state.kills}`, W - 20, 40);
            }

            // ── TOP-CENTER: Level Name ─────────────────
            {
                const themes = C().LEVEL_THEMES;
                const lvl = Game.state.level ?? 0;
                const name = themes?.[lvl]?.name ?? `Level ${lvl + 1}`;

                ctx.textAlign = 'center';
                ctx.textBaseline = 'top';
                ctx.fillStyle = colors.TEXT_DIM;
                ctx.font = '14px monospace';
                ctx.fillText(name, W / 2, 16);
            }

            // ── ENEMY COUNTER ──────────────────────────
            {
                const remaining = Game.state.enemiesRemaining ?? 0;
                const total = Game.state.totalEnemies ?? 0;

                ctx.textAlign = 'left';
                ctx.textBaseline = 'top';
                ctx.fillStyle = colors.TEXT_DIM;
                ctx.font = '12px monospace';
                ctx.fillText(`Enemies: ${remaining}/${total}`, 16, 50);
            }

            // ── BOTTOM-CENTER: Dash Cooldown ───────────
            {
                const cd = Game.Player?.dashCooldown ?? 0;
                const maxCd = C().PLAYER_DASH_COOLDOWN;
                const ratio = maxCd > 0 ? Math.max(0, Math.min(1, cd / maxCd)) : 0;
                const ready = cd <= 0;

                const cx = W / 2;
                const cy = H - 36;
                const radius = 16;

                // Background circle
                ctx.beginPath();
                ctx.arc(cx, cy, radius, 0, Math.PI * 2);
                ctx.fillStyle = 'rgba(10,10,15,0.7)';
                ctx.fill();

                // Cooldown arc (fills clockwise as CD recovers)
                if (ready) {
                    ctx.beginPath();
                    ctx.arc(cx, cy, radius - 2, 0, Math.PI * 2);
                    ctx.fillStyle = colors.PLAYER;
                    ctx.globalAlpha = 0.4 + 0.3 * Math.sin(now() * 4);
                    ctx.fill();
                    ctx.globalAlpha = 1;
                } else {
                    // Draw remaining arc
                    const fillRatio = 1 - ratio;
                    ctx.beginPath();
                    ctx.moveTo(cx, cy);
                    ctx.arc(cx, cy, radius - 2, -Math.PI / 2, -Math.PI / 2 + fillRatio * Math.PI * 2);
                    ctx.closePath();
                    ctx.fillStyle = colors.DASH_TRAIL;
                    ctx.fill();
                }

                // Border
                ctx.beginPath();
                ctx.arc(cx, cy, radius, 0, Math.PI * 2);
                ctx.strokeStyle = '#333355';
                ctx.lineWidth = 1;
                ctx.stroke();

                // Label
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillStyle = ready ? colors.PLAYER : colors.TEXT_DIM;
                ctx.font = 'bold 9px monospace';
                ctx.fillText('DASH', cx, cy);
            }

            // ── BOSS HP BAR ────────────────────────────
            if (Game.state.bossActive) {
                const boss = Game.Bosses?.getActive?.();
                if (boss && boss.hp !== undefined && boss.maxHp !== undefined) {
                    const ratio = Math.max(0, Math.min(1, boss.hp / boss.maxHp));

                    const barW = 400;
                    const barH = 18;
                    const barX = (W - barW) / 2;
                    const barY = H - 80;
                    const r = 5;

                    // Boss name
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'bottom';
                    ctx.fillStyle = colors.BOSS_HP;
                    ctx.shadowColor = colors.BOSS_HP;
                    ctx.shadowBlur = 10;
                    ctx.font = 'bold 16px monospace';
                    ctx.fillText(boss.name || 'BOSS', W / 2, barY - 6);
                    ctx.shadowBlur = 0;

                    // Background
                    ctx.fillStyle = colors.HP_BAR_BG;
                    roundRect(ctx, barX, barY, barW, barH, r);
                    ctx.fill();

                    // Fill — animated shimmer
                    if (ratio > 0) {
                        const shimmer = 0.85 + 0.15 * Math.sin(now() * 6);
                        ctx.fillStyle = colors.BOSS_HP;
                        ctx.globalAlpha = shimmer;
                        ctx.shadowColor = colors.BOSS_HP;
                        ctx.shadowBlur = 8;
                        roundRect(ctx, barX, barY, barW * ratio, barH, r);
                        ctx.fill();
                        ctx.shadowBlur = 0;
                        ctx.globalAlpha = 1;
                    }

                    // Border
                    ctx.strokeStyle = '#553344';
                    ctx.lineWidth = 1;
                    roundRect(ctx, barX, barY, barW, barH, r);
                    ctx.stroke();

                    // HP text
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'middle';
                    ctx.fillStyle = '#ffffff';
                    ctx.font = 'bold 11px monospace';
                    ctx.fillText(
                        `${Math.ceil(boss.hp)} / ${boss.maxHp}`,
                        W / 2,
                        barY + barH / 2
                    );
                }
            }

            // ── MINIMAP ────────────────────────────────
            drawMinimap(ctx);
        },

        // ────────────────────────────────────────────────────────
        // PAUSE SCREEN
        // ────────────────────────────────────────────────────────
        drawPause(ctx) {
            // Semi-transparent overlay
            ctx.fillStyle = 'rgba(5, 5, 10, 0.7)';
            ctx.fillRect(0, 0, W, H);

            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';

            // "PAUSED"
            ctx.shadowColor = COLORS().PLAYER;
            ctx.shadowBlur = 25;
            ctx.fillStyle = COLORS().PLAYER;
            ctx.font = 'bold 42px monospace';
            ctx.fillText('PAUSED', W / 2, H / 2 - 20);
            ctx.shadowBlur = 0;

            // Hint
            ctx.fillStyle = COLORS().TEXT_DIM;
            ctx.font = '16px monospace';
            ctx.fillText('Press ESC to Resume', W / 2, H / 2 + 30);
        },

        // ────────────────────────────────────────────────────────
        // GAME OVER
        // ────────────────────────────────────────────────────────
        drawGameOver(ctx) {
            const t = now();

            // Dark red overlay
            ctx.fillStyle = 'rgba(30, 5, 5, 0.85)';
            ctx.fillRect(0, 0, W, H);

            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';

            // "GAME OVER" with glitch/shake
            const shakeX = Math.sin(t * 37) * 2 * Math.sin(t * 7);
            const shakeY = Math.cos(t * 29) * 1.5 * Math.sin(t * 11);

            // Glitch red shadow
            ctx.shadowColor = '#ff0033';
            ctx.shadowBlur = 35;
            ctx.fillStyle = COLORS().ENEMY;
            ctx.font = 'bold 52px monospace';
            ctx.fillText('GAME OVER', W / 2 + shakeX, H * 0.28 + shakeY);
            // Second pass offset for glitch
            ctx.globalAlpha = 0.3;
            ctx.fillStyle = '#ff0000';
            ctx.fillText('GAME OVER', W / 2 + shakeX + 3, H * 0.28 + shakeY - 2);
            ctx.globalAlpha = 1;
            ctx.shadowBlur = 0;

            // Stats
            const statY = H * 0.45;
            const lineH = 32;
            ctx.fillStyle = COLORS().TEXT;
            ctx.font = '18px monospace';
            ctx.fillText(`Score: ${Game.state.score}`, W / 2, statY);
            ctx.fillText(`Kills: ${Game.state.kills}`, W / 2, statY + lineH);
            ctx.fillText(`Level Reached: ${(Game.state.level ?? 0) + 1}`, W / 2, statY + lineH * 2);
            ctx.fillText(`Time Survived: ${fmtTime(Game.state.time ?? 0)}`, W / 2, statY + lineH * 3);

            // Retry prompt
            const pulse = 0.4 + 0.6 * Math.sin(t * 3);
            ctx.globalAlpha = pulse;
            ctx.fillStyle = '#ffffff';
            ctx.font = 'bold 20px monospace';
            ctx.fillText('Press ENTER to Retry', W / 2, H * 0.78);
            ctx.globalAlpha = 1;
        },

        // ────────────────────────────────────────────────────────
        // VICTORY
        // ────────────────────────────────────────────────────────
        drawVictory(ctx) {
            const t = now();

            // Dark overlay with gold tint
            ctx.fillStyle = 'rgba(10, 8, 2, 0.85)';
            ctx.fillRect(0, 0, W, H);

            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';

            // "VICTORY" with radiant glow
            const glow = 30 + 15 * Math.sin(t * 2);
            ctx.shadowColor = COLORS().XP;
            ctx.shadowBlur = glow;
            ctx.fillStyle = COLORS().XP;
            ctx.font = 'bold 56px monospace';
            ctx.fillText('VICTORY', W / 2, H * 0.25);
            // Second glow layer (cyan accent)
            ctx.shadowColor = COLORS().PLAYER;
            ctx.shadowBlur = glow * 0.6;
            ctx.globalAlpha = 0.4;
            ctx.fillText('VICTORY', W / 2, H * 0.25);
            ctx.globalAlpha = 1;
            ctx.shadowBlur = 0;

            // Subtitle
            ctx.fillStyle = COLORS().TEXT_DIM;
            ctx.font = '16px monospace';
            ctx.fillText('You have conquered the darkness!', W / 2, H * 0.25 + 50);

            // Stats
            const statY = H * 0.45;
            const lineH = 32;
            ctx.fillStyle = COLORS().TEXT;
            ctx.font = '18px monospace';
            ctx.fillText(`Final Score: ${Game.state.score}`, W / 2, statY);
            ctx.fillText(`Total Kills: ${Game.state.kills}`, W / 2, statY + lineH);
            ctx.fillText(`Levels Cleared: ${(Game.state.level ?? 0) + 1}`, W / 2, statY + lineH * 2);
            ctx.fillText(`Total Time: ${fmtTime(Game.state.time ?? 0)}`, W / 2, statY + lineH * 3);

            // Play again prompt
            const pulse = 0.4 + 0.6 * Math.sin(t * 3);
            ctx.globalAlpha = pulse;
            ctx.fillStyle = COLORS().XP;
            ctx.shadowColor = COLORS().XP;
            ctx.shadowBlur = 10;
            ctx.font = 'bold 20px monospace';
            ctx.fillText('Press ENTER to Play Again', W / 2, H * 0.82);
            ctx.shadowBlur = 0;
            ctx.globalAlpha = 1;
        },

        // ────────────────────────────────────────────────────────
        // LEVEL COMPLETE
        // ────────────────────────────────────────────────────────
        drawLevelComplete(ctx) {
            const t = now();

            // Semi-transparent overlay
            ctx.fillStyle = 'rgba(5, 5, 10, 0.75)';
            ctx.fillRect(0, 0, W, H);

            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';

            // Level name
            const lvl = (Game.state.level ?? 0);
            const themes = C().LEVEL_THEMES;
            const name = themes?.[lvl]?.name ?? `Level ${lvl + 1}`;

            // Glow text
            ctx.shadowColor = COLORS().DOOR;
            ctx.shadowBlur = 25;
            ctx.fillStyle = COLORS().DOOR;
            ctx.font = 'bold 38px monospace';
            ctx.fillText(`LEVEL ${lvl + 1} COMPLETE`, W / 2, H / 2 - 30);
            ctx.shadowBlur = 0;

            // Level name
            ctx.fillStyle = COLORS().TEXT_DIM;
            ctx.font = '18px monospace';
            ctx.fillText(name, W / 2, H / 2 + 10);

            // Score bonus
            const bonus = 500 * (lvl + 1);
            const pulse = 0.5 + 0.5 * Math.sin(t * 4);
            ctx.globalAlpha = pulse;
            ctx.fillStyle = COLORS().XP;
            ctx.shadowColor = COLORS().XP;
            ctx.shadowBlur = 8;
            ctx.font = 'bold 22px monospace';
            ctx.fillText(`+${bonus} BONUS`, W / 2, H / 2 + 50);
            ctx.shadowBlur = 0;
            ctx.globalAlpha = 1;
        },
    };

    // Register on global
    window.Game = window.Game || {};
    window.Game.UI = UI;

    console.log('[UI] Module loaded');
})();
