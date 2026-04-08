import * as THREE from 'three';
import { scene, camera, ISO_DIST, ISO_ANGLE_Y, ISO_ANGLE_X, ptCyan, ptViolet, ptWarm } from './core/engine.js';
import { S } from './core/state.js';
import { panOffset } from './core/controls.js';
import { getPathCurve, pathVisuals } from './systems/path.js';
import { fire, dmgEnemy, hitFX, splashFX, updateDmgCounters } from './systems/combat.js';
import { spawnEnemy, endWave } from './systems/waves.js';
import { gameOver } from './ui/game-over.js';
import { updateHUD } from './ui/hud.js';
import { animateLevelDecor } from './systems/tower-factory.js';

const _v = new THREE.Vector3();

export function update(dt) {
    if (S.over || !S.started) return;
    const t = performance.now()*.001;

    // Camera pan
    camera.position.set(
        ISO_DIST*Math.sin(ISO_ANGLE_Y)*Math.cos(ISO_ANGLE_X) + panOffset.x,
        ISO_DIST*Math.sin(ISO_ANGLE_X),
        ISO_DIST*Math.cos(ISO_ANGLE_Y)*Math.cos(ISO_ANGLE_X) + panOffset.z
    );
    camera.lookAt(panOffset.x, 0, panOffset.z);

    // Animate portals
    const pA = pathVisuals.portalA, pB = pathVisuals.portalB;
    if (pA) {
        pA.rotation.y = t*.6;
        pA.children[1].rotation.y = t*2; pA.children[1].rotation.x = t*1.3;
    }
    if (pB) {
        pB.rotation.y = -t*.6;
        pB.children[1].rotation.y = -t*2; pB.children[1].rotation.x = -t*1.3;
    }

    // Accent lights pulse
    ptCyan.intensity = .35+Math.sin(t*.7)*.08;
    ptViolet.intensity = .3+Math.sin(t*.5+1)*.06;
    ptWarm.intensity = .18+Math.sin(t*.9+2)*.05;

    // Tower animations
    for (const tw of S.towers) {
        // Emissive pulse - skip GLB models (shard/monolith) to avoid shared material issues
        if (tw.type !== 'shard' && tw.type !== 'monolith') {
            tw.mesh.traverse(ch => {
                if (ch.isMesh && ch.material.emissiveIntensity !== undefined) {
                    const b = ch.userData._be ?? ch.material.emissiveIntensity;
                    ch.userData._be = b;
                    ch.material.emissiveIntensity = b * (0.85 + Math.sin(t * 2 + tw.gp.x * 0.5) * 0.15);
                }
            });
        }

        // Monolith orbiting fragments
        if (tw.type === 'monolith') {
            const frags = tw.mesh.children.filter(c => !c.userData.levelDecor && !c.userData.selRing).filter((_, i) => i >= 2 && i <= 6);
            frags.forEach((f, i) => {
                const a = t * 1.2 + (i / frags.length) * Math.PI * 2;
                f.position.set(Math.cos(a) * 0.4, 0.8 + Math.sin(t * 2 + i) * 0.1, Math.sin(a) * 0.4);
                f.rotation.x = t * 2; f.rotation.z = t * 1.5;
            });
        }

        // Fire recoil animation - brief scale squash on fire
        if (tw._fireRecoil > 0) {
            tw._fireRecoil -= dt;
            const p = Math.max(tw._fireRecoil / 0.12, 0);
            const baseS = tw.level === 3 ? 1.15 : tw.level === 2 ? 1.08 : 1;
            const squash = 1 - p * 0.08;
            const stretch = 1 + p * 0.12;
            tw.mesh.scale.set(baseS * squash, baseS * stretch, baseS * squash);
        }

        // Level decoration animation
        if (tw.level >= 2) animateLevelDecor(tw, t);
    }

    // Spawn
    if (S.waveActive && S.spawned<S.inWave) {
        S.spawnT -= dt;
        if (S.spawnT<=0) {
            S.enemies.push(spawnEnemy(S.wave));
            S.spawned++;
            S.spawnT = Math.max(.7, 1.6 - Math.min(S.wave*.02, .6));
        }
    }

    // Enemies
    for (const e of S.enemies) {
        if (!e.alive) continue;
        if (e.slowT>0) { e.slowT-=dt; e.speed=e.baseSpeed*.4; } else e.speed=e.baseSpeed;
        e.prog += e.speed*dt*.04;
        if (e.prog>=1) {
            e.alive=false; scene.remove(e.mesh);
            if (e._dmgSprite) { scene.remove(e._dmgSprite); e._dmgSprite=null; }
            S.lives--; updateHUD(); if(S.lives<=0){gameOver();return;} continue;
        }

        const pos = getPathCurve().getPointAt(Math.min(e.prog, 1));
        e.mesh.position.copy(pos);
        if (e.prog+.01<1) e.mesh.lookAt(getPathCurve().getPointAt(Math.min(e.prog+.01,1)));

        // HP bar
        e.hpShowT = Math.max(0, e.hpShowT - dt);
        const hpVisible = e.hpShowT > 0;
        e.hpBar.visible = hpVisible;
        e.hpBg.visible = hpVisible;
        if (hpVisible) {
            const alpha = e.hpShowT < .5 ? e.hpShowT / .5 : 1;
            e.hpBar.material.opacity = alpha;
            e.hpBg.material.opacity = alpha * .6;
            const r = e.hp/e.maxHp;
            e.hpBar.scale.x = Math.max(r,.001);
            e.hpBar.position.x = -(1-r)*.35;
            if (r<.3) e.hpBar.material.color.setHex(0xff5577);
            else if (r<.6) e.hpBar.material.color.setHex(0xddaa55);
            e.hpBar.lookAt(camera.position); e.hpBg.lookAt(camera.position);
        }

        // Flash
        if (e.flashT > 0) {
            e.flashT -= dt;
            if (e.body && e.body.material) {
                const flash = e.flashT > 0;
                if (flash && !e._flashing) {
                    e._origEmI = e.body.material.emissiveIntensity;
                    e._origEmC = e.body.material.emissive.getHex();
                    e.body.material.emissive.setHex(0xffffff);
                    e.body.material.emissiveIntensity = 2.0;
                    e._flashing = true;
                } else if (!flash && e._flashing) {
                    e.body.material.emissive.setHex(e._origEmC || 0x000000);
                    e.body.material.emissiveIntensity = e._origEmI || .35;
                    e._flashing = false;
                }
            }
        }

        e.rot += dt*(e.type==='fast'?3:e.type==='tank'?.6:1.2);
        if (e.body) {
            e.body.rotation.y = e.rot;
            e.body.rotation.x = Math.sin(t*1.5+e.prog*30)*.15;
            const pulse = 1+Math.sin(t*3+e.prog*50)*.04;
            if (e.type==='fast') e.body.scale.set(.18*pulse,.28*pulse,.18*pulse);
            else if (e.type==='normal') e.body.scale.setScalar(.3*pulse);
            else e.body.scale.setScalar(.42*pulse);
        }
        if (e.type==='tank') {
            const debris = e.mesh.children.filter((_,i)=>i>=1&&i<=4);
            debris.forEach((d,i)=>{
                const a = t*1.5+(i/debris.length)*Math.PI*2;
                d.position.set(Math.cos(a)*.5, .6+Math.sin(t*2+i)*.08, Math.sin(a)*.5);
                d.rotation.x = t*2.5;
            });
        }
    }

    // Accumulated damage counters per enemy
    updateDmgCounters(dt);

    // Towers fire
    for (const tw of S.towers) {
        tw.cd -= dt;
        if (tw.cd > 0) continue;
        let best=null, bestP=-1;
        for (const e of S.enemies) {
            if (!e.alive) continue;
            const d = tw.mesh.position.distanceTo(e.mesh.position);
            if (d<=tw.def.range&&e.prog>bestP) { best=e; bestP=e.prog; }
        }
        if (best) {
            const interval = 1 / tw.def.rate;
            tw.cd = interval; // reset to full interval, discard any negative overflow
            fire(tw, best);
        } else {
            tw.cd = 0; // no target, clamp to 0 so it doesn't accumulate negative
        }
    }

    // Projectiles
    for (const p of S.projs) {
        if (!p.alive) continue;
        if (!p.target.alive) {
            let newTgt = null, bestP = -1;
            for (const e of S.enemies) {
                if (!e.alive) continue;
                const d = p.mesh.position.distanceTo(e.mesh.position);
                if (d < 8 && e.prog > bestP) { newTgt = e; bestP = e.prog; }
            }
            if (newTgt) { p.target = newTgt; }
            else { p.alive = false; scene.remove(p.mesh); continue; }
        }
        _v.copy(p.target.mesh.position); _v.y+=.5; _v.sub(p.mesh.position);
        if (_v.length()<.3) {
            p.alive=false; scene.remove(p.mesh);
            if (p.splash>0) {
                for (const e of S.enemies) { if(!e.alive)continue; const d=e.mesh.position.distanceTo(p.mesh.position); if(d<=p.splash)dmgEnemy(e,p.dmg*(1-d/p.splash*.5),p.slow,updateHUD,false,p.slowDur); }
                hitFX(p.mesh.position, 0xffbb66, 8);
                splashFX(p.mesh.position, p.splash, 0xffaa33);
            } else {
                const didCrit = p.crit > 0 && Math.random() < p.crit;
                dmgEnemy(p.target, p.dmg, p.slow, updateHUD, didCrit, p.slowDur);
                hitFX(p.mesh.position, didCrit ? 0xff4466 : 0x7766ff, didCrit ? 6 : 4);
            }
        } else {
            _v.normalize().multiplyScalar(p.speed*dt);
            p.mesh.position.add(_v);
            p.mesh.rotation.x+=dt*8; p.mesh.rotation.z+=dt*5;
        }
    }

    // Hit particles
    for (const p of S.parts) {
        p.vel.y -= 5*dt; p.mesh.position.addScaledVector(p.vel, dt);
        p.life -= dt*2.5; p.mesh.material.opacity = Math.max(p.life,0);
        p.mesh.rotation.x += dt*4;
        if (p.life<=0) scene.remove(p.mesh);
    }

    // Splash ground FX
    for (const fx of S.splashFX) {
        fx.life -= dt * 1.0;
        const p = 1 - Math.max(fx.life, 0); // 0 -> 1 progress

        // Ring expands outward
        const ringScale = p * fx.maxRadius * 1.2;
        fx.ring.scale.set(ringScale, ringScale, ringScale);
        fx.ringMat.opacity = Math.max(fx.life, 0) * 0.5;

        // Disc expands then fades
        const discScale = Math.min(p * 2, 1) * fx.maxRadius;
        fx.disc.scale.set(discScale, discScale, discScale);
        fx.discMat.opacity = Math.max(fx.life, 0) * 0.15;

        if (fx.life <= 0) {
            fx.ringMat.dispose();
            fx.discMat.dispose();
            scene.remove(fx.ring);
            scene.remove(fx.disc);
        }
    }
    S.splashFX = S.splashFX.filter(fx => fx.life > 0);

    // Cleanup
    S.enemies = S.enemies.filter(e=>e.alive);
    S.projs = S.projs.filter(p=>p.alive);
    S.parts = S.parts.filter(p=>p.life>0);
    if (S.waveActive && S.spawned>=S.inWave && S.enemies.length===0) endWave(updateHUD);

    // HUD live
    const now = performance.now();
    S.dps = S.dps.filter(e=>now-e.t<3000);
    const dpsVal = Math.round(S.dps.reduce((s,e)=>s+e.d,0)/3);
    const dpsEl = document.querySelector('#hud-dps .dv');
    if (dpsEl) dpsEl.textContent = dpsVal;
    if (S.waveActive) {
        const k = S.spawned-S.enemies.length;
        document.getElementById('wpb').style.width = (k/S.inWave*100)+'%';
        document.getElementById('winfo').textContent = `${S.enemies.length} active | ${S.inWave-S.spawned} incoming`;
    } else { document.getElementById('wpb').style.width='0%'; document.getElementById('winfo').textContent=''; }
}
