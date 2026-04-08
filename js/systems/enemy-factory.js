import * as THREE from 'three';
import { G } from './geometry.js';

// Shared materials per enemy type (avoid per-instance creation)
const _matCache = {};
function getEnemyMat(type) {
    if (_matCache[type]) return _matCache[type];
    const mats = {};
    if (type === 'normal') {
        mats.body = new THREE.MeshPhysicalMaterial({
            color: 0x6666aa, emissive: 0x4455aa, emissiveIntensity: 0.45,
            roughness: 0.04, metalness: 0.45, transmission: 0.15,
            transparent: true, opacity: 0.82, clearcoat: 0.9,
            clearcoatRoughness: 0.05, envMapIntensity: 0.6,
        });
        mats.core = new THREE.MeshBasicMaterial({
            color: 0x88aaee, transparent: true, opacity: 0.3,
        });
    } else if (type === 'fast') {
        mats.body = new THREE.MeshPhysicalMaterial({
            color: 0xcc9944, emissive: 0xcc7722, emissiveIntensity: 0.5,
            roughness: 0.04, metalness: 0.45, clearcoat: 0.9,
            clearcoatRoughness: 0.05, transparent: true, opacity: 0.88,
            envMapIntensity: 0.5,
        });
        mats.trail = new THREE.MeshStandardMaterial({
            color: 0xffbb55, emissive: 0xff9922, emissiveIntensity: 0.6,
            transparent: true, opacity: 0.35, roughness: 0.1,
        });
    } else {
        mats.body = new THREE.MeshPhysicalMaterial({
            color: 0x8855bb, emissive: 0x7733aa, emissiveIntensity: 0.4,
            roughness: 0.04, metalness: 0.45, transmission: 0.1,
            transparent: true, opacity: 0.82, clearcoat: 0.9,
            clearcoatRoughness: 0.05, envMapIntensity: 0.6,
        });
        mats.debris = new THREE.MeshStandardMaterial({
            color: 0xaa77dd, emissive: 0x7744bb, emissiveIntensity: 0.55,
            roughness: 0.1, metalness: 0.4,
        });
        mats.core = new THREE.MeshBasicMaterial({
            color: 0x9966cc, transparent: true, opacity: 0.2,
        });
    }
    _matCache[type] = mats;
    return mats;
}

export function makeEnemy(type) {
    const g = new THREE.Group();
    const mats = getEnemyMat(type);
    let bodyRef;

    if (type === 'normal') {
        const body = new THREE.Mesh(G.oct, mats.body.clone());
        body.scale.setScalar(0.3); body.position.y = 0.5;
        body.castShadow = true; g.add(body); bodyRef = body;
        const core = new THREE.Mesh(G.ico1, mats.core);
        core.scale.setScalar(0.15); core.position.y = 0.5; g.add(core);
    } else if (type === 'fast') {
        const body = new THREE.Mesh(G.oct, mats.body.clone());
        body.scale.set(0.18, 0.28, 0.18); body.position.y = 0.45;
        body.castShadow = true; g.add(body); bodyRef = body;
        const trail = new THREE.Mesh(G.cone, mats.trail);
        trail.scale.set(0.08, 0.2, 0.08); trail.position.set(0, 0.35, -0.2); trail.rotation.x = 0.5;
        g.add(trail);
    } else {
        const body = new THREE.Mesh(G.ico1, mats.body.clone());
        body.scale.setScalar(0.42); body.position.y = 0.6;
        body.castShadow = true; g.add(body); bodyRef = body;
        for (let i = 0; i < 4; i++) {
            const a = (i / 4) * Math.PI * 2;
            const deb = new THREE.Mesh(G.oct, mats.debris);
            deb.scale.setScalar(0.06);
            deb.position.set(Math.cos(a) * 0.5, 0.6, Math.sin(a) * 0.5);
            g.add(deb);
        }
        const core = new THREE.Mesh(G.ico1, mats.core);
        core.scale.setScalar(0.22); core.position.y = 0.6; g.add(core);
    }

    // HP bars
    const hpBg = new THREE.Mesh(G.hp, new THREE.MeshBasicMaterial({
        color: 0x888899, side: THREE.DoubleSide, transparent: true, opacity: 0, depthWrite: false,
    }));
    hpBg.position.y = 1.2; hpBg.visible = false; g.add(hpBg);
    const hpBar = new THREE.Mesh(G.hp, new THREE.MeshBasicMaterial({
        color: 0x99aaff, side: THREE.DoubleSide, transparent: true, opacity: 0, depthWrite: false,
    }));
    hpBar.position.y = 1.2; hpBar.visible = false; g.add(hpBar);

    return { group: g, bodyRef, hpBar, hpBg };
}
