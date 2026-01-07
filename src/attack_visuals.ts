import * as THREE from 'three';

export function createSectorMesh(radius: number, angleRad: number, segments: number, color: number, opacity = 0.6) {
    // Create a triangle-fan sector in the XZ plane, centered at origin, pointing +Z
    const vertexCount = 1 + (segments + 1);
    const positions = new Float32Array(vertexCount * 3);

    // center
    positions[0] = 0;
    positions[1] = 0;
    positions[2] = 0;

    for (let i = 0; i <= segments; i++) {
        const t = i / segments;
        const theta = -angleRad / 2 + t * angleRad;
        const x = Math.sin(theta) * radius;
        const z = Math.cos(theta) * radius;
        const idx = 3 * (1 + i);
        positions[idx] = x;
        positions[idx + 1] = 0;
        positions[idx + 2] = z;
    }

    const indices = new Uint16Array(segments * 3);
    for (let i = 0; i < segments; i++) {
        indices[3 * i + 0] = 0;
        indices[3 * i + 1] = i + 1;
        indices[3 * i + 2] = i + 2;
    }

    const geom = new THREE.BufferGeometry();
    geom.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geom.setIndex(new THREE.BufferAttribute(indices, 1));
    geom.computeVertexNormals();

    const mat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity, side: THREE.DoubleSide });
    const mesh = new THREE.Mesh(geom, mat);
    mesh.rotateX(0); // already XZ plane
    return mesh;
}

// Create a rectangular plane in the XZ plane that starts at z=0 and extends to z=length.
// Width is along the X axis (centered around X=0). The rectangle is oriented to +Z.
export function createRectangleMesh(width: number, length: number, color: number, opacity = 0.6) {
    const positions = new Float32Array([
        // x, y, z
        -width / 2, 0, 0,
         width / 2, 0, 0,
         width / 2, 0, length,
        -width / 2, 0, length,
    ]);

    const indices = new Uint16Array([
        0, 1, 2,
        0, 2, 3,
    ]);

    const geom = new THREE.BufferGeometry();
    geom.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geom.setIndex(new THREE.BufferAttribute(indices, 1));
    geom.computeVertexNormals();

    const mat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity, side: THREE.DoubleSide });
    const mesh = new THREE.Mesh(geom, mat);
    return mesh;
}
