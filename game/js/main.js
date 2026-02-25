/**
 * MAIN ENTRY POINT — Game initialization and flow control
 * =========================================================
 * Provides: window.Game.Main
 * Depends on: All other modules (loaded last)
 */
(function () {
    'use strict';

    window.Game = window.Game || {};

    window.Game.Main = {

        // ────────────────────────────────────────────────────────
        // INIT — called once on page load
        // ────────────────────────────────────────────────────────
        init() {
            const canvas = document.getElementById('gameCanvas');
            if (!canvas) {
                console.error('[Game] Canvas #gameCanvas not found!');
                return;
            }

            // Initialize subsystems (guard each)
            if (Game.Engine?.init) Game.Engine.init(canvas);
            if (Game.Effects?.init) Game.Effects.init();
            if (Game.UI?.init) Game.UI.init();

            Game.state.screen = 'menu';

            if (Game.Engine?.start) Game.Engine.start();

            // ── Event listeners for game flow ──────────

            Game.Events.on('boss-defeated', () => {
                Game.state.bossActive = false;
                Game.state.bossDefeated = true;
                Game.state.score += 1000;
            });

            Game.Events.on('level-complete', () => {
                Game.state.screen = 'levelcomplete';
                setTimeout(() => {
                    if (Game.state.level >= 2) {
                        Game.state.screen = 'victory';
                    } else {
                        Game.state.level++;
                        Game.Main.startLevel(Game.state.level);
                    }
                }, 3000);
            });

            Game.Events.on('player-death', () => {
                Game.state.screen = 'gameover';
            });

            Game.Events.on('enemy-killed', (data) => {
                Game.state.kills++;
                Game.state.score += (data && data.score) || 100;
                if (Game.Enemies?.count) {
                    Game.state.enemiesRemaining = Game.Enemies.count();
                }
            });

            console.log('[Game] Initialized!');
        },

        // ────────────────────────────────────────────────────────
        // START GAME — transition from menu to first level
        // ────────────────────────────────────────────────────────
        startGame() {
            Game.state.screen = 'playing';
            Game.state.level = 0;
            Game.state.score = 0;
            Game.state.kills = 0;
            Game.state.time = 0;
            Game.Main.startLevel(0);
        },

        // ────────────────────────────────────────────────────────
        // START LEVEL — load and initialize a specific level
        // ────────────────────────────────────────────────────────
        startLevel(level) {
            Game.state.level = level;
            Game.state.bossActive = false;
            Game.state.bossDefeated = false;
            Game.state.screen = 'playing';

            if (Game.Levels?.loadLevel) Game.Levels.loadLevel(level);
            if (Game.Enemies?.init) Game.Enemies.init();
            if (Game.Bosses?.init) Game.Bosses.init();
            if (Game.Player?.init) Game.Player.init();

            // Place player at spawn
            if (Game.Levels?.getPlayerSpawn && Game.Player) {
                const spawn = Game.Levels.getPlayerSpawn();
                Game.Player.x = spawn.x;
                Game.Player.y = spawn.y;
            }

            if (Game.Effects?.init) Game.Effects.init();
        },
    };

    // Auto-start when page loads
    window.addEventListener('load', () => Game.Main.init());

    console.log('[Main] Module loaded');
})();
