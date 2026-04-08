import { S } from '../core/state.js';
import { TD, getTowerDef, totalInvested } from '../data/towers.js';
import { showGhost, hideGhost, upgradeTower, sellTower, getPlaceCost } from '../systems/placement.js';
import { updateHUD } from './hud.js';

const TK = {'1':'shard','2':'spire','3':'frost','4':'monolith'};

const TOWER_ICONS = {
    shard: '\u25C6', spire: '\u25C8', frost: '\u2744', monolith: '\u2B25'
};

const TOWER_COLORS = {
    shard: '#7799ff', spire: '#cc55ff', frost: '#44ddff', monolith: '#ffaa44'
};

const STAT_LABELS = {
    dmg:'DMG', rate:'RATE', range:'RNG', crit:'CRIT', slow:'SLOW', slowDur:'DUR', splash:'AOE'
};

export function selTower(type) {
    const cost = getPlaceCost(type);
    if(S.gold < cost) return;
    if(S.selTower===type){desel();return;}
    hideUpgradePanel();
    document.querySelectorAll('.tb').forEach(b=>b.classList.remove('sel'));
    document.querySelector(`.tb[data-tower="${type}"]`)?.classList.add('sel');
    S.selTower=type; showGhost(type);
}

export function desel() {
    S.selTower=null;
    document.querySelectorAll('.tb').forEach(b=>b.classList.remove('sel'));
    hideGhost();
}

function formatStat(key, val) {
    if (key === 'crit') return Math.round(val * 100) + '%';
    if (key === 'slow') return Math.round(val * 100) + '%';
    if (key === 'rate') return val.toFixed(1) + '/s';
    if (key === 'slowDur') return val.toFixed(1) + 's';
    if (key === 'range' || key === 'splash') return val.toFixed(1);
    return val.toString();
}

export function showUpgradePanel(tower) {
    S.selectedTower = tower;
    desel(); // clear any placement selection

    const panel = document.getElementById('upgrade-panel');
    const type = tower.type;
    const lv = tower.level;
    const curDef = tower.def;
    const nextDef = lv < 3 ? getTowerDef(type, lv + 1) : null;

    // Header
    panel.querySelector('.up-icon').textContent = TOWER_ICONS[type] || '';
    panel.querySelector('.up-icon').style.color = TOWER_COLORS[type] || '#aa88ff';
    panel.querySelector('.up-name').textContent = type.charAt(0).toUpperCase() + type.slice(1);
    panel.querySelector('.up-level').textContent = `Lv ${lv}`;

    // Stars
    const stars = panel.querySelectorAll('.up-stars span');
    stars.forEach((s, i) => s.classList.toggle('filled', i < lv));

    // Stats
    const statsEl = panel.querySelector('.up-stats');
    statsEl.innerHTML = '';
    const statKeys = ['dmg','rate','range'];
    if (curDef.crit) statKeys.push('crit');
    if (curDef.slow !== undefined) statKeys.push('slow', 'slowDur');
    if (curDef.splash) statKeys.push('splash');

    // DPS row
    const curDps = curDef.dmg * curDef.rate * (1 + (curDef.crit || 0));
    const nextDps = nextDef ? nextDef.dmg * nextDef.rate * (1 + (nextDef.crit || 0)) : null;

    for (const key of statKeys) {
        const row = document.createElement('div');
        row.className = 'up-stat';
        const cur = curDef[key];
        const next = nextDef ? nextDef[key] : null;

        let html = `<span class="up-stat-label">${STAT_LABELS[key] || key}</span>`;
        html += `<span class="up-stat-val">${formatStat(key, cur)}</span>`;
        if (next !== null && next !== cur) {
            html += `<span class="up-stat-arrow">\u2192</span>`;
            html += `<span class="up-stat-next">${formatStat(key, next)}</span>`;
        }
        row.innerHTML = html;
        statsEl.appendChild(row);
    }

    // DPS row
    const dpsRow = document.createElement('div');
    dpsRow.className = 'up-stat';
    let dpsHtml = `<span class="up-stat-label">DPS</span>`;
    dpsHtml += `<span class="up-stat-val" style="color:#ff9955">${curDps.toFixed(1)}</span>`;
    if (nextDps !== null) {
        dpsHtml += `<span class="up-stat-arrow">\u2192</span>`;
        dpsHtml += `<span class="up-stat-next" style="color:#ffbb66">${nextDps.toFixed(1)}</span>`;
    }
    dpsRow.innerHTML = dpsHtml;
    statsEl.appendChild(dpsRow);

    // Upgrade button
    const upgradeBtn = document.getElementById('upgrade-btn');
    const costEl = document.getElementById('up-cost');
    if (lv >= 3) {
        upgradeBtn.classList.add('maxed');
        upgradeBtn.classList.remove('dis');
        upgradeBtn.querySelector('.up-btn-label').textContent = 'MAX LEVEL';
        costEl.textContent = '';
    } else {
        const upgCost = TD[type].levels[lv].upgCost;
        upgradeBtn.classList.remove('maxed');
        upgradeBtn.classList.toggle('dis', S.gold < upgCost);
        upgradeBtn.querySelector('.up-btn-label').textContent = 'UPGRADE';
        costEl.textContent = `\u25C6 ${upgCost}`;
    }

    // Sell button
    const invested = tower.invested || totalInvested(type, lv);
    const refund = Math.floor(invested * 0.6);
    document.getElementById('sell-value').textContent = `\u25C6 ${refund}`;

    panel.classList.remove('hidden');
}

// Refresh just the upgrade button enabled/disabled state
export function refreshUpgradeBtn() {
    if (!S.selectedTower) return;
    const panel = document.getElementById('upgrade-panel');
    if (panel.classList.contains('hidden')) return;
    const lv = S.selectedTower.level;
    const upgradeBtn = document.getElementById('upgrade-btn');
    if (lv >= 3) return;
    const upgCost = TD[S.selectedTower.type].levels[lv].upgCost;
    upgradeBtn.classList.toggle('dis', S.gold < upgCost);
}

export function hideUpgradePanel() {
    document.getElementById('upgrade-panel').classList.add('hidden');
    if (S.selectedTower && S.selectedTower._selRing) {
        // Will be cleaned up in main.js deselectTower
    }
    S.selectedTower = null;
}

export function initTowerPanel() {
    document.querySelectorAll('.tb').forEach(b=>b.addEventListener('click',()=>selTower(b.dataset.tower)));
    document.addEventListener('keydown',e=>{
        if(!S.started||S.over)return;
        if(TK[e.key])selTower(TK[e.key]);
        else if(e.key==='Escape') { desel(); hideUpgradePanel(); }
    });

    // Upgrade button
    document.getElementById('upgrade-btn').addEventListener('click', () => {
        if (!S.selectedTower || S.selectedTower.level >= 3) return;
        if (upgradeTower(S.selectedTower, updateHUD)) {
            showUpgradePanel(S.selectedTower); // refresh panel
        }
    });

    // Sell button
    document.getElementById('sell-btn').addEventListener('click', () => {
        if (!S.selectedTower) return;
        sellTower(S.selectedTower, updateHUD);
        hideUpgradePanel();
    });
}
