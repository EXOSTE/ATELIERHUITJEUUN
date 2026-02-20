import './style.css';
import { RouletteUI } from './roulette/ui.js';

// Initialize the Roulette game if we are on the game page
document.addEventListener('DOMContentLoaded', () => {
    const gameContainer = document.getElementById('game-container');
    if (gameContainer) {
        new RouletteUI();
    }
});
