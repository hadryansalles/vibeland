import './style.css'
import * as THREE from 'three'
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { SSAOPass } from 'three/examples/jsm/postprocessing/SSAOPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { TUNING } from './tuning'
import { convertModelToTHREEJS } from './model';
import type { Model } from './model';
import { BaseEnemy } from './base_enemy';

// Scene setup
const scene = new THREE.Scene();
scene.background = new THREE.Color(TUNING.SCENE_BACKGROUND_COLOR);

// Geometric properties
const aspectRatio = window.innerWidth / window.innerHeight;
const frustumSize = TUNING.FRUSTUM_SIZE;

// Orthographic Camera for true top-down view without perspective distortion
const camera = new THREE.OrthographicCamera(
    frustumSize * aspectRatio / -2,
    frustumSize * aspectRatio / 2,
    frustumSize / 2,
    frustumSize / -2,
    TUNING.CAMERA_NEAR,
    TUNING.CAMERA_FAR
);

// Isometric view position
camera.position.copy(TUNING.ISO_OFFSET);
camera.lookAt(0, 0, 0);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true; // Enable shadows
renderer.shadowMap.type = THREE.PCFSoftShadowMap; // Softer shadows
document.body.appendChild(renderer.domElement);

// Lights
const ambientLight = new THREE.AmbientLight(TUNING.AMBIENT_LIGHT_COLOR, TUNING.AMBIENT_LIGHT_INTENSITY);
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(TUNING.DIRECTIONAL_LIGHT_COLOR, TUNING.DIRECTIONAL_LIGHT_INTENSITY);
directionalLight.position.copy(TUNING.DIRECTIONAL_LIGHT_POSITION);
directionalLight.castShadow = true;
directionalLight.shadow.mapSize.width = 2048;
directionalLight.shadow.mapSize.height = 2048;
directionalLight.shadow.camera.near = 0.5;
directionalLight.shadow.camera.far = 50;
directionalLight.shadow.camera.left = -10;
directionalLight.shadow.camera.right = 10;
directionalLight.shadow.camera.top = 10;
directionalLight.shadow.camera.bottom = -10;
scene.add(directionalLight);

// Ground
const planeGeometry = new THREE.PlaneGeometry(TUNING.PLANE_SIZE, TUNING.PLANE_SIZE);
const planeMaterial = new THREE.MeshStandardMaterial({ color: TUNING.PLANE_COLOR });
const plane = new THREE.Mesh(planeGeometry, planeMaterial);
plane.rotation.x = -Math.PI / 2;
plane.receiveShadow = true; // Ground receives shadows
scene.add(plane);

// Player Character (composed from small cubes)
const playerModel: Model = {
  cubes: [
    // torso
    { position: [0, 0, 0], size: [0.6, 0.5, 0.4], color: [0.15, 0.6, 0.9] },
    // head
    { position: [0, 0.33, 0], size: [0.33, 0.33, 0.33], color: [1.0, 0.9, 0.8] },
    // arms
    { position: [-0.45, 0.05, 0], size: [0.18, 0.45, 0.18], color: [0.15, 0.6, 0.9] },
    { position: [0.45, 0.05, 0], size: [0.18, 0.45, 0.18], color: [0.15, 0.6, 0.9] },
    // legs
    { position: [-0.17, -0.35, 0], size: [0.2, 0.3, 0.2], color: [0.08, 0.08, 0.08] },
    { position: [0.17, -0.35, 0], size: [0.2, 0.3, 0.2], color: [0.08, 0.08, 0.08] },
    // backpack
    { position: [0, 0, -0.28], size: [0.4, 0.5, 0.16], color: [0.8, 0.2, 0.2] },
  ],
};

const player = convertModelToTHREEJS(playerModel);
player.position.y = TUNING.CHARACTER_INITIAL_Y;
scene.add(player);

const cube = new THREE.Mesh(
    new THREE.BoxGeometry(1, 1, 1),
    new THREE.MeshStandardMaterial({ color: 0xff0000 })
);
cube.castShadow = true;
cube.receiveShadow = true;
scene.add(cube);

// Enemy
const enemies: BaseEnemy[] = [];
for (let i = 0; i < 100; i++) {
    const angle = Math.random() * Math.PI * 2;
    const radius = 10 + Math.random() * 20; // Spawn between 10 and 30 units away
    const x = Math.cos(angle) * radius;
    const z = Math.sin(angle) * radius;
    enemies.push(new BaseEnemy(scene, new THREE.Vector3(x, 0.5, z), cube));
}

// Post-processing
const composer = new EffectComposer(renderer);
const renderPass = new RenderPass(scene, camera);
composer.addPass(renderPass);

const ssaoPass = new SSAOPass(scene, camera, window.innerWidth, window.innerHeight);
ssaoPass.kernelRadius = TUNING.SSAO_KERNEL_RADIUS;
ssaoPass.minDistance = TUNING.SSAO_MIN_DISTANCE;
ssaoPass.maxDistance = TUNING.SSAO_MAX_DISTANCE;
composer.addPass(ssaoPass);

const outputPass = new OutputPass();
composer.addPass(outputPass);

// Controls state
const keys: { [key: string]: boolean } = {};

window.addEventListener('keydown', (e) => {
  keys[e.code] = true;
});

window.addEventListener('keyup', (e) => {
  keys[e.code] = false;
});

// Resize handler
window.addEventListener('resize', () => {
    const aspect = window.innerWidth / window.innerHeight;
    
    // Update camera frustum to maintain scale
    camera.left = -frustumSize * aspect / 2;
    camera.right = frustumSize * aspect / 2;
    camera.top = frustumSize / 2;
    camera.bottom = -frustumSize / 2;
    
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    composer.setSize(window.innerWidth, window.innerHeight);
});

// Animation Loop (time-step independent)
let jumpTime = 0;
let _lastFrameTime: number | null = null; // ms

function animate(time: number) {
  // Schedule next frame early
  requestAnimationFrame(animate);

  // Initialize last time on first frame
  if (_lastFrameTime === null) _lastFrameTime = time;

  // Delta in seconds, clamped to avoid huge steps (e.g., when tab was inactive)
  let deltaSeconds = Math.min((time - _lastFrameTime) / 1000, 0.1);
  _lastFrameTime = time;

  // Convert to "reference frames" assuming 60 FPS so existing tuning remains usable
  const dt = deltaSeconds * 60;

  const direction = new THREE.Vector3();
  const cameraForward = new THREE.Vector3();
  const cameraRight = new THREE.Vector3();

  // Get camera forward vector projected on XZ plane
  camera.getWorldDirection(cameraForward);
  cameraForward.y = 0;
  cameraForward.normalize();

  // Get camera right vector
  cameraRight.crossVectors(cameraForward, new THREE.Vector3(0, 1, 0));

  let moving = false;
  
  if (keys['ArrowUp'] || keys['KeyW']) {
    direction.add(cameraForward);
    moving = true;
  }
  if (keys['ArrowDown'] || keys['KeyS']) {
    direction.sub(cameraForward);
    moving = true;
  }
  if (keys['ArrowLeft'] || keys['KeyA']) {
    direction.sub(cameraRight);
    moving = true;
  }
  if (keys['ArrowRight'] || keys['KeyD']) {
    direction.add(cameraRight);
    moving = true;
  }

  if (moving) {
    // Normalize to ensure consistent speed in all directions.
    // Scale by deltaFrames so tuning values (which were per-frame) remain compatible.
    direction.normalize().multiplyScalar(TUNING.MOVEMENT_SPEED * dt);
    player.position.add(direction);

    // Advance jump time scaled by delta frames
    jumpTime += TUNING.JUMP_SPEED_INCREMENT * dt;

    // Bouncing motion
    const bounce = Math.abs(Math.sin(jumpTime));
    player.position.y = TUNING.CHARACTER_INITIAL_Y + bounce * TUNING.JUMP_BOUNCE_HEIGHT;

    // Squeeze and stretch
    const squashFactor = TUNING.JUMP_SQUASH_FACTOR;
    const scaleY = 1 - squashFactor + (bounce * squashFactor * 2);
    const scaleXZ = 1 / Math.sqrt(scaleY);
    player.scale.set(scaleXZ, scaleY, scaleXZ);

      // Rotate player to face movement direction (smooth)
      // Use XZ-plane projection of the movement vector to compute desired yaw.
      const moveDir = new THREE.Vector3(direction.x, 0, direction.z);
      if (moveDir.lengthSq() > 1e-6) {
        moveDir.normalize();
        const desiredYaw = Math.atan2(moveDir.x, moveDir.z);

        // Time-corrected lerp alpha so smoothing is framerate independent (same pattern as jump lerp)
        const baseLerp = TUNING.ROTATION_LERP_FACTOR;
        const lerpAlpha = 1 - Math.pow(1 - baseLerp, dt);

        const targetQuat = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), desiredYaw);
        player.quaternion.slerp(targetQuat, lerpAlpha);
      }
  } else {
    // Reset jump time and smoothly lerp back to resting pose.
    jumpTime = 0;

    // Convert per-frame lerp factor into a time-corrected alpha so smoothing is independent of FPS
    const baseLerp = TUNING.JUMP_LERP_FACTOR; // assumed per-frame
    const lerpAlpha = 1 - Math.pow(1 - baseLerp, dt);

    player.position.y = THREE.MathUtils.lerp(player.position.y, TUNING.CHARACTER_INITIAL_Y, lerpAlpha);
    player.scale.lerp(new THREE.Vector3(1, 1, 1), lerpAlpha);
  }

  // Stable target for camera and lights (ignoring jump height)
  const targetPosition = new THREE.Vector3(player.position.x, TUNING.CHARACTER_INITIAL_Y, player.position.z);

  // Camera follow with isometric offset
  camera.position.copy(targetPosition).add(TUNING.ISO_OFFSET);
  camera.lookAt(targetPosition);

  // Update directional light to follow character (keep shadows in view)
  directionalLight.position.copy(targetPosition).add(TUNING.DIRECTIONAL_LIGHT_POSITION);
  directionalLight.target.position.copy(targetPosition);
  directionalLight.target.updateMatrixWorld();

  enemies.forEach(enemy => enemy.update(dt));

  composer.render();
}

// Start loop
requestAnimationFrame(animate);
