import { S } from '../core/state.js';

export function gameOver() {
    S.over = true;
    document.getElementById('gameover').classList.add('active');
    document.getElementById('fw').textContent = S.wave;
    document.getElementById('fk').textContent = S.kills;
    document.getElementById('ft').textContent = S.towers.length;
    document.getElementById('wave-btn').classList.add('hidden');
}

export function initGameOver() {
    document.getElementById('restart-btn').addEventListener('click', ()=>location.reload());
}
