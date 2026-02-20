/**
 * Roulette Engine - Cœur logique du jeu
 * Ce fichier ne contient que les règles métiers et l'aléatoire (Clean Architecture)
 */

export const ROULETTE_OPTIONS = [
    { id: 'jackpot', label: '💎 JACKPOT', type: 'win', weight: 1, colorClass: 'color-jackpot' },
    { id: 'win', label: '🍒 GAGNÉ', type: 'win', weight: 4, colorClass: 'color-win' },
    { id: 'lose', label: '💀 PERDU', type: 'lose', weight: 5, colorClass: 'color-lose' }
];

export class RouletteEngine {
    constructor() {
        this.isSpinning = false;
    }

    /**
     * Génère un résultat en tenant compte des poids (probabilités)
     */
    getRandomResult() {
        const totalWeight = ROULETTE_OPTIONS.reduce((acc, opt) => acc + opt.weight, 0);
        let randomNum = Math.random() * totalWeight;

        for (const option of ROULETTE_OPTIONS) {
            if (randomNum < option.weight) {
                return option;
            }
            randomNum -= option.weight;
        }
        return ROULETTE_OPTIONS[ROULETTE_OPTIONS.length - 1];
    }

    /**
     * Valide la rotation (le moteur ne gère que l'état, pas le temps réel UI)
     */
    startSpin() {
        if (this.isSpinning) throw new Error("La roulette tourne déjà !");
        this.isSpinning = true;
        return this.getRandomResult();
    }

    stopSpin() {
        this.isSpinning = false;
    }
}
