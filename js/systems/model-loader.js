import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

// === SHARD MODEL ===
let shardTemplate = null;
let shardMatSolid = null;
let shardMatGhost = null;

const shardPool = [];
export const POOL_SIZE = 20;

export function fillPool() {
    if (!shardTemplate) return;
    while (shardPool.length < POOL_SIZE) {
        const c = shardTemplate.clone(true);
        c.traverse(ch => {
            if (ch.isMesh) { ch.material = shardMatSolid; ch.castShadow = true; ch.receiveShadow = true; }
        });
        shardPool.push(c);
    }
}

export function cloneShard(ghost = false) {
    if (!shardTemplate) return null;
    if (ghost) {
        const c = shardTemplate.clone(true);
        c.traverse(ch => {
            if (ch.isMesh) { ch.material = shardMatGhost; ch.castShadow = false; ch.receiveShadow = false; }
        });
        return c;
    }
    if (shardPool.length > 0) return shardPool.pop();
    const c = shardTemplate.clone(true);
    c.traverse(ch => {
        if (ch.isMesh) { ch.material = shardMatSolid; ch.castShadow = true; ch.receiveShadow = true; }
    });
    return c;
}

// === MONOLITH MODEL ===
let monolithTemplate = null;
let monolithMatSolid = null;
let monolithMatGhost = null;

const monolithPool = [];
const MONO_POOL = 10;

function fillMonolithPool() {
    if (!monolithTemplate) return;
    while (monolithPool.length < MONO_POOL) {
        const c = monolithTemplate.clone(true);
        c.traverse(ch => {
            if (ch.isMesh) { ch.material = monolithMatSolid; ch.castShadow = true; ch.receiveShadow = true; }
        });
        monolithPool.push(c);
    }
}

export function cloneMonolith(ghost = false) {
    if (!monolithTemplate) return null;
    if (ghost) {
        const c = monolithTemplate.clone(true);
        c.traverse(ch => {
            if (ch.isMesh) { ch.material = monolithMatGhost; ch.castShadow = false; ch.receiveShadow = false; }
        });
        return c;
    }
    if (monolithPool.length > 0) return monolithPool.pop();
    const c = monolithTemplate.clone(true);
    c.traverse(ch => {
        if (ch.isMesh) { ch.material = monolithMatSolid; ch.castShadow = true; ch.receiveShadow = true; }
    });
    return c;
}

// === LOAD ALL MODELS ===
const loader = new GLTFLoader();

const MAX_CELL_WIDTH = 1.8; // max footprint within a 2x2 grid cell

function loadModel(url, targetHeight) {
    return new Promise(resolve => {
        loader.load(url, gltf => {
            const model = gltf.scene;
            const box = new THREE.Box3().setFromObject(model);
            const size = new THREE.Vector3(); box.getSize(size);
            const center = new THREE.Vector3(); box.getCenter(center);
            const wrapper = new THREE.Group();
            model.position.sub(center);
            model.position.y += size.y / 2;
            wrapper.add(model);
            // Scale to fit height AND stay within grid cell
            const sH = targetHeight / Math.max(size.y, 0.01);
            const sW = MAX_CELL_WIDTH / Math.max(size.x, size.z, 0.01);
            const s = Math.min(sH, sW);
            wrapper.scale.setScalar(s);
            resolve({ wrapper, model });
        }, undefined, err => {
            console.warn('GLB load failed:', url, err);
            resolve(null);
        });
    });
}

export const shardReady = loadModel('assets/models/pink+crystal+3d+model.glb', 2.6).then(result => {
    if (!result) return;
    const { wrapper, model } = result;
    let origMat = null;
    model.traverse(ch => { if (ch.isMesh && !origMat) origMat = ch.material; });
    if (origMat) {
        shardMatSolid = origMat.clone();
        shardMatSolid.emissive = new THREE.Color(0x3355cc);
        shardMatSolid.emissiveIntensity = 0.3;
        if (shardMatSolid.clearcoat !== undefined) { shardMatSolid.clearcoat = 0.5; shardMatSolid.clearcoatRoughness = 0.1; }

        shardMatGhost = origMat.clone();
        shardMatGhost.emissive = new THREE.Color(0x3355cc);
        shardMatGhost.emissiveIntensity = 0.08;
        shardMatGhost.transparent = true;
        shardMatGhost.opacity = 0.3;
    }
    shardTemplate = wrapper;
    fillPool();
    console.log('Shard GLB loaded, pool:', shardPool.length);
});

export const monolithReady = loadModel('assets/models/golden+obelisk+3d+model.glb', 2.8).then(result => {
    if (!result) return;
    const { wrapper, model } = result;
    let origMat = null;
    model.traverse(ch => { if (ch.isMesh && !origMat) origMat = ch.material; });
    if (origMat) {
        monolithMatSolid = origMat.clone();
        monolithMatSolid.emissive = new THREE.Color(0xcc8822);
        monolithMatSolid.emissiveIntensity = 0.35;
        if (monolithMatSolid.clearcoat !== undefined) { monolithMatSolid.clearcoat = 0.4; monolithMatSolid.clearcoatRoughness = 0.15; }

        monolithMatGhost = origMat.clone();
        monolithMatGhost.emissive = new THREE.Color(0xcc8822);
        monolithMatGhost.emissiveIntensity = 0.08;
        monolithMatGhost.transparent = true;
        monolithMatGhost.opacity = 0.3;
    }
    monolithTemplate = wrapper;
    fillMonolithPool();
    console.log('Monolith GLB loaded, pool:', monolithPool.length);
});

// Wait for all models
export const allModelsReady = Promise.all([shardReady, monolithReady]);
