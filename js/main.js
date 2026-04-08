import * as THREE from 'three';
import { renderer, composer, camera, initResize } from './core/engine.js';
import { S } from './core/state.js';
import { initControls, mouse } from './core/controls.js';
import { buildPathVisuals } from './systems/path.js';
import { TD } from './data/towers.js';
import { ray, gPlane, freePos, canPlace, place, getGhostM, getGhostR, findTowerAtCursor, getPlaceCost } from './systems/placement.js';
import { startWave } from './systems/waves.js';
import { update } from './update.js';
import { updateHUD } from './ui/hud.js';
import { initMenu } from './ui/menu.js';
import { initGameOver } from './ui/game-over.js';
import { selTower, desel, initTowerPanel, showUpgradePanel, hideUpgradePanel } from './ui/tower-panel.js';
import { initSpeedControl } from './ui/speed-control.js';
import { editor, initGridEditor } from './editor/grid-editor.js';
import { addSelectionRing, removeSelectionRing } from './systems/tower-factory.js';

// Build initial path visuals
buildPathVisuals();

// Init all modules
initResize();
initControls();
initMenu();
initGameOver();
initTowerPanel();
initSpeedControl();
initGridEditor(renderer.domElement);

// Wave button
document.getElementById('wave-btn').addEventListener('click', () => {
    if (!S.waveActive && !S.over) startWave(updateHUD);
});

// Placement mouse events
renderer.domElement.addEventListener('mousemove', e => {
    if (editor.active) return;
    const ghostM = getGhostM();
    const ghostR = getGhostR();
    if (ghostM) {
        ray.setFromCamera(mouse, camera);
        const hit = new THREE.Vector3();
        ray.ray.intersectPlane(gPlane, hit);
        if (hit) {
            const gp = freePos(hit);
            ghostM.position.set(gp.x, 0, gp.z);
            if (ghostR) ghostR.position.set(gp.x, .1, gp.z);
            const ok = canPlace(gp);
            ghostM.traverse(ch => {
                if (ch.isMesh && ch.material.emissive) {
                    ch.material.emissive.setHex(ok ? 0x5588ff : 0xff3355);
                    ch.material.emissiveIntensity = .5;
                }
            });
            if (ghostR) ghostR.traverse(ch => {
                if (ch.isMesh) ch.material.color.setHex(ok ? 0x8866dd : 0xff3355);
            });
        }
    }
});

renderer.domElement.addEventListener('click', () => {
    if (editor.active) return;

    // If placing a tower
    if (S.selTower) {
        ray.setFromCamera(mouse, camera);
        const hit = new THREE.Vector3();
        ray.ray.intersectPlane(gPlane, hit);
        if (hit) {
            const gp = freePos(hit);
            if (canPlace(gp)) {
                place(gp, S.selTower, updateHUD);
                if (S.gold < getPlaceCost(S.selTower)) desel();
            }
        }
        return;
    }

    // If not placing, try to select a placed tower for upgrade
    const tw = findTowerAtCursor();
    if (tw) {
        // Deselect previous
        if (S.selectedTower && S.selectedTower !== tw) {
            removeSelectionRing(S.selectedTower);
        }
        addSelectionRing(tw);
        showUpgradePanel(tw);
    } else {
        // Clicked empty space - deselect
        if (S.selectedTower) {
            removeSelectionRing(S.selectedTower);
            hideUpgradePanel();
        }
    }
});

renderer.domElement.addEventListener('contextmenu', e => {
    e.preventDefault();
    if (!editor.active) {
        desel();
        if (S.selectedTower) {
            removeSelectionRing(S.selectedTower);
            hideUpgradePanel();
        }
    }
});

// Render loop
const clock = new THREE.Clock();
(function animate() {
    requestAnimationFrame(animate);
    const raw = Math.min(clock.getDelta(), .05);
    update(raw * S.speed);
    composer.render();
})();
