/**
 * SLOT MACHINE - 3-Reel Casino Engine + UI
 * No ES modules, direct file:// compatible
 */

// ============================================================
// CONFIG & SYMBOLS
// ============================================================

var SYMBOLS = [{
        id: 'seven',
        emoji: '7️⃣',
        name: 'Sept',
        multiplier: 50
    },
    {
        id: 'diamond',
        emoji: '💎',
        name: 'Diamant',
        multiplier: 30
    },
    {
        id: 'bell',
        emoji: '🔔',
        name: 'Cloche',
        multiplier: 20
    },
    {
        id: 'cherry',
        emoji: '🍒',
        name: 'Cerise',
        multiplier: 15
    },
    {
        id: 'lemon',
        emoji: '🍋',
        name: 'Citron',
        multiplier: 10
    },
    {
        id: 'grape',
        emoji: '🍇',
        name: 'Raisin',
        multiplier: 8
    },
    {
        id: 'watermelon',
        emoji: '🍉',
        name: 'Pastèque',
        multiplier: 5
    },
    {
        id: 'apple',
        emoji: '🍎',
        name: 'Pomme',
        multiplier: 3
    }
];

var REEL_LENGTH = 30; // Number of symbols per reel strip
var SYMBOL_HEIGHT = 70; // px, must match CSS .reel-symbol height
var VISIBLE_SYMBOLS = 3;
var SPIN_DURATION_BASE = 2000; // ms
var SPIN_DURATION_STEP = 500; // Extra delay per reel
var NUM_CHASER_LIGHTS = 20;

// ============================================================
// SLOT ENGINE (Pure logic, no DOM)
// ============================================================

var SlotEngine = {
    credits: 100,
    bet: 10,
    minBet: 5,
    maxBet: 1e20000,
    betStep: 5,
    isSpinning: false,

    /** Generate a random reel strip */
    generateStrip: function () {
        var strip = [];
        for (var i = 0; i < REEL_LENGTH; i++) {
            // Weighted: rarer symbols appear less often
            var weightedPool = [];
            SYMBOLS.forEach(function (s) {
                // Inverse weight: higher multiplier = fewer copies in pool
                var count = Math.max(1, Math.round(60 / s.multiplier));
                for (var j = 0; j < count; j++) {
                    weightedPool.push(s);
                }
            });
            strip.push(weightedPool[Math.floor(Math.random() * weightedPool.length)]);
        }
        return strip;
    },

    /** Spin and get result for 3 reels */
    spin: function () {
        if (this.isSpinning) return null;
        if (this.credits < this.bet) return null;

        this.isSpinning = true;
        this.credits -= this.bet;

        // Generate 3 reel strips
        var reels = [
            this.generateStrip(),
            this.generateStrip(),
            this.generateStrip()
        ];

        // The "result" is the center symbol of each stopped reel
        var targetIndices = [
            Math.floor(Math.random() * (REEL_LENGTH - VISIBLE_SYMBOLS)),
            Math.floor(Math.random() * (REEL_LENGTH - VISIBLE_SYMBOLS)),
            Math.floor(Math.random() * (REEL_LENGTH - VISIBLE_SYMBOLS))
        ];

        // --- OUTCOME RNG ENGINE ---
        var rnd = Math.random();
        var centerSymbols = [];
        var pool = SYMBOLS.map(function (s) {
            return s;
        });

        if (rnd < 0.65) {
            // LOSE (65%): 3 different symbols (no cherry)
            var noCherryPool = pool.filter(function (s) { return s.id !== 'cherry'; });
            noCherryPool.sort(function () { return 0.5 - Math.random(); });
            centerSymbols = [noCherryPool[0], noCherryPool[1], noCherryPool[2]];
        } else if (rnd < 0.85) {
            // SMALL WIN (20%): 1 cherry, 2 distinct non-cherries
            var noCherryPool = pool.filter(function (s) {
                return s.id !== 'cherry';
            });
            noCherryPool.sort(function () {
                return 0.5 - Math.random();
            });
            var cherry = pool.find(function (s) {
                return s.id === 'cherry';
            });
            centerSymbols = [noCherryPool[0], noCherryPool[1], cherry];
            centerSymbols.sort(function () { return 0.5 - Math.random(); });
        }
        else if (rnd < 0.96) {
            // MEDIUM WIN (11%): 2 matches
            var weightedPool = [];
            pool.forEach(function (s) {
                var weight = Math.max(1, Math.round(50 / s.multiplier)); // lower multiplier = more common
                for (var i = 0; i < weight; i++) weightedPool.push(s);
            });
            var matchSym = weightedPool[Math.floor(Math.random() * weightedPool.length)];
            var distinctPool = pool.filter(function (s) { return s.id !== matchSym.id && s.id !== 'cherry'; });
            if (distinctPool.length === 0) distinctPool = pool;
            var otherSym = distinctPool[Math.floor(Math.random() * distinctPool.length)];
            centerSymbols = [matchSym, matchSym, otherSym];
            centerSymbols.sort(function () { return 0.5 - Math.random(); });
        }
        else if (rnd < 0.995) {
            // BIG WIN (3.5%): 3 matches of anything but 'seven'
            var noJackpotPool = pool.filter(function (s) { return s.id !== 'seven'; });
            var weightedPool = [];
            noJackpotPool.forEach(function (s) {
                var weight = Math.max(1, Math.round(30 / s.multiplier));
                for (var i = 0; i < weight; i++) weightedPool.push(s);
            });
            var matchSym = weightedPool[Math.floor(Math.random() * weightedPool.length)];
            centerSymbols = [matchSym, matchSym, matchSym];
        }
        else {
            // JACKPOT (0.5%): 3 Sevens
            var seven = pool.find(function (s) { return s.id === 'seven'; });
            centerSymbols = [seven, seven, seven];
        }

        // Force the chosen symbols into the animation target spots
        reels[0][targetIndices[0] + 1] = centerSymbols[0];
        reels[1][targetIndices[1] + 1] = centerSymbols[1];
        reels[2][targetIndices[2] + 1] = centerSymbols[2];

        return {
            reels: reels,
            targetIndices: targetIndices,
            centerSymbols: centerSymbols,
            payout: this.calculatePayout(centerSymbols)
        };
    },

    calculatePayout: function (symbols) {
        var a = symbols[0], b = symbols[1], c = symbols[2];

        // 3 of a kind
        if (a.id === b.id && b.id === c.id) {
            return { type: 'jackpot', multiplier: a.multiplier, amount: this.bet * a.multiplier };
        }

        // 2 of a kind
        if (a.id === b.id || b.id === c.id || a.id === c.id) {
            var matchSymbol = (a.id === b.id) ? a : c;
            var mult = Math.max(2, Math.round(matchSymbol.multiplier / 5));
            return { type: 'win', multiplier: mult, amount: this.bet * mult };
        }

        // Any cherry = small win
        if (a.id === 'cherry' || b.id === 'cherry' || c.id === 'cherry') {
            return { type: 'small', multiplier: 1, amount: this.bet };
        }

        return { type: 'lose', multiplier: 0, amount: 0 };
    },

    finishSpin: function (payout) {
        this.credits += payout.amount;
        this.isSpinning = false;
    },

    setBet: function (delta) {
        var newBet = this.bet + delta;
        if (newBet >= this.minBet && newBet <= this.maxBet && newBet <= this.credits) {
            this.bet = newBet;
        }
    },

    setMaxBet: function () {
        this.bet = Math.min(this.maxBet, this.credits);
        if (this.bet < this.minBet) this.bet = this.minBet;
    }
};

// ============================================================
// SLOT UI (DOM, Animations, Sound)
// ============================================================

var SlotUI = {
    reelEls: [],
    reelStrips: [[], [], []],
    history: [],

    init: function () {
        var self = this;

        this.reelEls = [
            document.getElementById('reel-1'),
            document.getElementById('reel-2'),
            document.getElementById('reel-3')
        ];
        this.spinBtn = document.getElementById('spin-btn');
        this.creditsEl = document.getElementById('credits');
        this.betEl = document.getElementById('bet-amount');
        this.winEl = document.getElementById('win-amount');
        this.resultEl = document.getElementById('result-message');
        this.machineEl = document.getElementById('machine');
        this.jackpotAmountEl = document.getElementById('jackpot-amount');

        // Audio
        this.spinSound = document.getElementById('spin-sound');
        this.winSound = document.getElementById('win-sound');
        this.loseSound = document.getElementById('lose-sound');

        if (!this.spinBtn) return;

        // Responsive symbol height
        this.updateSymbolHeight();
        window.addEventListener('resize', function () { self.updateSymbolHeight(); });

        this.buildChaserLights();
        this.buildInitialReels();
        this.buildPaytable();
        this.bindEvents();
        this.bindHistoryEvents();
        this.updateDisplay();
        this.startChaserAnimation();
    },

    // --- Chaser Lights ---
    buildChaserLights: function () {
        var colors = ['#ff1744', '#ffd700', '#00e5ff', '#ff2d75', '#39ff14', '#b388ff'];
        var topRow = document.getElementById('chaser-lights-top');
        var bottomRow = document.getElementById('chaser-lights-bottom');

        for (var i = 0; i < NUM_CHASER_LIGHTS; i++) {
            var light1 = document.createElement('div');
            light1.className = 'chaser-light';
            light1.style.color = colors[i % colors.length];
            light1.style.backgroundColor = colors[i % colors.length];
            topRow.appendChild(light1);

            var light2 = document.createElement('div');
            light2.className = 'chaser-light';
            light2.style.color = colors[(i + 3) % colors.length];
            light2.style.backgroundColor = colors[(i + 3) % colors.length];
            bottomRow.appendChild(light2);
        }

        this.chaserLightsTop = topRow.children;
        this.chaserLightsBottom = bottomRow.children;
    },

    startChaserAnimation: function () {
        var self = this;
        var step = 0;
        setInterval(function () {
            for (var i = 0; i < self.chaserLightsTop.length; i++) {
                var isOn = (i + step) % 3 === 0;
                self.chaserLightsTop[i].className = 'chaser-light ' + (isOn ? 'chaser-light--on' : 'chaser-light--off');
                self.chaserLightsBottom[i].className = 'chaser-light ' + ((i + step + 1) % 3 === 0 ? 'chaser-light--on' : 'chaser-light--off');
            }
            step++;
        }, 200);
    },

    // --- Reels ---
    buildInitialReels: function () {
        for (var r = 0; r < 3; r++) {
            this.reelStrips[r] = SlotEngine.generateStrip();
            this.renderReel(r, this.reelStrips[r]);
            // Position to show first 3 symbols centered
            this.reelEls[r].style.transition = 'none';
            this.reelEls[r].style.transform = 'translateY(' + this.getOffset(1) + 'px)';
        }
    },

    renderReel: function (reelIndex, strip) {
        var reel = this.reelEls[reelIndex];
        reel.innerHTML = '';
        for (var i = 0; i < strip.length; i++) {
            var el = document.createElement('div');
            el.className = 'reel-symbol';
            el.textContent = strip[i].emoji;
            el.setAttribute('data-symbol', strip[i].id);
            reel.appendChild(el);
        }
    },

    getOffset: function (centerIndex) {
        // Center the symbol at centerIndex in the visible window (3 symbols visible)
        var windowHeight = SYMBOL_HEIGHT * VISIBLE_SYMBOLS;
        return (windowHeight / 2) - (SYMBOL_HEIGHT / 2) - (centerIndex * SYMBOL_HEIGHT);
    },

    // --- Spin Animation ---
    spinReels: function (result) {
        var self = this;

        for (var r = 0; r < 3; r++) {
            (function (reelIdx) {
                // Render new strip
                self.reelStrips[reelIdx] = result.reels[reelIdx];
                self.renderReel(reelIdx, result.reels[reelIdx]);

                // Reset to top
                var reel = self.reelEls[reelIdx];
                reel.style.transition = 'none';
                reel.style.transform = 'translateY(' + self.getOffset(0) + 'px)';
                reel.getBoundingClientRect(); // force reflow

                // Animate to target
                var duration = SPIN_DURATION_BASE + (reelIdx * SPIN_DURATION_STEP);
                var delay = reelIdx * 150;

                setTimeout(function () {
                    reel.style.transition = 'transform ' + (duration / 1000) + 's cubic-bezier(0.12, 0.8, 0.14, 1)';
                    var targetIdx = result.targetIndices[reelIdx] + 1; // center symbol
                    reel.style.transform = 'translateY(' + self.getOffset(targetIdx) + 'px)';
                }, delay);
            })(r);
        }

        // After last reel stops
        var totalDuration = SPIN_DURATION_BASE + (2 * SPIN_DURATION_STEP) + (2 * 150) + 200;
        setTimeout(function () {
            self.onSpinComplete(result);
        }, totalDuration);
    },

    onSpinComplete: function (result) {
        var payout = result.payout;
        SlotEngine.finishSpin(payout);

        // Highlight center symbols
        for (var r = 0; r < 3; r++) {
            var centerIdx = result.targetIndices[r] + 1;
            var symbolEls = this.reelEls[r].children;
            if (symbolEls[centerIdx]) {
                symbolEls[centerIdx].classList.add('active');
            }
        }

        // Show result
        this.showResult(payout);
        this.updateDisplay();

        // Record history
        this.addHistoryEntry(result);

        // Sound
        this.stopSound(this.spinSound);
        if (payout.amount > 0) {
            this.playSound(this.winSound);
        } else {
            this.playSound(this.loseSound);
        }

        // Machine visual effect
        this.machineEl.classList.remove('machine--win', 'machine--jackpot', 'machine--lose');
        if (payout.type === 'jackpot') {
            this.machineEl.classList.add('machine--jackpot');
        } else if (payout.type === 'win' || payout.type === 'small') {
            this.machineEl.classList.add('machine--win');
        } else {
            this.machineEl.classList.add('machine--lose');
        }

        // Unlock
        var self = this;
        setTimeout(function () {
            self.spinBtn.disabled = false;
            self.machineEl.classList.remove('machine--win', 'machine--jackpot', 'machine--lose');
        }, 2500);
    },

    showResult: function (payout) {
        this.resultEl.classList.remove('show', 'win', 'jackpot', 'lose');

        var self = this;
        setTimeout(function () {
            if (payout.type === 'jackpot') {
                self.resultEl.textContent = '🎰 JACKPOT ! +' + payout.amount + ' CRÉDITS !';
                self.resultEl.classList.add('jackpot');
            } else if (payout.type === 'win') {
                self.resultEl.textContent = '✨ GAGNÉ ! +' + payout.amount + ' CRÉDITS';
                self.resultEl.classList.add('win');
            } else if (payout.type === 'small') {
                self.resultEl.textContent = '🍒 Petite victoire ! +' + payout.amount;
                self.resultEl.classList.add('win');
            } else {
                if (SlotEngine.credits <= 0) {
                    self.resultEl.textContent = "Courage t'es a la rue 😭";
                } else {
                    self.resultEl.textContent = 'Pas de chance...';
                }
                self.resultEl.classList.add('lose');
            }
            self.resultEl.classList.add('show');
        }, 50);

        // Hide after delay
        setTimeout(function () {
            self.resultEl.classList.remove('show');
        }, 3000);
    },

    // --- Display ---
    updateDisplay: function () {
        this.creditsEl.textContent = SlotEngine.credits;
        this.betEl.textContent = SlotEngine.bet;
        this.winEl.textContent = '0';

        // Jackpot display (cosmetic)
        this.jackpotAmountEl.textContent = (SlotEngine.bet * SYMBOLS[0].multiplier).toLocaleString();
    },

    updateWinDisplay: function (amount) {
        this.winEl.textContent = amount;
    },

    // --- History ---
    addHistoryEntry: function (result) {
        var payout = result.payout;
        var now = new Date();
        var time = now.getHours().toString().padStart(2, '0') + ':' + now.getMinutes().toString().padStart(2, '0') + ':' + now.getSeconds().toString().padStart(2, '0');
        var combo = result.centerSymbols.map(function (s) { return s.emoji; }).join(' ');
        var entry = {
            time: time,
            bet: payout.type === 'lose' ? SlotEngine.bet : (payout.amount / payout.multiplier),
            result: payout.amount > 0 ? '+' + payout.amount : '-' + SlotEngine.bet,
            resultType: payout.type,
            balance: SlotEngine.credits,
            combo: combo
        };
        this.history.unshift(entry);
        this.renderHistory();
    },

    renderHistory: function () {
        var tbody = document.getElementById('history-tbody');
        if (!tbody) return;
        tbody.innerHTML = '';
        for (var i = 0; i < this.history.length; i++) {
            var e = this.history[i];
            var tr = document.createElement('tr');
            var cssClass = '';
            if (e.resultType === 'jackpot') cssClass = 'history-jackpot';
            else if (e.resultType === 'win' || e.resultType === 'small') cssClass = 'history-win';
            else cssClass = 'history-lose';

            tr.innerHTML = '<td class="px-2 py-2 text-center text-white/80 border-b border-white/5 whitespace-nowrap">' + e.time + '</td>' +
                '<td class="px-2 py-2 text-center text-white/80 border-b border-white/5 whitespace-nowrap">' + e.bet + '</td>' +
                '<td class="px-2 py-2 text-center border-b border-white/5 whitespace-nowrap ' + cssClass + '">' + e.result + '</td>' +
                '<td class="px-2 py-2 text-center text-white/80 border-b border-white/5 whitespace-nowrap">' + e.balance + '</td>' +
                '<td class="px-2 py-2 text-center border-b border-white/5 whitespace-nowrap">' + e.combo + '</td>';
            tbody.appendChild(tr);
        }

        // Hide empty message
        var emptyMsg = document.getElementById('history-empty');
        if (emptyMsg) emptyMsg.style.display = this.history.length > 0 ? 'none' : 'block';
    },

    bindHistoryEvents: function () {
        var toggle = document.getElementById('history-toggle');
        var panel = document.getElementById('history-panel');
        var closeBtn = document.getElementById('history-close');
        if (toggle && panel) {
            toggle.addEventListener('click', function () {
                panel.classList.toggle('hidden');
            });
        }
        if (closeBtn && panel) {
            closeBtn.addEventListener('click', function () {
                panel.classList.add('hidden');
            });
        }
    },

    // --- Events ---
    updateSymbolHeight: function () {
        var w = window.innerWidth;
        if (w <= 380) SYMBOL_HEIGHT = 50;
        else if (w <= 520) SYMBOL_HEIGHT = 60;
        else SYMBOL_HEIGHT = 70;

        if (!SlotEngine.isSpinning) {
            for (var r = 0; r < 3; r++) {
                if (this.reelEls[r] && this.reelEls[r].children.length > 0) {
                    this.reelEls[r].style.transform = 'translateY(' + this.getOffset(1) + 'px)';
                }
            }
        }
    },



    bindEvents: function () {
        var self = this;

        this.spinBtn.addEventListener('click', function () {
            self.handleSpin();
        });

        document.getElementById('btn-bet-up').addEventListener('click', function () {
            SlotEngine.setBet(SlotEngine.betStep);
            self.updateDisplay();
        });

        document.getElementById('btn-bet-down').addEventListener('click', function () {
            SlotEngine.setBet(-SlotEngine.betStep);
            self.updateDisplay();
        });

        document.getElementById('btn-max-bet').addEventListener('click', function () {
            SlotEngine.setMaxBet();
            self.updateDisplay();
        });

        // Paytable
        document.getElementById('paytable-toggle').addEventListener('click', function () {
            document.getElementById('paytable-overlay').classList.add('open');
        });
        document.getElementById('paytable-close').addEventListener('click', function () {
            document.getElementById('paytable-overlay').classList.remove('open');
        });
        document.getElementById('paytable-overlay').addEventListener('click', function (e) {
            if (e.target === this) {
                this.classList.remove('open');
            }
        });

        // Keyboard: Space = spin
        document.addEventListener('keydown', function (e) {
            if (e.code === 'Space' && !SlotEngine.isSpinning) {
                e.preventDefault();
                self.handleSpin();
            }
        });
    },

    handleSpin: function () {
        if (SlotEngine.isSpinning) return;

        if (SlotEngine.credits < SlotEngine.bet) {
            this.resultEl.textContent = '⚠️ Crédits insuffisants !';
            this.resultEl.classList.remove('win', 'jackpot', 'lose');
            this.resultEl.classList.add('show', 'lose');
            setTimeout(function () {
                document.getElementById('result-message').classList.remove('show');
            }, 2000);
            return;
        }

        var result = SlotEngine.spin();
        if (!result) return;

        // Lock
        this.spinBtn.disabled = true;
        this.resultEl.classList.remove('show');

        // Update credits immediately (deducted)
        this.updateDisplay();

        // Play spin sound
        this.playSound(this.spinSound, true);

        // Animate
        this.spinReels(result);

        // Animate win counter
        var self = this;
        var totalDuration = SPIN_DURATION_BASE + (2 * SPIN_DURATION_STEP) + (2 * 150) + 200;
        setTimeout(function () {
            if (result.payout.amount > 0) {
                self.animateWinCounter(result.payout.amount);
            }
        }, totalDuration);
    },

    animateWinCounter: function (target) {
        var self = this;
        var current = 0;
        var steps = 20;
        var increment = Math.ceil(target / steps);
        var interval = setInterval(function () {
            current += increment;
            if (current >= target) {
                current = target;
                clearInterval(interval);
            }
            self.winEl.textContent = current;
        }, 50);
    },

    // --- Paytable ---
    buildPaytable: function () {
        var grid = document.getElementById('paytable-grid');
        SYMBOLS.forEach(function (s) {
            var row = document.createElement('div');
            row.className = 'paytable__row';
            row.innerHTML =
                '<span class="paytable__symbols">' + s.emoji + s.emoji + s.emoji + '</span>' +
                '<span class="paytable__payout">x' + s.multiplier + '</span>';
            grid.appendChild(row);
        });
    },

    // --- Sound ---
    playSound: function (el, loop) {
        if (!el) return;
        el.currentTime = 0;
        el.loop = !!loop;
        el.volume = 0.4;
        el.play().catch(function () { });
    },
    stopSound: function (el) {
        if (!el) return;
        el.pause();
        el.currentTime = 0;
    }
};

// ============================================================
// BOOTSTRAP
// ============================================================

document.addEventListener('DOMContentLoaded', function () {
    SlotUI.init();
});
