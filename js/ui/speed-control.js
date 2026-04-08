import { S } from '../core/state.js';

export function initSpeedControl() {
    document.querySelectorAll('.sb').forEach(b=>b.addEventListener('click',()=>{
        document.querySelectorAll('.sb').forEach(x=>x.classList.remove('act'));
        b.classList.add('act');
        S.speed=parseInt(b.dataset.speed);
    }));

    const cb = document.getElementById('auto-wave-cb');
    if (cb) {
        cb.addEventListener('change', () => { S.autoWave = cb.checked; });
    }
}
