const pool = [];
for (let i = 0; i < 6; i++) {
    const a = new Audio('assets/audio/glass-break.mp3');
    a.volume = .15;
    pool.push(a);
}
let idx = 0;

export function playGlassBreak() {
    const a = pool[idx];
    a.currentTime = 0;
    a.play().catch(() => {});
    idx = (idx + 1) % pool.length;
}

const upgradeAudio = new Audio('assets/audio/upgrade.mp3');
upgradeAudio.volume = 0.3;

export function playUpgrade() {
    upgradeAudio.currentTime = 0;
    upgradeAudio.play().catch(() => {});
}
