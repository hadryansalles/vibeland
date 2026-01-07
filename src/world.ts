import * as THREE from 'three';
import { TUNING } from './tuning';

export function createWorld(scene: THREE.Scene): THREE.Mesh {
  const tileWorldSize = TUNING.TILE_WORLD_SIZE ?? 1;
  const tileCount = Math.max(1, Math.round(TUNING.PLANE_SIZE / tileWorldSize));
  const tilePx = 16; // pixels per tile in the canvas texture
  const canvasSize = tileCount * tilePx;

  const mapCanvas = document.createElement('canvas');
  mapCanvas.width = canvasSize;
  mapCanvas.height = canvasSize;
  const ctx = mapCanvas.getContext('2d');

  if (ctx) {
    const baseColor = new THREE.Color(TUNING.PLANE_COLOR);
    // Fill base first
    ctx.fillStyle = `#${baseColor.getHexString()}`;
    ctx.fillRect(0, 0, canvasSize, canvasSize);

    // Draw tiles with a subtle random variation in lightness
    for (let y = 0; y < tileCount; y++) {
      for (let x = 0; x < tileCount; x++) {
        const c = baseColor.clone();
        // subtle lightness variation between -0.03 and +0.03
        const lightDelta = (Math.random() - 0.5) * 0.06;
        c.offsetHSL(0, 0, lightDelta);
        ctx.fillStyle = `#${c.getHexString()}`;
        ctx.fillRect(x * tilePx, y * tilePx, tilePx, tilePx);
      }
    }

    // Grid lines (crisp 1px lines)
    ctx.strokeStyle = 'rgba(0,0,0,0.25)';
    ctx.lineWidth = 1;
    for (let i = 0; i <= tileCount; i++) {
      const pos = i * tilePx + 0.5; // 0.5 aligns to pixel grid for crispness
      // vertical
      ctx.beginPath();
      ctx.moveTo(pos, 0);
      ctx.lineTo(pos, canvasSize);
      ctx.stroke();
      // horizontal
      ctx.beginPath();
      ctx.moveTo(0, pos);
      ctx.lineTo(canvasSize, pos);
      ctx.stroke();
    }
  }

  const texture = new THREE.CanvasTexture(mapCanvas);
  texture.magFilter = THREE.NearestFilter;
  texture.minFilter = THREE.LinearMipMapLinearFilter;
  texture.wrapS = THREE.ClampToEdgeWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;

  const planeGeometry = new THREE.PlaneGeometry(TUNING.PLANE_SIZE, TUNING.PLANE_SIZE);
  const planeMaterial = new THREE.MeshStandardMaterial({ map: texture, roughness: 1 });
  const plane = new THREE.Mesh(planeGeometry, planeMaterial);
  plane.rotation.x = -Math.PI / 2;
  plane.receiveShadow = true; // Ground receives shadows
  scene.add(plane);
  return plane;
}
