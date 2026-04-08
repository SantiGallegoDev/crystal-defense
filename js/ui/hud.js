import { S } from '../core/state.js';
import { TD } from '../data/towers.js';
import { getPlaceCost } from '../systems/placement.js';
import { refreshUpgradeBtn } from './tower-panel.js';

let prevGold = 120, prevLives = 20, prevKills = 0;
let goldHistory = [];

function animateValue(el) {
    el.classList.remove('changed');
    void el.offsetWidth; // reflow
    el.classList.add('changed');
}

function updateLivesPips() {
    const container = document.getElementById('lives-pips');
    if (!container) return;
    const maxLives = S.diff === 'hard' ? 10 : 20;
    const maxPips = Math.min(maxLives, 20);

    // Only rebuild pips if count changed
    if (container.children.length !== maxPips) {
        container.innerHTML = '';
        for (let i = 0; i < maxPips; i++) {
            const pip = document.createElement('div');
            pip.className = 'pip';
            container.appendChild(pip);
        }
    }

    for (let i = 0; i < maxPips; i++) {
        container.children[i].classList.toggle('lost', i >= S.lives);
    }
}

function updateTowerBreakdown() {
    const counts = { shard: 0, spire: 0, frost: 0, monolith: 0 };
    for (const tw of S.towers) {
        if (counts[tw.type] !== undefined) counts[tw.type]++;
    }
    for (const type of Object.keys(counts)) {
        const el = document.querySelector(`#tower-breakdown .tb-row[data-type="${type}"] .tb-count`);
        if (el) el.textContent = counts[type];
    }
}

function updateGoldRate() {
    const now = performance.now();
    goldHistory.push({ g: S.gold, t: now });
    // Keep last 5 seconds
    goldHistory = goldHistory.filter(e => now - e.t < 5000);

    const el = document.getElementById('gold-rate');
    if (!el || goldHistory.length < 2) return;

    const oldest = goldHistory[0];
    const elapsed = (now - oldest.t) / 1000;
    if (elapsed < 0.5) return;

    const rate = Math.round((S.gold - oldest.g) / elapsed);
    el.textContent = rate >= 0 ? `+${rate}/s` : `${rate}/s`;
    el.style.color = rate >= 0 ? '#55cc77' : '#ff5566';
}

export function updateHUD() {
    const goldEl = document.querySelector('#hud-gold .vl');
    const livesEl = document.querySelector('#hud-lives .vl');
    const waveEl = document.querySelector('.wave-hex .vl');
    const killsEl = document.querySelector('#hud-kills .vl');
    const tcEl = document.querySelector('#tc-d .tv');
    const waveSubEl = document.getElementById('wave-sub');

    if (goldEl) {
        goldEl.textContent = S.gold;
        if (S.gold !== prevGold) animateValue(goldEl);
    }
    if (livesEl) {
        livesEl.textContent = S.lives;
        if (S.lives !== prevLives) animateValue(livesEl);
    }
    if (waveEl) waveEl.textContent = S.wave;
    if (killsEl) {
        killsEl.textContent = S.kills;
        if (S.kills !== prevKills) animateValue(killsEl);
    }
    if (tcEl) tcEl.textContent = S.towers.length;
    if (waveSubEl) {
        waveSubEl.textContent = S.waveActive
            ? `${S.enemies.length} remaining`
            : S.wave === 0 ? 'Waiting' : 'Cleared';
    }

    prevGold = S.gold;
    prevLives = S.lives;
    prevKills = S.kills;

    // Disable tower buttons and update dynamic cost
    document.querySelectorAll('.tb').forEach(b => {
        const type = b.dataset.tower;
        const cost = getPlaceCost(type);
        b.classList.toggle('dis', S.gold < cost);
        const costEl = b.querySelector('.tc');
        if (costEl) costEl.innerHTML = `<svg viewBox="0 0 12 12" width="8" height="8"><polygon points="6,1 11,6 6,11 1,6" fill="#bb88ff"/></svg> ${cost}`;
    });

    updateLivesPips();
    updateTowerBreakdown();
    updateGoldRate();
    refreshUpgradeBtn();
}
