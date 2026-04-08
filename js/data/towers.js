export const TD = {
    shard: {
        color:0x5588ff, em:0x3355cc, pCol:0x77bbff, pSpd:14, h:2.2,
        levels: [
            { cost:50,  upgCost:0,   dmg:8,  rate:1.0, range:4.5, crit:.20 },
            { cost:50,  upgCost:90,  dmg:14, rate:1.2, range:5.0, crit:.25 },
            { cost:50,  upgCost:165, dmg:22, rate:1.4, range:5.5, crit:.35 },
        ],
    },
    spire: {
        color:0xbb66ff, em:0x7733dd, pCol:0xdd99ff, pSpd:14, h:3.0,
        levels: [
            { cost:100, upgCost:0,   dmg:35, rate:0.4, range:9 },
            { cost:100, upgCost:180, dmg:55, rate:0.45, range:10.5 },
            { cost:100, upgCost:325, dmg:85, rate:0.5, range:12 },
        ],
    },
    frost: {
        color:0x44ddff, em:0x22aacc, pCol:0x66eeff, pSpd:12, h:1.8,
        levels: [
            { cost:60,  upgCost:0,   dmg:4,  rate:1.4, range:4.0, slow:.35, slowDur:2.0 },
            { cost:60,  upgCost:110, dmg:7,  rate:1.6, range:4.5, slow:.45, slowDur:2.5 },
            { cost:60,  upgCost:200, dmg:12, rate:1.8, range:5.0, slow:.55, slowDur:3.0 },
        ],
    },
    monolith: {
        color:0xffbb44, em:0xcc8822, pCol:0xffdd77, pSpd:10, h:2.5,
        levels: [
            { cost:125, upgCost:0,   dmg:28,  rate:0.4,  range:5.0, splash:1.8 },
            { cost:125, upgCost:225, dmg:48,  rate:0.45, range:5.5, splash:2.2 },
            { cost:125, upgCost:400, dmg:75,  rate:0.5,  range:6.5, splash:2.8 },
        ],
    },
};

// Returns a flat def object merging type-level visual props with level-specific combat stats
export function getTowerDef(type, level) {
    const t = TD[type];
    const lv = t.levels[level - 1];
    return {
        ...lv,
        color: t.color, em: t.em, pCol: t.pCol, pSpd: t.pSpd, h: t.h,
    };
}

// Total gold invested in a tower at a given level
export function totalInvested(type, level) {
    const lvs = TD[type].levels;
    let total = lvs[0].cost;
    for (let i = 1; i < level; i++) total += lvs[i].upgCost;
    return total;
}
