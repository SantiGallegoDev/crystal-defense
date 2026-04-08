import { scene } from '../core/engine.js';
import { S, DIFF } from '../core/state.js';
import { makeEnemy } from './enemy-factory.js';

export function spawnEnemy(wave) {
    const dm = DIFF[S.diff];
    const hp = (12 + wave*14 + Math.pow(wave, 1.6)*2) * dm;
    const spd = .15 + Math.min(wave*.007, .13);
    const rew = Math.max(2, Math.floor((3 + wave*0.8) / dm));
    const types = ['normal','fast','tank'], w = [.55,.3,.15];
    let r = Math.random(), type = 'normal';
    for (let i = 0; i < 3; i++) { r -= w[i]; if (r<=0) { type=types[i]; break; } }
    let fH=hp, fS=spd, fR=rew;
    if (type==='fast') { fH*=.45; fS*=1.8; fR=Math.floor(rew*.8); }
    if (type==='tank') { fH*=2.8; fS*=.55; fR=Math.floor(rew*2); }
    const { group, bodyRef, hpBar, hpBg } = makeEnemy(type);
    scene.add(group);
    return { mesh:group, body:bodyRef, hpBar, hpBg, hp:fH, maxHp:fH, speed:fS, baseSpeed:fS, slowT:0, prog:0, reward:fR, type, alive:true, rot:0, hpShowT:0, flashT:0 };
}

export function startWave(updateHUD) {
    S.wave++; S.waveActive=true; S.spawned=0;
    S.inWave = 4 + S.wave*2 + Math.floor(S.wave/4)*3;
    S.spawnT=0;
    document.getElementById('wave-btn').classList.add('hidden');
    updateHUD();
}

export function endWave(updateHUD) {
    S.waveActive = false;
    const bonus = 10 + S.wave*4; S.gold += bonus;
    const b = document.getElementById('wave-btn');
    b.classList.remove('hidden'); b.textContent = `START WAVE ${S.wave+1}`;
    const banner = document.getElementById('wave-banner');
    banner.textContent = `WAVE ${S.wave} CLEARED  +${bonus}`;
    banner.classList.add('show');
    setTimeout(()=>banner.classList.remove('show'), 2200);
    updateHUD();

    // Auto-wave: start next wave after short delay
    if (S.autoWave && !S.over) {
        setTimeout(() => {
            if (S.autoWave && !S.waveActive && !S.over) startWave(updateHUD);
        }, 1000);
    }
}
