import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';

// Scene
export const scene = new THREE.Scene();
scene.background = new THREE.Color(0xd8d4ea);
scene.fog = new THREE.FogExp2(0xd8d4ea, 0.012);

// Renderer
export const renderer = new THREE.WebGLRenderer({
    antialias: true,
    powerPreference: 'high-performance',
    stencil: false,
});
renderer.setSize(innerWidth, innerHeight);
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.2;
renderer.outputColorSpace = THREE.SRGBColorSpace;
document.body.appendChild(renderer.domElement);

// Isometric Camera
export const frustum = 18;
const aspect = innerWidth / innerHeight;
export const camera = new THREE.OrthographicCamera(
    -frustum * aspect, frustum * aspect,
    frustum, -frustum, -50, 200
);
export const ISO_DIST = 30;
export const ISO_ANGLE_Y = Math.PI / 4;
export const ISO_ANGLE_X = Math.atan(1 / Math.sqrt(2));
camera.position.set(
    ISO_DIST * Math.sin(ISO_ANGLE_Y) * Math.cos(ISO_ANGLE_X),
    ISO_DIST * Math.sin(ISO_ANGLE_X),
    ISO_DIST * Math.cos(ISO_ANGLE_Y) * Math.cos(ISO_ANGLE_X)
);
camera.lookAt(0, 0, 0);
camera.zoom = 1.05;
camera.updateProjectionMatrix();

// Post-processing
export const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));

// Bloom - tuned for selective glow on emissive objects
const bloom = new UnrealBloomPass(
    new THREE.Vector2(innerWidth, innerHeight),
    0.55,   // strength - slightly stronger for crystal glow
    0.4,    // radius - tighter bloom spread
    0.82    // threshold - lower to catch tower emissives
);
composer.addPass(bloom);

// Vignette + color grading pass
const vignetteShader = {
    uniforms: {
        tDiffuse: { value: null },
        darkness: { value: 0.35 },
        offset: { value: 1.1 },
    },
    vertexShader: `varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }`,
    fragmentShader: `
        uniform sampler2D tDiffuse;
        uniform float darkness;
        uniform float offset;
        varying vec2 vUv;
        void main(){
            vec4 col = texture2D(tDiffuse, vUv);
            // Vignette
            vec2 uv = (vUv - 0.5) * 2.0;
            float vig = 1.0 - dot(uv, uv) * darkness;
            vig = clamp(pow(vig, 1.5), 0.0, 1.0);
            col.rgb *= mix(vec3(0.85, 0.82, 0.95), vec3(1.0), vig);
            // Subtle purple tint in shadows
            float lum = dot(col.rgb, vec3(0.299, 0.587, 0.114));
            col.rgb += (1.0 - lum) * vec3(0.02, 0.0, 0.04) * 0.5;
            gl_FragColor = col;
        }
    `,
};
composer.addPass(new ShaderPass(vignetteShader));

// === Lighting ===

// Ambient fill - slightly desaturated purple
scene.add(new THREE.AmbientLight(0xb0a8d0, 0.55));

// Main directional sun - warm offset for depth
const sun = new THREE.DirectionalLight(0xfff4e8, 1.1);
sun.position.set(10, 35, 15);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
sun.shadow.bias = -0.0005;
sun.shadow.normalBias = 0.02;
const sc = sun.shadow.camera;
sc.left = sc.bottom = -28; sc.right = sc.top = 28; sc.far = 70;
scene.add(sun);

// Hemisphere sky/ground bounce
scene.add(new THREE.HemisphereLight(0xb8c0ff, 0xc8c0dd, 0.4));

// Accent point lights - color-coded for atmosphere
export const ptCyan = new THREE.PointLight(0x55ccff, 0.5, 45);
ptCyan.position.set(-10, 6, 6); scene.add(ptCyan);

export const ptViolet = new THREE.PointLight(0x9955ff, 0.4, 45);
ptViolet.position.set(10, 6, -6); scene.add(ptViolet);

export const ptWarm = new THREE.PointLight(0xffbb88, 0.25, 40);
ptWarm.position.set(0, 5, 10); scene.add(ptWarm);

// Rim light from behind - subtle backlight separation
const rimLight = new THREE.DirectionalLight(0xccbbff, 0.3);
rimLight.position.set(-8, 12, -20);
scene.add(rimLight);

// === Ground ===
const groundGeo = new THREE.PlaneGeometry(200, 200);
const groundMat = new THREE.MeshPhysicalMaterial({
    color: 0xcac6de,
    roughness: 0.2,
    metalness: 0.05,
    transmission: 0.08,
    thickness: 0.3,
    clearcoat: 1.0,
    clearcoatRoughness: 0.08,
    envMapIntensity: 0.4,
    sheen: 0.15,
    sheenColor: new THREE.Color(0x8877bb),
});
const floor = new THREE.Mesh(groundGeo, groundMat);
floor.rotation.x = -Math.PI / 2;
floor.receiveShadow = true;
scene.add(floor);

// Subtle ground grid overlay
const gridGeo = new THREE.PlaneGeometry(80, 56);
const gridMat = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    uniforms: {
        cellSize: { value: 2.0 },
        lineWidth: { value: 0.03 },
        lineColor: { value: new THREE.Color(0x8877aa) },
        lineAlpha: { value: 0.06 },
    },
    vertexShader: `
        varying vec2 vWorldPos;
        void main(){
            vec4 wp = modelMatrix * vec4(position, 1.0);
            vWorldPos = wp.xz;
            gl_Position = projectionMatrix * viewMatrix * wp;
        }
    `,
    fragmentShader: `
        uniform float cellSize;
        uniform float lineWidth;
        uniform vec3 lineColor;
        uniform float lineAlpha;
        varying vec2 vWorldPos;
        void main(){
            vec2 grid = abs(fract(vWorldPos / cellSize - 0.5) - 0.5) / fwidth(vWorldPos / cellSize);
            float line = min(grid.x, grid.y);
            float alpha = 1.0 - min(line, 1.0);
            alpha *= lineAlpha;
            // Fade at edges
            vec2 edgeDist = 1.0 - abs(vWorldPos) / vec2(40.0, 28.0);
            float edgeFade = min(edgeDist.x, edgeDist.y);
            alpha *= smoothstep(0.0, 0.15, edgeFade);
            gl_FragColor = vec4(lineColor, alpha);
        }
    `,
});
const gridMesh = new THREE.Mesh(gridGeo, gridMat);
gridMesh.rotation.x = -Math.PI / 2;
gridMesh.position.y = 0.02;
scene.add(gridMesh);

// Resize handler
export function initResize() {
    window.addEventListener('resize', () => {
        const a = innerWidth / innerHeight;
        camera.left = -frustum * a; camera.right = frustum * a;
        camera.top = frustum; camera.bottom = -frustum;
        camera.updateProjectionMatrix();
        renderer.setSize(innerWidth, innerHeight);
        composer.setSize(innerWidth, innerHeight);
        bloom.resolution.set(innerWidth, innerHeight);
    });
}
