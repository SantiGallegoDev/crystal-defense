import * as THREE from 'three';
import { G, mkMat, mkPBR, getSelRingGeos } from './geometry.js';
import { TD } from '../data/towers.js';
import { scene } from '../core/engine.js';
import { cloneShard, cloneMonolith } from './model-loader.js';

export function makeTower(type, ghost = false) {
    const d = TD[type];
    const g = new THREE.Group();
    const em = ghost ? 0.15 : 0.6;

    if (type === 'shard') {
        // Try GLB model first
        const glbClone = cloneShard(ghost);
        if (glbClone) { g.add(glbClone); }
        else {
            // Crystalline multi-faceted tower
            // Hexagonal base platform
            const base = new THREE.Mesh(G.cyl, mkPBR(0x6677aa, d.em, em * 0.2, ghost, { roughness: 0.3, metalness: 0.6 }));
            base.scale.set(0.45, 0.1, 0.45); base.position.y = 0.05;
            base.castShadow = !ghost; g.add(base);

            // Main crystal spire
            const main = new THREE.Mesh(G.cone8, mkPBR(d.color, d.em, em, ghost, {
                roughness: 0.05, metalness: 0.2, clearcoat: 1.0, clearcoatRoughness: 0.05,
                transmission: 0.15, thickness: 0.8,
            }));
            main.scale.set(0.2, d.h, 0.2); main.position.y = 0.1 + d.h / 2;
            main.castShadow = !ghost; g.add(main);

            // 4 side crystal shards at different heights and angles
            for (let i = 0; i < 4; i++) {
                const a = (i / 4) * Math.PI * 2 + 0.4;
                const sh = 0.3 + Math.random() * 0.35;
                const dist = 0.18 + Math.random() * 0.08;
                const s = new THREE.Mesh(G.cone8, mkPBR(
                    i % 2 === 0 ? 0x6699ff : d.color, d.em, em * 0.7, ghost,
                    { roughness: 0.06, clearcoat: 0.9, transmission: 0.1, thickness: 0.5 }
                ));
                s.scale.set(0.06, sh, 0.06);
                s.position.set(Math.cos(a) * dist, 0.15 + sh / 2, Math.sin(a) * dist);
                s.rotation.x = Math.cos(a) * 0.2; s.rotation.z = -Math.sin(a) * 0.2;
                s.castShadow = !ghost; g.add(s);
            }

            // Tip crystal - bright emissive
            const tip = new THREE.Mesh(G.oct, mkPBR(0xeeffff, d.color, em * 3, ghost, {
                roughness: 0.02, transmission: 0.3, thickness: 1.0, clearcoat: 1.0,
            }));
            tip.scale.set(0.06, 0.09, 0.06); tip.position.y = 0.12 + d.h + 0.03;
            g.add(tip);

            // Energy ring around mid-section
            const ring = new THREE.Mesh(G.ring, mkMat(d.color, d.color, em * 1.5, ghost));
            ring.scale.set(0.3, 0.3, 0.3); ring.position.y = d.h * 0.5;
            ring.rotation.x = Math.PI / 2;
            g.add(ring);
        }
    } else if (type === 'spire') {
        // Elegant tall sniper tower with gem crown

        // Ornate base
        const base = new THREE.Mesh(G.ico0, mkPBR(0x7766aa, d.em, em * 0.2, ghost, {
            roughness: 0.25, metalness: 0.7,
        }));
        base.scale.set(0.38, 0.1, 0.38); base.position.y = 0.05;
        base.castShadow = !ghost; g.add(base);

        // Main tall spire - very smooth/glossy
        const main = new THREE.Mesh(G.cone8, mkPBR(d.color, d.em, em, ghost, {
            roughness: 0.03, metalness: 0.15, clearcoat: 1.0, clearcoatRoughness: 0.02,
        }));
        main.scale.set(0.16, d.h, 0.16); main.position.y = 0.1 + d.h / 2;
        main.castShadow = !ghost; g.add(main);

        // 4 elegant fins spiraling up
        for (let i = 0; i < 4; i++) {
            const a = (i / 4) * Math.PI * 2;
            const sh = 0.6 + Math.random() * 0.3;
            const s = new THREE.Mesh(G.cone, mkPBR(0xaa88dd, d.em, em * 0.8, ghost, {
                roughness: 0.06, metalness: 0.5,
            }));
            s.scale.set(0.04, sh, 0.04);
            s.position.set(Math.cos(a) * 0.14, 0.6 + sh / 2, Math.sin(a) * 0.14);
            s.rotation.x = Math.cos(a) * 0.25; s.rotation.z = -Math.sin(a) * 0.25;
            s.castShadow = !ghost; g.add(s);
        }

        // Crown gem - large, faceted, highly emissive
        const gem = new THREE.Mesh(G.dodec, mkPBR(0xeeddff, d.color, em * 3.5, ghost, {
            roughness: 0.02, transmission: 0.2, thickness: 1.0, clearcoat: 1.0,
        }));
        gem.scale.set(0.08, 0.12, 0.08); gem.position.y = 0.12 + d.h + 0.05;
        g.add(gem);

        // Accent rings
        for (let i = 0; i < 2; i++) {
            const r = new THREE.Mesh(G.ring, mkMat(d.color, d.color, em * 1.2, ghost));
            r.scale.setScalar(0.2 + i * 0.08);
            r.position.y = 0.8 + i * 0.7;
            r.rotation.x = Math.PI / 2;
            g.add(r);
        }

    } else if (type === 'frost') {
        // Ice crystal cluster - organic, chaotic

        // Frozen base
        const base = new THREE.Mesh(G.cyl, mkPBR(0x88aacc, d.em, em * 0.2, ghost, {
            roughness: 0.08, metalness: 0.1, transmission: 0.2, thickness: 0.5, clearcoat: 1.0,
        }));
        base.scale.set(0.38, 0.08, 0.38); base.position.y = 0.04;
        g.add(base);

        // 7 ice crystal shards - random cluster
        for (let i = 0; i < 7; i++) {
            const a = (i / 7) * Math.PI * 2;
            const sh = 0.25 + Math.random() * 0.55;
            const dist = 0.06 + Math.random() * 0.14;
            const c = new THREE.Mesh(G.cone8, mkPBR(
                i === 0 ? 0x88eeff : d.color, d.em,
                em * (0.6 + Math.random() * 0.4), ghost,
                { roughness: 0.03, clearcoat: 1.0, transmission: 0.25, thickness: 0.6 }
            ));
            c.scale.set(0.05, sh, 0.05);
            c.position.set(Math.cos(a) * dist, 0.08 + sh / 2, Math.sin(a) * dist);
            c.rotation.x = Math.cos(a) * (0.15 + Math.random() * 0.1);
            c.rotation.z = -Math.sin(a) * (0.15 + Math.random() * 0.1);
            c.castShadow = !ghost; g.add(c);
        }

        // Central tall crystal
        const center = new THREE.Mesh(G.cone8, mkPBR(0xbbf0ff, d.color, em * 1.8, ghost, {
            roughness: 0.02, clearcoat: 1.0, clearcoatRoughness: 0.02,
            transmission: 0.3, thickness: 1.0,
        }));
        center.scale.set(0.08, d.h, 0.08); center.position.y = 0.08 + d.h / 2;
        center.castShadow = !ghost; g.add(center);

        // Frost aura ring
        const aura = new THREE.Mesh(G.ring, mkMat(0x66eeff, 0x44ddff, em * 2, ghost, { opacity: 0.4, transparent: true }));
        aura.scale.setScalar(0.4); aura.position.y = d.h * 0.3;
        aura.rotation.x = Math.PI / 2;
        g.add(aura);

    } else if (type === 'monolith') {
        const glbClone = cloneMonolith(ghost);
        if (glbClone) {
            g.add(glbClone);
        } else {
            // Fallback procedural monolith
            const base = new THREE.Mesh(G.oct, mkPBR(0x887755, d.em, em * 0.15, ghost, {
                roughness: 0.45, metalness: 0.6,
            }));
            base.scale.set(0.48, 0.12, 0.48); base.position.y = 0.06;
            base.castShadow = !ghost; g.add(base);

            const main = new THREE.Mesh(G.cylT, mkPBR(d.color, d.em, em, ghost, {
                roughness: 0.1, metalness: 0.35, clearcoat: 0.4,
            }));
            main.scale.set(0.26, d.h, 0.26); main.position.y = 0.12 + d.h / 2;
            main.castShadow = !ghost; g.add(main);

            for (let i = 0; i < 5; i++) {
                const a = (i / 5) * Math.PI * 2;
                const frag = new THREE.Mesh(G.oct, mkPBR(d.color, d.em, em * 1.8, ghost, {
                    roughness: 0.08, metalness: 0.5,
                }));
                frag.scale.set(0.045, 0.07, 0.045);
                frag.position.set(Math.cos(a) * 0.4, 0.8, Math.sin(a) * 0.4);
                frag.rotation.set(Math.random(), Math.random(), Math.random());
                g.add(frag);
            }

            const crown = new THREE.Mesh(G.ico0, mkPBR(0xffeebb, d.color, em * 3, ghost, {
                roughness: 0.02, metalness: 0.1, clearcoat: 1.0,
            }));
            crown.scale.setScalar(0.1); crown.position.y = 0.15 + d.h + 0.06;
            g.add(crown);

            const baseRing = new THREE.Mesh(G.ring, mkMat(d.color, d.color, em * 1.5, ghost));
            baseRing.scale.setScalar(0.45); baseRing.position.y = 0.2;
            baseRing.rotation.x = Math.PI / 2;
            g.add(baseRing);
        }
    }

    // All towers cast shadow
    g.traverse(ch => { if (ch.isMesh) ch.castShadow = !ghost; });

    return g;
}

// Visual upgrade effects
export function upgradeTowerVisual(towerObj) {
    const lv = towerObj.level;
    const d = TD[towerObj.type];
    const g = towerObj.mesh;

    // Remove previous level decorations
    const toRemove = [];
    g.traverse(ch => { if (ch.userData.levelDecor) toRemove.push(ch); });
    toRemove.forEach(ch => g.remove(ch));

    // Scale based on level
    const scl = lv === 3 ? 1.15 : lv === 2 ? 1.08 : 1;
    g.scale.setScalar(scl);

    // Boost emissive
    const emMult = lv === 3 ? 2.2 : lv === 2 ? 1.5 : 1.0;
    g.traverse(ch => {
        if (ch.isMesh && ch.material.emissiveIntensity !== undefined) {
            const base = ch.userData._baseEm ?? ch.material.emissiveIntensity;
            ch.userData._baseEm = base;
            ch.material.emissiveIntensity = base * emMult;
        }
    });

    if (lv >= 2) {
        const count = lv === 3 ? 4 : 2;
        const orbitR = lv === 3 ? 0.5 : 0.35;
        for (let i = 0; i < count; i++) {
            const orb = new THREE.Mesh(G.oct,
                new THREE.MeshStandardMaterial({
                    color: d.color, emissive: d.em,
                    emissiveIntensity: lv === 3 ? 2.5 : 1.5,
                    transparent: true, opacity: 0.8,
                    roughness: 0.05, metalness: 0.3,
                })
            );
            orb.scale.setScalar(lv === 3 ? 0.045 : 0.03);
            orb.userData.levelDecor = true;
            orb.userData.orbitIndex = i;
            orb.userData.orbitCount = count;
            orb.userData.orbitR = orbitR;
            orb.userData.orbitH = d.h * 0.5;
            g.add(orb);
        }

        if (lv === 3) {
            // Vertical energy beam
            const beamMat = new THREE.MeshBasicMaterial({
                color: d.color, transparent: true, opacity: 0.12,
            });
            const beam = new THREE.Mesh(G.cyl6, beamMat);
            beam.scale.set(0.02, 1.2, 0.02);
            beam.position.y = d.h + 0.8;
            beam.userData.levelDecor = true;
            beam.userData.isBeam = true;
            g.add(beam);
        }
    }
}

// Animate level decorations
export function animateLevelDecor(towerObj, t) {
    towerObj.mesh.traverse(ch => {
        if (!ch.userData.levelDecor) return;
        if (ch.userData.orbitIndex !== undefined) {
            const i = ch.userData.orbitIndex;
            const n = ch.userData.orbitCount;
            const r = ch.userData.orbitR;
            const h = ch.userData.orbitH;
            const speed = n > 2 ? 1.8 : 1.2;
            const a = t * speed + (i / n) * Math.PI * 2;
            ch.position.set(Math.cos(a) * r, h + Math.sin(t * 2 + i) * 0.08, Math.sin(a) * r);
            ch.rotation.x = t * 2.5;
            ch.rotation.z = t * 1.5;
        }
        if (ch.userData.isBeam) {
            ch.material.opacity = 0.08 + Math.sin(t * 3) * 0.05;
        }
    });
}

// Selection ring - uses cached geometries
export function addSelectionRing(towerObj) {
    removeSelectionRing(towerObj);
    const range = towerObj.def.range;
    const color = TD[towerObj.type].color;
    const geos = getSelRingGeos(range);
    const group = new THREE.Group();
    group.position.copy(towerObj.mesh.position);
    group.position.y = 0.1;

    group.add(new THREE.Mesh(geos.disc, new THREE.MeshBasicMaterial({
        color, transparent: true, opacity: 0.05, side: THREE.DoubleSide, depthWrite: false,
    })));
    group.add(new THREE.Mesh(geos.ring, new THREE.MeshBasicMaterial({
        color, transparent: true, opacity: 0.3, side: THREE.DoubleSide, depthWrite: false,
    })));
    group.add(new THREE.Mesh(geos.glow, new THREE.MeshBasicMaterial({
        color, transparent: true, opacity: 0.1, side: THREE.DoubleSide, depthWrite: false,
    })));

    group.userData.selRing = true;
    scene.add(group);
    towerObj._selRing = group;
}

export function removeSelectionRing(towerObj) {
    if (towerObj._selRing) {
        // Dispose materials (geometries are cached/shared)
        towerObj._selRing.traverse(ch => {
            if (ch.isMesh && ch.material) ch.material.dispose();
        });
        scene.remove(towerObj._selRing);
        towerObj._selRing = null;
    }
}
