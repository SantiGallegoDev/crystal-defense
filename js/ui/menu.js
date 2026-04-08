import { S } from '../core/state.js';
import { allModelsReady } from '../systems/model-loader.js';
import { updateHUD } from './hud.js';

export function initMenu() {
    document.querySelectorAll('.diff-btn').forEach(b=>b.addEventListener('click',()=>{
        document.querySelectorAll('.diff-btn').forEach(x=>x.classList.remove('sel')); b.classList.add('sel');
    }));

    document.getElementById('play-btn').addEventListener('click', async ()=>{
        await allModelsReady;
        S.started=true; S.diff=document.querySelector('.diff-btn.sel').dataset.diff;
        if(S.diff==='easy')S.gold=170; else if(S.diff==='hard'){S.gold=90;S.lives=10;} else S.gold=120;
        document.getElementById('main-menu').classList.add('hidden');
        document.getElementById('hud').classList.add('active');
        document.getElementById('wave-btn').classList.remove('hidden');
        document.getElementById('wave-btn').textContent='START WAVE 1';
        updateHUD();
    });
}
