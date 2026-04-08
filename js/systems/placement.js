import * as THREE from 'three';
import { scene, camera, renderer } from '../core/engine.js';
import { mouse } from '../core/controls.js';
import { S } from '../core/state.js';
import { TD, getTowerDef, totalInvested } from '../data/towers.js';
import { pathSamples } from './path.js';
import { makeTower, upgradeTowerVisual } from './tower-factory.js';
import { fillPool, POOL_SIZE } from './model-loader.js';
import { playUpgrade } from './audio.js';

const CELL = 2; // grid cell size, must match grid-editor.js
const PATH_BLOCK = 1.4;
const PATH_BLOCK_SQ = PATH_BLOCK * PATH_BLOCK;

export const ray = new THREE.Raycaster();
export const gPlane = new THREE.Plane(new THREE.Vector3(0,1,0), 0);
let ghostM = null, ghostR = null;

// Snap world position to grid cell center
export function freePos(v) {
    const gx = Math.round(v.x / CELL);
    const gz = Math.round(v.z / CELL);
    return new THREE.Vector3(gx * CELL, 0, gz * CELL);
}

export function canPlace(p) {
    if (Math.abs(p.x) > 19 || Math.abs(p.z) > 14) return false;
    // Check path proximity
    for (let i = 0; i < pathSamples.length; i += 2) {
        const dx = p.x - pathSamples[i], dz = p.z - pathSamples[i+1];
        if (dx*dx + dz*dz < PATH_BLOCK_SQ) return false;
    }
    // One tower per grid cell (exact position match)
    for (const tw of S.towers) {
        if (tw.gp.x === p.x && tw.gp.z === p.z) return false;
    }
    return true;
}

export function showGhost(t) {
    hideGhost();
    ghostM = makeTower(t, true); scene.add(ghostM);
    const range = TD[t].levels[0].range;
    const color = TD[t].color;
    ghostR = new THREE.Group();
    // Filled disc
    const discGeo = new THREE.CircleGeometry(range, 48);
    discGeo.rotateX(-Math.PI/2);
    ghostR.add(new THREE.Mesh(discGeo, new THREE.MeshBasicMaterial({
        color, transparent:true, opacity:.04, side:THREE.DoubleSide, depthWrite:false
    })));
    // Outer ring (thick)
    const ringGeo = new THREE.RingGeometry(range-.12, range, 48);
    ringGeo.rotateX(-Math.PI/2);
    ghostR.add(new THREE.Mesh(ringGeo, new THREE.MeshBasicMaterial({
        color, transparent:true, opacity:.25, side:THREE.DoubleSide, depthWrite:false
    })));
    // Glow ring (wider, softer)
    const glowGeo = new THREE.RingGeometry(range-.3, range+.2, 48);
    glowGeo.rotateX(-Math.PI/2);
    ghostR.add(new THREE.Mesh(glowGeo, new THREE.MeshBasicMaterial({
        color, transparent:true, opacity:.08, side:THREE.DoubleSide, depthWrite:false
    })));
    ghostR.position.y = .1; scene.add(ghostR);
}

export function hideGhost() {
    if (ghostM) { scene.remove(ghostM); ghostM = null; }
    if (ghostR) { scene.remove(ghostR); ghostR = null; }
}

export function getGhostM() { return ghostM; }
export function getGhostR() { return ghostR; }

// Cost scales +50% per existing tower of the same type
export function getPlaceCost(type) {
    const base = TD[type].levels[0].cost;
    const count = S.towers.filter(t => t.type === type).length;
    return Math.floor(base * Math.pow(1.5, count));
}

export function place(gp, type, updateHUD) {
    const def = getTowerDef(type, 1);
    const cost = getPlaceCost(type);
    if (S.gold < cost || !canPlace(gp)) return;
    S.gold -= cost;
    const m = makeTower(type); m.position.set(gp.x, 0, gp.z);
    m.rotation.y = Math.floor(Math.random() * 4) * (Math.PI / 2);
    scene.add(m);
    S.towers.push({ mesh:m, def, type, gp:gp.clone(), cd:0, level:1, invested:cost });
    updateHUD();
    if (type === 'shard' && POOL_SIZE) {
        requestAnimationFrame(() => fillPool());
    }
}

export function upgradeTower(tower, updateHUD) {
    if (tower.level >= 3) return false;
    const nextLevel = tower.level + 1;
    const nextDef = getTowerDef(tower.type, nextLevel);
    const upgCost = TD[tower.type].levels[nextLevel - 1].upgCost;
    if (S.gold < upgCost) return false;
    S.gold -= upgCost;
    tower.level = nextLevel;
    tower.def = nextDef;
    tower.invested = (tower.invested || 0) + upgCost;
    upgradeTowerVisual(tower);
    playUpgrade();
    updateHUD();
    return true;
}

export function sellTower(tower, updateHUD) {
    const invested = tower.invested || totalInvested(tower.type, tower.level);
    const refund = Math.floor(invested * 0.6);
    S.gold += refund;
    scene.remove(tower.mesh);
    // Remove selection ring if present
    if (tower._selRing) { scene.remove(tower._selRing); tower._selRing = null; }
    const idx = S.towers.indexOf(tower);
    if (idx !== -1) S.towers.splice(idx, 1);
    if (S.selectedTower === tower) S.selectedTower = null;
    updateHUD();
    return refund;
}

// Raycast to find a placed tower under the cursor
export function findTowerAtCursor() {
    ray.setFromCamera(mouse, camera);
    for (const tw of S.towers) {
        const hits = ray.intersectObject(tw.mesh, true);
        if (hits.length > 0) return tw;
    }
    return null;
}
