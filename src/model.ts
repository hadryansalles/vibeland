import * as THREE from 'three';

type Cube = {
    position: [number, number, number];
    size: [number, number, number];
    // RGB values in 0..1 range
    color: [number, number, number];
};

export type Model = {
    cubes: Cube[];
}

// Merge multiple BufferGeometries into a single BufferGeometry
function mergeBufferGeometriesManual(geometries: THREE.BufferGeometry[]): THREE.BufferGeometry {
    if (geometries.length === 0) return new THREE.BufferGeometry();
    if (geometries.length === 1) return geometries[0].clone();

    // Totals
    let totalVertices = 0;
    let totalIndices = 0;
    let hasNormal = false;
    let hasUv = false;
    let hasColor = false;

    for (const g of geometries) {
        const pos = g.getAttribute('position');
        if (!pos) throw new Error('Geometry missing position attribute');
        totalVertices += pos.count;
        totalIndices += g.index ? g.index.count : pos.count;
        hasNormal = hasNormal || !!g.getAttribute('normal');
        hasUv = hasUv || !!g.getAttribute('uv');
        hasColor = hasColor || !!g.getAttribute('color');
    }

    const positionArray = new Float32Array(totalVertices * 3);
    const normalArray = hasNormal ? new Float32Array(totalVertices * 3) : undefined;
    const uvArray = hasUv ? new Float32Array(totalVertices * 2) : undefined;
    const colorArray = hasColor ? new Float32Array(totalVertices * 3) : undefined;

    const IndexArrayType = totalVertices > 65535 ? Uint32Array : Uint16Array;
    const indexArray = totalIndices > 0 ? new IndexArrayType(totalIndices) : undefined;

    let vertexOffset = 0;
    let indexOffset = 0;

    for (const g of geometries) {
        const pos = g.getAttribute('position')!;
        const posArray = pos.array as Float32Array;
        positionArray.set(posArray, vertexOffset * 3);

        if (hasNormal) {
            const n = g.getAttribute('normal');
            if (n) normalArray!.set(n.array as Float32Array, vertexOffset * 3);
        }

        if (hasUv) {
            const uv = g.getAttribute('uv');
            if (uv) uvArray!.set(uv.array as Float32Array, vertexOffset * 2);
        }

        if (hasColor) {
            const col = g.getAttribute('color');
            if (col) colorArray!.set(col.array as Float32Array, vertexOffset * 3);
            else {
                // default white if missing
                for (let i = 0; i < pos.count; i++) {
                    const off = (vertexOffset + i) * 3;
                    colorArray![off] = 1; colorArray![off + 1] = 1; colorArray![off + 2] = 1;
                }
            }
        }

        if (g.index) {
            const idx = g.index.array as Uint16Array | Uint32Array;
            for (let i = 0; i < g.index.count; i++) {
                indexArray![indexOffset + i] = idx[i] + vertexOffset;
            }
            indexOffset += g.index.count;
        } else {
            // if no index, create sequential indices
            for (let i = 0; i < pos.count; i++) {
                indexArray![indexOffset + i] = vertexOffset + i;
            }
            indexOffset += pos.count;
        }

        vertexOffset += pos.count;
    }

    const merged = new THREE.BufferGeometry();
    merged.setAttribute('position', new THREE.BufferAttribute(positionArray, 3));
    if (hasNormal) merged.setAttribute('normal', new THREE.BufferAttribute(normalArray!, 3));
    if (hasUv) merged.setAttribute('uv', new THREE.BufferAttribute(uvArray!, 2));
    if (hasColor) merged.setAttribute('color', new THREE.BufferAttribute(colorArray!, 3));
    if (indexArray) merged.setIndex(new THREE.BufferAttribute(indexArray as any, 1));

    merged.computeBoundingBox();
    merged.computeBoundingSphere();

    return merged;
}

export const convertModelToTHREEJS = (model: Model): THREE.Mesh => {
    const geometries: THREE.BufferGeometry[] = [];

    for (const cube of model.cubes) {
        const [x, y, z] = cube.position;
        const [sx, sy, sz] = cube.size;
        const [r, g, b] = cube.color;

        const geom = new THREE.BoxGeometry(sx, sy, sz);
        // move geometry to the cube position
        geom.translate(x, y, z);

        // set per-vertex color
        const posAttr = geom.getAttribute('position');
        const count = posAttr.count;
        const colors = new Float32Array(count * 3);
        for (let i = 0; i < count; i++) {
            colors[i * 3] = r;
            colors[i * 3 + 1] = g;
            colors[i * 3 + 2] = b;
        }
        geom.setAttribute('color', new THREE.BufferAttribute(colors, 3));

        geometries.push(geom);
    }

    const merged = mergeBufferGeometriesManual(geometries);

    // Center geometry around origin so mesh.position controls the visual center
    merged.center();
    merged.computeBoundingBox();
    merged.computeBoundingSphere();

    const material = new THREE.MeshStandardMaterial({ vertexColors: true });
    const mesh = new THREE.Mesh(merged, material);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    return mesh;
}