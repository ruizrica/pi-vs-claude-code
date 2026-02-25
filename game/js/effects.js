// effects.js — Visual Effects System
// Provides Game.Effects: screen flashes, explosions, floating text, trails, ambient particles.
// All effects are purely visual overlays.

(function () {
    'use strict';

    window.Game = window.Game || {};

    // Internal state
    let particles = [];   // explosion particles, trails
    let texts = [];        // floating damage/score text
    let flashes = [];      // screen flashes
    let ambients = [];     // ambient dust/ember particles

    // ========== Effect factories ==========

    function createExplosionParticle(x, y, color) {
        const angle = Math.random() * Math.PI * 2;
        const speed = 1.5 + Math.random() * 3.5;
        const maxLife = 25 + Math.floor(Math.random() * 20);
        return {
            type: 'explosion',
            x: x,
            y: y,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            life: maxLife,
            maxLife: maxLife,
            color: color,
            size: 2 + Math.random() * 3,
        };
    }

    function createTrailParticle(x, y, color) {
        return {
            type: 'trail',
            x: x,
            y: y,
            life: 20,
            maxLife: 20,
            color: color,
            size: 3,
        };
    }

    function createTextEffect(x, y, text, color) {
        return {
            type: 'text',
            x: x,
            y: y,
            text: String(text),
            color: color,
            life: 40,
            maxLife: 40,
        };
    }

    function createFlashEffect(color, duration) {
        return {
            type: 'flash',
            color: color,
            life: duration,
            maxLife: duration,
        };
    }

    function createAmbientParticle(bounds) {
        return {
            type: 'ambient',
            x: bounds.x + Math.random() * bounds.w,
            y: bounds.y + Math.random() * bounds.h,
            vx: (Math.random() - 0.5) * 0.3,
            vy: -0.2 - Math.random() * 0.3,
            life: 80 + Math.floor(Math.random() * 120),
            maxLife: 80 + Math.floor(Math.random() * 120),
            color: 'rgba(255,255,255,0.15)',
            size: 1 + Math.random() * 1.5,
            bounds: bounds,
        };
    }

    // ========== Helpers ==========

    function parseColor(color) {
        // Returns {r, g, b} from hex string like '#ff3366'
        if (color.startsWith('#')) {
            const hex = color.slice(1);
            const bigint = parseInt(hex.length === 3
                ? hex[0]+hex[0]+hex[1]+hex[1]+hex[2]+hex[2]
                : hex, 16);
            return {
                r: (bigint >> 16) & 255,
                g: (bigint >> 8) & 255,
                b: bigint & 255,
            };
        }
        return { r: 255, g: 255, b: 255 };
    }

    function rgba(color, alpha) {
        const c = typeof color === 'string' ? parseColor(color) : color;
        return `rgba(${c.r},${c.g},${c.b},${Math.max(0, Math.min(1, alpha))})`;
    }

    // ========== Public API ==========

    Game.Effects = {
        init: function () {
            particles = [];
            texts = [];
            flashes = [];
            ambients = [];
        },

        update: function () {
            // Update explosion & trail particles
            for (let i = particles.length - 1; i >= 0; i--) {
                const p = particles[i];
                p.life--;
                if (p.life <= 0) {
                    particles.splice(i, 1);
                    continue;
                }
                if (p.type === 'explosion') {
                    p.x += p.vx;
                    p.y += p.vy;
                    p.vy += 0.08; // gravity
                    const t = p.life / p.maxLife;
                    p.currentSize = p.size * t; // shrink
                }
                // trails just fade — no movement
            }

            // Update floating text
            for (let i = texts.length - 1; i >= 0; i--) {
                const t = texts[i];
                t.life--;
                t.y -= 1; // rise 1px per frame
                if (t.life <= 0) {
                    texts.splice(i, 1);
                }
            }

            // Update screen flashes
            for (let i = flashes.length - 1; i >= 0; i--) {
                flashes[i].life--;
                if (flashes[i].life <= 0) {
                    flashes.splice(i, 1);
                }
            }

            // Update ambient particles
            for (let i = ambients.length - 1; i >= 0; i--) {
                const a = ambients[i];
                a.life--;
                if (a.life <= 0) {
                    // Respawn within bounds
                    const b = a.bounds;
                    a.x = b.x + Math.random() * b.w;
                    a.y = b.y + Math.random() * b.h;
                    a.life = a.maxLife;
                    continue;
                }
                a.x += a.vx;
                a.y += a.vy;

                // Wrap within bounds
                const b = a.bounds;
                if (a.y < b.y) a.y = b.y + b.h;
                if (a.x < b.x) a.x = b.x + b.w;
                if (a.x > b.x + b.w) a.x = b.x;
            }
        },

        draw: function (ctx) {
            // Draw explosion & trail particles
            for (let i = 0; i < particles.length; i++) {
                const p = particles[i];
                const alpha = p.life / p.maxLife;

                if (p.type === 'explosion') {
                    const sz = p.currentSize || p.size * alpha;
                    ctx.globalAlpha = alpha;
                    ctx.fillStyle = p.color;
                    ctx.beginPath();
                    ctx.arc(p.x, p.y, Math.max(0.5, sz), 0, Math.PI * 2);
                    ctx.fill();
                } else if (p.type === 'trail') {
                    ctx.globalAlpha = alpha * 0.7;
                    ctx.fillStyle = p.color;
                    ctx.beginPath();
                    ctx.arc(p.x, p.y, p.size * alpha, 0, Math.PI * 2);
                    ctx.fill();
                }
            }

            // Draw floating text
            for (let i = 0; i < texts.length; i++) {
                const t = texts[i];
                const alpha = t.life / t.maxLife;
                ctx.globalAlpha = alpha;
                ctx.fillStyle = t.color;
                ctx.font = 'bold 14px monospace';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';

                // Shadow for readability
                ctx.shadowColor = 'rgba(0,0,0,0.7)';
                ctx.shadowBlur = 4;
                ctx.fillText(t.text, t.x, t.y);
                ctx.shadowBlur = 0;
            }

            // Draw ambient particles
            for (let i = 0; i < ambients.length; i++) {
                const a = ambients[i];
                const alpha = Math.min(a.life / a.maxLife, (a.maxLife - a.life) / 20) * 0.3;
                ctx.globalAlpha = Math.max(0, alpha);
                ctx.fillStyle = '#ffffff';
                ctx.beginPath();
                ctx.arc(a.x, a.y, a.size, 0, Math.PI * 2);
                ctx.fill();
            }

            // Draw screen flashes (full screen overlay — uses canvas dimensions)
            for (let i = 0; i < flashes.length; i++) {
                const f = flashes[i];
                const alpha = (f.life / f.maxLife) * 0.5; // fades from 0.5 → 0
                ctx.globalAlpha = Math.max(0, alpha);
                ctx.fillStyle = f.color;

                // Save & reset transform so flash covers full screen regardless of camera
                ctx.save();
                ctx.setTransform(1, 0, 0, 1, 0, 0);
                ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
                ctx.restore();
            }

            ctx.globalAlpha = 1;
            ctx.textAlign = 'start';
            ctx.textBaseline = 'alphabetic';
        },

        screenFlash: function (color, duration) {
            flashes.push(createFlashEffect(color, duration || 20));
        },

        spawnExplosion: function (x, y, color, count) {
            const n = count || 20;
            const c = color || '#ff6600';
            for (let i = 0; i < n; i++) {
                particles.push(createExplosionParticle(x, y, c));
            }
        },

        spawnText: function (x, y, text, color) {
            texts.push(createTextEffect(x, y, text, color || '#ffffff'));
        },

        addTrail: function (x, y, color) {
            particles.push(createTrailParticle(x, y, color || '#00ffff'));
        },

        addAmbient: function (bounds) {
            // Add 15-25 ambient particles within the given bounds
            const count = 15 + Math.floor(Math.random() * 11);
            for (let i = 0; i < count; i++) {
                ambients.push(createAmbientParticle(bounds));
            }
        },
    };
})();
