import * as THREE from 'three';
import { camera, renderer } from './engine.js';

export const panOffset = new THREE.Vector3(0, 0, 0);
export const mouse = new THREE.Vector2();

let isPanning = false;
let panStart = { x: 0, y: 0 };

// Touch state
let touchCount = 0;
let lastTap = 0;
let pinchDist = 0;
let touchPanStart = { x: 0, y: 0 };
let isTouchPanning = false;

function clampPan() {
    panOffset.x = THREE.MathUtils.clamp(panOffset.x, -10, 10);
    panOffset.z = THREE.MathUtils.clamp(panOffset.z, -10, 10);
}

export function initControls() {
    const el = renderer.domElement;

    // === MOUSE ===
    el.addEventListener('mousedown', e => {
        if (e.button === 1) { isPanning = true; panStart = { x: e.clientX, y: e.clientY }; e.preventDefault(); }
    });
    el.addEventListener('mousemove', e => {
        mouse.x = (e.clientX / innerWidth) * 2 - 1;
        mouse.y = -(e.clientY / innerHeight) * 2 + 1;
        if (!isPanning) return;
        const dx = (e.clientX - panStart.x) * 0.05;
        const dz = (e.clientY - panStart.y) * 0.05;
        panOffset.x -= dx * 0.7 + dz * 0.7;
        panOffset.z += dx * 0.7 - dz * 0.7;
        clampPan();
        panStart = { x: e.clientX, y: e.clientY };
    });
    window.addEventListener('mouseup', () => isPanning = false);
    el.addEventListener('wheel', e => {
        camera.zoom = THREE.MathUtils.clamp(camera.zoom + (e.deltaY > 0 ? -0.1 : 0.1), 0.4, 3.5);
        camera.updateProjectionMatrix();
        e.preventDefault();
    }, { passive: false });

    // === TOUCH ===
    el.addEventListener('touchstart', e => {
        touchCount = e.touches.length;
        if (touchCount === 1) {
            // Single finger - update mouse position for tap (placement/selection)
            const t = e.touches[0];
            mouse.x = (t.clientX / innerWidth) * 2 - 1;
            mouse.y = -(t.clientY / innerHeight) * 2 + 1;
            isTouchPanning = false;
            touchPanStart = { x: t.clientX, y: t.clientY };
        } else if (touchCount === 2) {
            // Two fingers - prepare for pan/pinch
            isTouchPanning = true;
            const t0 = e.touches[0], t1 = e.touches[1];
            touchPanStart = {
                x: (t0.clientX + t1.clientX) / 2,
                y: (t0.clientY + t1.clientY) / 2,
            };
            pinchDist = Math.hypot(t1.clientX - t0.clientX, t1.clientY - t0.clientY);
        }
    }, { passive: true });

    el.addEventListener('touchmove', e => {
        if (e.touches.length === 1 && !isTouchPanning) {
            // Single finger drag - check if it's a pan gesture (moved enough)
            const t = e.touches[0];
            const dx = t.clientX - touchPanStart.x;
            const dy = t.clientY - touchPanStart.y;
            if (Math.abs(dx) + Math.abs(dy) > 10) {
                isTouchPanning = true;
            }
            if (isTouchPanning) {
                const mx = dx * 0.04;
                const mz = dy * 0.04;
                panOffset.x -= mx * 0.7 + mz * 0.7;
                panOffset.z += mx * 0.7 - mz * 0.7;
                clampPan();
                touchPanStart = { x: t.clientX, y: t.clientY };
            }
            // Update mouse for ghost preview
            mouse.x = (t.clientX / innerWidth) * 2 - 1;
            mouse.y = -(t.clientY / innerHeight) * 2 + 1;
            e.preventDefault();
        } else if (e.touches.length === 2) {
            isTouchPanning = true;
            const t0 = e.touches[0], t1 = e.touches[1];
            // Pan with two-finger midpoint
            const cx = (t0.clientX + t1.clientX) / 2;
            const cy = (t0.clientY + t1.clientY) / 2;
            const dx = (cx - touchPanStart.x) * 0.04;
            const dz = (cy - touchPanStart.y) * 0.04;
            panOffset.x -= dx * 0.7 + dz * 0.7;
            panOffset.z += dx * 0.7 - dz * 0.7;
            clampPan();
            touchPanStart = { x: cx, y: cy };

            // Pinch zoom
            const newDist = Math.hypot(t1.clientX - t0.clientX, t1.clientY - t0.clientY);
            if (pinchDist > 0) {
                const scale = newDist / pinchDist;
                camera.zoom = THREE.MathUtils.clamp(camera.zoom * scale, 0.4, 3.5);
                camera.updateProjectionMatrix();
            }
            pinchDist = newDist;
            e.preventDefault();
        }
    }, { passive: false });

    el.addEventListener('touchend', e => {
        touchCount = e.touches.length;
        if (touchCount === 0) {
            // If it was a quick tap (not a pan), simulate a click
            if (!isTouchPanning) {
                el.dispatchEvent(new MouseEvent('click', { bubbles: true }));
            }
            isTouchPanning = false;
        }
        pinchDist = 0;
    });
}
