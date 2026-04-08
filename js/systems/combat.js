import * as THREE from 'three';
import { scene } from '../core/engine.js';
import { S } from '../core/state.js';
import { G } from './geometry.js';
import { playGlassBreak } from './audio.js';

export function fire(tw, tgt) {
    const d = tw.def, start = tw.mesh.position.clone();
    start.y += d.h + .1;
    const m = new THREE.Mesh(G.proj, new THREE.MeshStandardMaterial({
        color: d.pCol, emissive: d.pCol, emissiveIntensity: 1.5,
        roughness: 0.1, metalness: 0.2,
    }));
    const pSize = d.splash ? .12 : (.05 + d.dmg * .002);
    m.scale.setScalar(pSize);
    m.position.copy(start);
    scene.add(m);
    S.projs.push({ mesh:m, target:tgt, speed:d.pSpd, dmg:d.dmg, slow:d.slow||0, slowDur:d.slowDur||2, splash:d.splash||0, crit:d.crit||0, alive:true });

    // Tower fire recoil animation
    tw._fireRecoil = 0.12;
}

// Splash ground shockwave effect
const _splashRingGeo = new THREE.RingGeometry(0.1, 0.3, 32);
_splashRingGeo.rotateX(-Math.PI / 2);
const _splashDiscGeo = new THREE.CircleGeometry(1, 32);
_splashDiscGeo.rotateX(-Math.PI / 2);

export function splashFX(pos, radius, col) {
    // Expanding ring
    const ringMat = new THREE.MeshBasicMaterial({
        color: col, transparent: true, opacity: 0.6, side: THREE.DoubleSide, depthWrite: false,
    });
    const ring = new THREE.Mesh(_splashRingGeo, ringMat);
    ring.position.set(pos.x, 0.08, pos.z);
    ring.scale.set(0.3, 0.3, 0.3);
    scene.add(ring);

    // Ground burn disc
    const discMat = new THREE.MeshBasicMaterial({
        color: col, transparent: true, opacity: 0.25, side: THREE.DoubleSide, depthWrite: false,
    });
    const disc = new THREE.Mesh(_splashDiscGeo, discMat);
    disc.position.set(pos.x, 0.06, pos.z);
    disc.scale.set(0.1, 0.1, 0.1);
    scene.add(disc);

    S.splashFX.push({
        ring, disc, ringMat, discMat,
        maxRadius: radius,
        life: 1.0,
    });
}

export function hitFX(pos, col, n=5) {
    for (let i = 0; i < n; i++) {
        const m = new THREE.Mesh(G.oct, new THREE.MeshBasicMaterial({ color: col, transparent: true }));
        m.scale.setScalar(.03+Math.random()*.02); m.position.copy(pos);
        S.parts.push({ mesh:m, vel:new THREE.Vector3((Math.random()-.5)*2, Math.random()*1.5+.5, (Math.random()-.5)*2), life:.7 });
        scene.add(m);
    }
}

// Render or update the accumulated damage sprite on an enemy
function updateDmgSprite(e) {
    const total = Math.round(e._dmgAccum);
    const isCrit = e._lastCrit;

    const c = document.createElement('canvas');
    c.width = 256; c.height = 128;
    const ctx = c.getContext('2d');
    const fontSize = isCrit ? 72 : 60;
    ctx.font = `bold ${fontSize}px Arial, Helvetica, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    // Dark outline
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 6;
    ctx.fillStyle = isCrit ? '#ff2244' : (e._lastSlow ? '#66eeff' : '#ddccff');
    const txt = total.toString();
    ctx.strokeText(txt, 128, 64);
    ctx.fillText(txt, 128, 64);

    const tex = new THREE.CanvasTexture(c);

    if (e._dmgSprite) {
        // Update existing sprite texture
        e._dmgSprite.material.map.dispose();
        e._dmgSprite.material.map = tex;
        e._dmgSprite.material.needsUpdate = true;
        e._dmgSprite.material.opacity = 1;
    } else {
        // Create new sprite - sizeAttenuation true so it scales in world space
        const sprite = new THREE.Sprite(new THREE.SpriteMaterial({
            map: tex, transparent: true, depthWrite: false, sizeAttenuation: true,
        }));
        sprite.scale.set(2, 1, 1);
        scene.add(sprite);
        e._dmgSprite = sprite;
    }

    // Scale pop on hit
    e._dmgPopT = 0.12;
    const baseX = isCrit ? 2.4 : 2;
    const baseY = isCrit ? 1.2 : 1;
    e._dmgBaseScale = { x: baseX, y: baseY };
}

export function dmgEnemy(e, dmg, slow, updateHUD, isCrit, slowDur) {
    let finalDmg = dmg;
    let didCrit = false;
    if (isCrit) {
        didCrit = true;
        finalDmg = dmg * 2;
    }

    e.hp -= finalDmg;
    S.dps.push({ d:finalDmg, t:performance.now() });
    if (slow>0) e.slowT = slowDur || 2;
    e.hpShowT = 2.0;
    e.flashT = .15;

    // Accumulate damage
    if (!e._dmgAccum) e._dmgAccum = 0;
    e._dmgAccum += finalDmg;
    e._dmgTimer = 1.2; // reset idle timer
    e._lastCrit = didCrit;
    e._lastSlow = slow > 0;
    updateDmgSprite(e);

    if (e.hp<=0) {
        e.alive=false;
        // Clean up damage sprite
        if (e._dmgSprite) { scene.remove(e._dmgSprite); e._dmgSprite = null; }
        scene.remove(e.mesh);
        S.gold+=e.reward; S.kills++;
        hitFX(e.mesh.position, didCrit ? 0xff4466 : 0x8877ff, didCrit ? 12 : 8);
        playGlassBreak();
        updateHUD();
    }
}

// Called from update.js each frame to manage accumulated damage counters
export function updateDmgCounters(dt) {
    for (const e of S.enemies) {
        if (!e.alive) continue;

        if (e._dmgTimer !== undefined && e._dmgTimer > 0) {
            e._dmgTimer -= dt;

            // Position sprite above enemy
            if (e._dmgSprite) {
                e._dmgSprite.position.set(
                    e.mesh.position.x,
                    e.mesh.position.y + 1.8,
                    e.mesh.position.z
                );

                // Scale pop animation
                const bs = e._dmgBaseScale || { x: 2, y: 1 };
                if (e._dmgPopT !== undefined && e._dmgPopT > 0) {
                    e._dmgPopT -= dt;
                    const s = 1 + (e._dmgPopT / 0.12) * 0.3;
                    e._dmgSprite.scale.set(bs.x * s, bs.y * s, 1);
                } else {
                    e._dmgSprite.scale.set(bs.x, bs.y, 1);
                }

                // Fade out in last 0.3s
                if (e._dmgTimer < 0.3) {
                    e._dmgSprite.material.opacity = Math.max(e._dmgTimer / 0.3, 0);
                }
            }

            // Timer expired - remove counter
            if (e._dmgTimer <= 0) {
                if (e._dmgSprite) {
                    scene.remove(e._dmgSprite);
                    e._dmgSprite.material.map.dispose();
                    e._dmgSprite = null;
                }
                e._dmgAccum = 0;
                e._dmgTimer = 0;
            }
        }
    }
}
