import { RouletteEngine, ROULETTE_OPTIONS } from './engine.js';

export class RouletteUI {
    constructor() {
        this.engine = new RouletteEngine();

        // DOM Elements
        this.btn = document.getElementById('spin-btn');
        this.reel = document.getElementById('roulette-reel');
        this.glow = document.getElementById('glow-effect');
        this.container = document.getElementById('game-container');

        // Audio Elements
        this.spinSound = document.getElementById('spin-sound');
        this.winSound = document.getElementById('win-sound');
        this.loseSound = document.getElementById('lose-sound');

        // Reel physics Config
        this.itemHeight = 64; // Hauteur d'un item en pixels (4rem)
        this.stripLength = 40; // Nombre d'items dans la bande (pour l'effet long scroll)
        this.items = []; // Tableau contenant les éléments DOM

        this.init();
    }

    init() {
        if (!this.btn || !this.reel) return;
        this.buildReelStrip();
        this.btn.addEventListener('click', () => this.handleSpin());
    }

    /**
     * Construit la bande visuelle de la roulette (Slot strip)
     */
    buildReelStrip() {
        this.reel.innerHTML = '';
        this.items = [];

        for (let i = 0; i < this.stripLength; i++) {
            const option = ROULETTE_OPTIONS[Math.floor(Math.random() * ROULETTE_OPTIONS.length)];
            this.addReelItem(option);
        }

        // Centrer initialement sur le premier item
        this.reel.style.transform = `translateY(${this.getOffsetForItem(1)}px)`;
        this.reel.style.transition = 'none';
    }

    addReelItem(option) {
        const el = document.createElement('div');
        el.className = `reel-item ${option.colorClass}`;
        el.innerHTML = option.label;
        this.reel.appendChild(el);
        this.items.push({ el, option });
    }

    getOffsetForItem(index) {
        // Calcul de la position (h-48 = 192px / 2 = 96px pour le centre)
        return 96 - (this.itemHeight / 2) - (index * this.itemHeight);
    }

    async handleSpin() {
        if (this.engine.isSpinning) return;

        // 1. Choix du résultat via l'Engine
        const result = this.engine.startSpin();

        // 2. Lock UI & Play sound
        this.lockUI();
        this.playSound(this.spinSound, true);

        // 3. Reset effects
        this.glow.className = 'glow-effect glow-primary';
        this.container.className = 'game-container';
        this.items.forEach(item => item.el.classList.remove('active'));

        // 4. On modifie l'avant-dernier élément du ruban pour forcer le résultat
        const targetIndex = this.stripLength - 5;
        const targetEl = this.items[targetIndex].el;
        targetEl.innerHTML = result.label;
        targetEl.className = `reel-item ${result.colorClass}`;

        // 5. On remonte tout en haut instantanément pour une longue course
        this.reel.style.transition = 'none';
        this.reel.style.transform = `translateY(${this.getOffsetForItem(0)}px)`;

        // Force reflow pour Chrome
        this.reel.getBoundingClientRect();

        // 6. Lance l'animation CSS vers la cible
        this.reel.style.transition = 'transform 3.5s cubic-bezier(0.15, 0.85, 0.15, 1)';
        const targetOffset = this.getOffsetForItem(targetIndex);
        this.reel.style.transform = `translateY(${targetOffset}px)`;

        // Effet cinétique (blur) pendant la rotation
        this.reel.style.filter = 'blur(2px)';

        // 7. Attendre la fin de l'animation CSS
        setTimeout(() => {
            this.reel.style.filter = 'blur(0px)';
            targetEl.classList.add('active'); // Pop effect

            this.engine.stopSpin();
            this.stopSound(this.spinSound);
            this.showResultFx(result);

            this.unlockUI();

            // On reconstruit le reel en arrière-plan pour le prochain tour
            setTimeout(() => this.resetReelPosition(result), 2000);

        }, 3500);
    }

    showResultFx(result) {
        if (result.id === 'jackpot') {
            this.glow.className = 'glow-effect glow-jackpot animate-pulse';
            this.container.classList.add('ring-jackpot');
            this.playSound(this.winSound);
        }
        else if (result.type === 'win') {
            this.glow.className = 'glow-effect glow-win';
            this.container.classList.add('ring-win');
            this.playSound(this.winSound);
        }
        else {
            this.glow.className = 'glow-effect glow-lose';
            this.container.classList.add('ring-lose');
            this.playSound(this.loseSound);
        }

        // Cleanup partiel FX après 2s (garde juste le glow)
        setTimeout(() => {
            this.container.className = 'game-container';
            this.glow.classList.remove('animate-pulse');
        }, 2000);
    }

    resetReelPosition(lastResult) {
        this.reel.style.transition = 'none';
        this.buildReelStrip();
        this.items[1].el.innerHTML = lastResult.label;
        this.items[1].el.className = `reel-item active ${lastResult.colorClass}`;
    }

    lockUI() {
        this.btn.disabled = true;
        this.btn.classList.add('disabled');
    }

    unlockUI() {
        this.btn.disabled = false;
        this.btn.classList.remove('disabled');
    }

    playSound(audioElement, loop = false) {
        if (!audioElement) return;
        audioElement.currentTime = 0;
        audioElement.loop = loop;
        audioElement.volume = 0.5;
        audioElement.play().catch(() => { });
    }

    stopSound(audioElement) {
        if (!audioElement) return;
        audioElement.pause();
        audioElement.currentTime = 0;
    }
}
