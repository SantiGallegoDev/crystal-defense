import * as THREE from 'three';
import { scene } from '../core/engine.js';
import { WP } from '../data/path-data.js';

// PolyLineCurve — straight segments, no interpolation
export class PolyLineCurve extends THREE.Curve {
    constructor(points) {
        super();
        this.pts = points;
        this.lengths = [0];
        for (let i = 1; i < points.length; i++) {
            this.lengths.push(this.lengths[i-1] + points[i].distanceTo(points[i-1]));
        }
        this.totalLen = this.lengths[this.lengths.length - 1];
    }
    getPoint(t) {
        const d = t * this.totalLen;
        for (let i = 1; i < this.pts.length; i++) {
            if (d <= this.lengths[i]) {
                const segLen = this.lengths[i] - this.lengths[i-1];
                const frac = segLen > 0 ? (d - this.lengths[i-1]) / segLen : 0;
                return new THREE.Vector3().lerpVectors(this.pts[i-1], this.pts[i], frac);
            }
        }
        return this.pts[this.pts.length - 1].clone();
    }
}

function buildCurve() {
    return new PolyLineCurve(WP.map(([x, z]) => new THREE.Vector3(x, 0, z)));
}

let _pathCurve = buildCurve();
export function getPathCurve() { return _pathCurve; }

// Path visuals container (mutable refs for update loop access)
export const pathVisuals = { roadMesh: null, portalA: null, portalB: null, edgeLines: [] };

const PY = .06, PW = 1.8;
const roadMat = new THREE.MeshStandardMaterial({
    color: 0x7770aa, roughness: .12, metalness: .3,
    emissive: 0x443366, emissiveIntensity: .12,
    side: THREE.DoubleSide,
});

function buildRoadGroup() {
    const group = new THREE.Group();
    const geo = new THREE.PlaneGeometry(1, 1);
    geo.rotateX(-Math.PI / 2);

    for (let i = 0; i < WP.length - 1; i++) {
        const [ax, az] = WP[i], [bx, bz] = WP[i + 1];
        const dx = bx - ax, dz = bz - az;
        const len = Math.hypot(dx, dz);
        if (len < .01) continue;
        const mx = (ax + bx) / 2, mz = (az + bz) / 2;
        const segLen = len + PW;

        const seg = new THREE.Mesh(geo, roadMat);
        seg.scale.set(PW, 1, segLen);
        seg.position.set(mx, PY, mz);
        seg.rotation.y = Math.atan2(dx, dz);
        seg.receiveShadow = true;
        group.add(seg);
    }

    for (let i = 1; i < WP.length - 1; i++) {
        const [x, z] = WP[i];
        const corner = new THREE.Mesh(geo, roadMat);
        corner.scale.set(PW, 1, PW);
        corner.position.set(x, PY, z);
        corner.receiveShadow = true;
        group.add(corner);
    }
    return group;
}

function mkPortal(pos, col) {
    const g = new THREE.Group();
    const ring = new THREE.Mesh(
        new THREE.TorusGeometry(.6, .06, 12, 28),
        new THREE.MeshStandardMaterial({ color: col, emissive: col, emissiveIntensity: 1.0, transparent: true, opacity: .55 })
    );
    ring.rotation.x = Math.PI / 2; ring.position.y = .6; g.add(ring);
    const core = new THREE.Mesh(
        new THREE.IcosahedronGeometry(.18, 1),
        new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: col, emissiveIntensity: 1.8 })
    );
    core.position.y = .6; g.add(core);
    g.position.set(pos[0], 0, pos[1]);
    scene.add(g); return g;
}

export function buildPathVisuals() {
    if (pathVisuals.roadMesh) scene.remove(pathVisuals.roadMesh);
    for (const l of pathVisuals.edgeLines) scene.remove(l);
    pathVisuals.edgeLines.length = 0;
    if (pathVisuals.portalA) scene.remove(pathVisuals.portalA);
    if (pathVisuals.portalB) scene.remove(pathVisuals.portalB);

    pathVisuals.roadMesh = buildRoadGroup();
    scene.add(pathVisuals.roadMesh);

    pathVisuals.portalA = mkPortal(WP[0], 0x44ff88);
    pathVisuals.portalB = mkPortal(WP[WP.length-1], 0xff5577);
}

// Path samples for collision (flat array [x,z,x,z,...])
export const pathSamples = [];

export function rebuildPathSamples() {
    pathSamples.length = 0;
    for (let t = 0; t <= 1; t += .008) {
        const p = _pathCurve.getPointAt(t);
        pathSamples.push(p.x, p.z);
    }
}

// Occupied cells set
export const occ = new Set();

export function rebuildOccupied() {
    occ.clear();
    for (let t = 0; t <= 1; t += .0015) {
        const p = _pathCurve.getPointAt(t);
        const cx = Math.round(p.x/2)*2, cz = Math.round(p.z/2)*2;
        for (let dx = -1; dx <= 1; dx++)
            for (let dz = -1; dz <= 1; dz++)
                occ.add(`${cx+dx*2},${cz+dz*2}`);
    }
}

export function rebuildPath() {
    _pathCurve = buildCurve();
    buildPathVisuals();
    rebuildPathSamples();
    rebuildOccupied();
}

// Initial build
rebuildPathSamples();
rebuildOccupied();
