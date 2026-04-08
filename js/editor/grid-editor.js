import * as THREE from 'three';
import { scene, camera } from '../core/engine.js';
import { gPlane } from '../systems/placement.js';
import { pathVisuals } from '../systems/path.js';
import { desel } from '../ui/tower-panel.js';

export const editor = {
    active: false,
    cells: new Set(),
    meshes: new Map(),
    gridGroup: null,
    hoverMesh: null,
    painting: false,
    erasing: false,
    CELL: 2,
    COLS: 20,
    ROWS: 14,
};

const edUI = document.createElement('div');
edUI.id = 'grid-editor';
edUI.innerHTML = `
<div style="position:absolute;top:8px;left:50%;transform:translateX(-50%);z-index:200;
    background:rgba(0,0,0,.8);padding:10px 16px;border-radius:8px;border:1px solid #88ff44;
    display:none;font-family:monospace;color:#88ff44;font-size:12px;text-align:center;pointer-events:all;max-width:500px">
    <b>GRID EDITOR</b> (G to close)<br>
    <span style="color:#aaa;font-size:11px">Click = paint | Right click = erase | Ctrl+Click = START | Shift+Click = END</span><br>
    <button id="ge-clear" style="margin:6px 2px;padding:4px 12px;background:#220000;border:1px solid #ff4444;color:#ff4444;cursor:pointer;border-radius:3px;font-size:11px">CLEAR</button>
    <button id="ge-export" style="margin:6px 2px;padding:4px 12px;background:#002200;border:1px solid #44ff44;color:#44ff44;cursor:pointer;border-radius:3px;font-size:11px">EXPORT PATH</button>
    <div id="ge-out" style="margin-top:4px;font-size:10px;color:#aacc66;min-height:12px;word-break:break-all;max-height:60px;overflow-y:auto"></div>
</div>`;
document.body.appendChild(edUI);
const edPanel = edUI.querySelector('div');
const edOut = document.getElementById('ge-out');

const gridCellGeo = new THREE.PlaneGeometry(editor.CELL - .08, editor.CELL - .08);
gridCellGeo.rotateX(-Math.PI / 2);
const gridEmptyMat = new THREE.MeshBasicMaterial({ color: 0x444466, transparent: true, opacity: .08, side: THREE.DoubleSide });
const gridPaintMat = new THREE.MeshStandardMaterial({ color: 0x6655aa, emissive: 0x443377, emissiveIntensity: .3, roughness: .2, metalness: .3, side: THREE.DoubleSide });
const gridHoverMat = new THREE.MeshBasicMaterial({ color: 0xaaff44, transparent: true, opacity: .3, side: THREE.DoubleSide });

function createGrid() {
    editor.gridGroup = new THREE.Group();
    const C = editor.CELL;
    for (let x = -editor.COLS; x <= editor.COLS; x++) {
        for (let z = -editor.ROWS; z <= editor.ROWS; z++) {
            const cell = new THREE.Mesh(gridCellGeo, gridEmptyMat);
            cell.position.set(x * C, .03, z * C);
            editor.gridGroup.add(cell);
        }
    }
    editor.hoverMesh = new THREE.Mesh(gridCellGeo, gridHoverMat);
    editor.hoverMesh.position.y = .05;
    editor.hoverMesh.visible = false;
    editor.gridGroup.add(editor.hoverMesh);
    scene.add(editor.gridGroup);
}

function destroyGrid() {
    if (editor.gridGroup) { scene.remove(editor.gridGroup); editor.gridGroup = null; editor.hoverMesh = null; }
    for (const [, m] of editor.meshes) scene.remove(m);
    editor.meshes.clear();
}

function paintCell(gx, gz) {
    const key = `${gx},${gz}`;
    if (editor.cells.has(key)) return;
    editor.cells.add(key);
    const m = new THREE.Mesh(gridCellGeo, gridPaintMat);
    m.position.set(gx * editor.CELL, .07, gz * editor.CELL);
    scene.add(m);
    editor.meshes.set(key, m);
}

function eraseCell(gx, gz) {
    const key = `${gx},${gz}`;
    if (!editor.cells.has(key)) return;
    editor.cells.delete(key);
    const m = editor.meshes.get(key);
    if (m) { scene.remove(m); editor.meshes.delete(key); }
}

function clearAllCells() {
    for (const [, m] of editor.meshes) scene.remove(m);
    editor.meshes.clear();
    editor.cells.clear();
}

let startCell = null, endCell = null;
let startMarker = null, endMarker = null;
const markerGeo = new THREE.ConeGeometry(.4, .8, 6);

function setStart(gx, gz) {
    startCell = { x: gx, z: gz };
    if (startMarker) scene.remove(startMarker);
    startMarker = new THREE.Mesh(markerGeo, new THREE.MeshBasicMaterial({ color: 0x44ff88 }));
    startMarker.position.set(gx * editor.CELL, 1.2, gz * editor.CELL);
    scene.add(startMarker);
    paintCell(gx, gz);
    edOut.textContent = `START [${gx},${gz}]. Shift+Click for END.`;
}

function setEnd(gx, gz) {
    endCell = { x: gx, z: gz };
    if (endMarker) scene.remove(endMarker);
    endMarker = new THREE.Mesh(markerGeo, new THREE.MeshBasicMaterial({ color: 0xff4466 }));
    endMarker.position.set(gx * editor.CELL, 1.2, gz * editor.CELL);
    scene.add(endMarker);
    paintCell(gx, gz);
    edOut.textContent = `END [${gx},${gz}]. Paint path, then EXPORT.`;
}

function cellsToWaypoints() {
    if (!startCell || !endCell || editor.cells.size === 0) return [];
    const C = editor.CELL;
    const cellSet = new Set(editor.cells);
    const startKey = `${startCell.x},${startCell.z}`, endKey = `${endCell.x},${endCell.z}`;
    if (!cellSet.has(startKey) || !cellSet.has(endKey)) return [];

    const queue = [startKey]; const prev = new Map(); prev.set(startKey, null);
    while (queue.length > 0) {
        const key = queue.shift();
        if (key === endKey) break;
        const [cx, cz] = key.split(',').map(Number);
        for (const [dx, dz] of [[1,0],[-1,0],[0,1],[0,-1]]) {
            const nk = `${cx+dx},${cz+dz}`;
            if (cellSet.has(nk) && !prev.has(nk)) { prev.set(nk, key); queue.push(nk); }
        }
    }
    if (!prev.has(endKey)) return [];
    const path = [];
    let k = endKey;
    while (k) { const [x, z] = k.split(',').map(Number); path.unshift([x * C, z * C]); k = prev.get(k); }
    if (path.length < 3) return path;
    const out = [path[0]];
    for (let i = 1; i < path.length - 1; i++) {
        const dx1 = path[i][0]-path[i-1][0], dz1 = path[i][1]-path[i-1][1];
        const dx2 = path[i+1][0]-path[i][0], dz2 = path[i+1][1]-path[i][1];
        if (dx1!==dx2||dz1!==dz2) out.push(path[i]);
    }
    out.push(path[path.length-1]);
    return out;
}

function gridWorldToCell(wx, wz) {
    const C = editor.CELL;
    return { gx: Math.round(wx / C), gz: Math.round(wz / C) };
}

function toggleGridEditor() {
    editor.active = !editor.active;
    edPanel.style.display = editor.active ? 'block' : 'none';
    if (editor.active) {
        desel();
        if (pathVisuals.roadMesh) pathVisuals.roadMesh.visible = false;
        for (const l of pathVisuals.edgeLines) l.visible = false;
        if (pathVisuals.portalA) pathVisuals.portalA.visible = false;
        if (pathVisuals.portalB) pathVisuals.portalB.visible = false;
        createGrid();
    } else {
        if (pathVisuals.roadMesh) pathVisuals.roadMesh.visible = true;
        for (const l of pathVisuals.edgeLines) l.visible = true;
        if (pathVisuals.portalA) pathVisuals.portalA.visible = true;
        if (pathVisuals.portalB) pathVisuals.portalB.visible = true;
        destroyGrid();
        if (startMarker) { scene.remove(startMarker); startMarker = null; }
        if (endMarker) { scene.remove(endMarker); endMarker = null; }
        startCell = null; endCell = null;
    }
}

const geRay = new THREE.Raycaster();
function geHitCell(e) {
    const mx = (e.clientX / innerWidth) * 2 - 1;
    const my = -(e.clientY / innerHeight) * 2 + 1;
    geRay.setFromCamera(new THREE.Vector2(mx, my), camera);
    const hit = new THREE.Vector3();
    geRay.ray.intersectPlane(gPlane, hit);
    if (!hit) return null;
    return gridWorldToCell(hit.x, hit.z);
}

export function initGridEditor(canvasEl) {
    document.getElementById('ge-clear').addEventListener('click', () => {
        clearAllCells();
        if (startMarker) { scene.remove(startMarker); startMarker = null; }
        if (endMarker) { scene.remove(endMarker); endMarker = null; }
        startCell = null; endCell = null;
        edOut.textContent = 'Cleared. Ctrl+Click=START, Shift+Click=END.';
    });

    document.getElementById('ge-export').addEventListener('click', () => {
        if (!startCell || !endCell) { edOut.textContent = 'Set START and END first!'; return; }
        const wps = cellsToWaypoints();
        if (wps.length < 2) { edOut.textContent = 'No connected path!'; return; }
        const txt = 'const WP = [' + wps.map(([x, z]) => `[${x},${z}]`).join(',') + '];';
        navigator.clipboard.writeText(txt).then(() => {
            edOut.textContent = 'Copied! (' + wps.length + ' pts) ' + txt;
        });
    });

    canvasEl.addEventListener('mousemove', e => {
        if (!editor.active) return;
        const c = geHitCell(e);
        if (!c) return;
        if (editor.hoverMesh) { editor.hoverMesh.visible = true; editor.hoverMesh.position.set(c.gx * editor.CELL, .05, c.gz * editor.CELL); }
        if (editor.painting) paintCell(c.gx, c.gz);
        if (editor.erasing) eraseCell(c.gx, c.gz);
    });

    canvasEl.addEventListener('mousedown', e => {
        if (!editor.active) return;
        const c = geHitCell(e);
        if (!c) return;
        if (e.button === 0 && e.ctrlKey) { setStart(c.gx, c.gz); return; }
        if (e.button === 0 && e.shiftKey) { setEnd(c.gx, c.gz); return; }
        if (e.button === 0) { editor.painting = true; paintCell(c.gx, c.gz); }
        if (e.button === 2) { editor.erasing = true; eraseCell(c.gx, c.gz); }
    });

    window.addEventListener('mouseup', () => { editor.painting = false; editor.erasing = false; });

    canvasEl.addEventListener('contextmenu', e => { if (editor.active) e.preventDefault(); });

    document.addEventListener('keydown', e => {
        if (e.key === 'g' || e.key === 'G') toggleGridEditor();
    });
}
