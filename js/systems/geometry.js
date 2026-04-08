import * as THREE from 'three';

// Shared geometries - reused across all instances
export const G = {
    ico1:  new THREE.IcosahedronGeometry(1, 1),
    ico0:  new THREE.IcosahedronGeometry(1, 0),
    ico2:  new THREE.IcosahedronGeometry(1, 2),
    oct:   new THREE.OctahedronGeometry(1, 0),
    cone:  new THREE.ConeGeometry(1, 1, 6),
    cone8: new THREE.ConeGeometry(1, 1, 8),
    cyl:   new THREE.CylinderGeometry(1, 1, 1, 8),
    cyl6:  new THREE.CylinderGeometry(1, 1, 1, 6),
    cylT:  new THREE.CylinderGeometry(.5, 1, 1, 6),
    hp:    new THREE.PlaneGeometry(.7, .06),
    proj:  new THREE.OctahedronGeometry(1, 0),
    ring:  new THREE.TorusGeometry(1, 0.04, 6, 24),
    sphere: new THREE.SphereGeometry(1, 12, 8),
    dodec: new THREE.DodecahedronGeometry(1, 0),
    // Pooled selection ring geometries (created on demand, cached)
    _selRings: new Map(),
};

// Get or create cached ring geometry for a given range
export function getSelRingGeos(range) {
    const key = range.toFixed(2);
    if (G._selRings.has(key)) return G._selRings.get(key);
    const geos = {
        disc: new THREE.CircleGeometry(range, 48),
        ring: new THREE.RingGeometry(range - 0.12, range, 48),
        glow: new THREE.RingGeometry(range - 0.3, range + 0.2, 48),
    };
    geos.disc.rotateX(-Math.PI / 2);
    geos.ring.rotateX(-Math.PI / 2);
    geos.glow.rotateX(-Math.PI / 2);
    G._selRings.set(key, geos);
    return geos;
}

// Material cache
const _matCache = new Map();
export function mkMat(c, e, eI, ghost, extra = {}) {
    const key = `${c}_${e}_${eI}_${ghost}_${JSON.stringify(extra)}`;
    if (_matCache.has(key)) return _matCache.get(key);
    const m = new THREE.MeshStandardMaterial({
        color: c, emissive: e, emissiveIntensity: eI,
        roughness: 0.18, metalness: 0.35,
        transparent: ghost ? true : false,
        opacity: ghost ? 0.3 : 1,
        envMapIntensity: 0.5,
        ...extra,
    });
    _matCache.set(key, m);
    return m;
}

// Premium PBR material (for tower bodies)
const _pbrCache = new Map();
export function mkPBR(color, emissive, emI, ghost, opts = {}) {
    const key = `pbr_${color}_${emissive}_${emI}_${ghost}_${JSON.stringify(opts)}`;
    if (_pbrCache.has(key)) return _pbrCache.get(key);
    const m = new THREE.MeshPhysicalMaterial({
        color,
        emissive,
        emissiveIntensity: emI,
        roughness: opts.roughness ?? 0.12,
        metalness: opts.metalness ?? 0.4,
        clearcoat: opts.clearcoat ?? 0.6,
        clearcoatRoughness: opts.clearcoatRoughness ?? 0.15,
        transparent: ghost || (opts.opacity !== undefined && opts.opacity < 1),
        opacity: ghost ? 0.3 : (opts.opacity ?? 1),
        envMapIntensity: opts.envMapIntensity ?? 0.6,
        ...(opts.transmission ? { transmission: opts.transmission, thickness: opts.thickness || 0.5 } : {}),
    });
    _pbrCache.set(key, m);
    return m;
}
