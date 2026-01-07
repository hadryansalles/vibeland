import './style.css'
import * as THREE from 'three'
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { SSAOPass } from 'three/examples/jsm/postprocessing/SSAOPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { TUNING } from './tuning'
import { Player } from './player';
import { Enemy } from './enemy';

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

// Player Character
const player = new Player();
player.addToScene(scene);

// Enemy
const enemies: Enemy[] = [];
for (let i = 0; i < 100; i++) {
    const angle = Math.random() * Math.PI * 2;
    const radius = 10 + Math.random() * 20; // Spawn between 10 and 30 units away
    const x = Math.cos(angle) * radius;
    const z = Math.sin(angle) * radius;
    const enemy = new Enemy(new THREE.Vector3(x, 0.5, z), player);
    enemy.addToScene(scene);
    enemies.push(enemy);
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

// Respawn / death UI and state
const PLAYER_RESPAWN_TIME = 3; // seconds
const respawnOverlay = document.createElement('div');
respawnOverlay.id = 'respawn-overlay';
respawnOverlay.innerHTML = `
  <div class="respawn-box">
    <h1>You Died</h1>
    <p id="respawn-countdown">Respawn in ${PLAYER_RESPAWN_TIME}</p>
    <button id="respawn-button">Respawn Now</button>
  </div>
`;
respawnOverlay.style.display = 'none';
document.body.appendChild(respawnOverlay);

let deathHandled = false;
let respawnTimer = 0;
const frozenCameraPos = new THREE.Vector3();
const frozenLookAt = new THREE.Vector3();

function doRespawn() {
  const spawnPos = new THREE.Vector3(0, TUNING.CHARACTER_INITIAL_Y, 0);
  // Use revive if available
  if ((player as any).revive) {
    (player as any).revive(spawnPos);
  } else {
    player.isDead = false;
    player.health = (player as any).maxHealth ?? TUNING.PLAYER_HEALTH;
    player.mesh.visible = true;
    player.mesh.position.copy(spawnPos);
  }
  respawnOverlay.style.display = 'none';
  deathHandled = false;
  respawnTimer = 0;

  const targetPosition = new THREE.Vector3(player.position.x, TUNING.CHARACTER_INITIAL_Y, player.position.z);
  camera.position.copy(targetPosition).add(TUNING.ISO_OFFSET);
  camera.lookAt(targetPosition);
  directionalLight.position.copy(targetPosition).add(TUNING.DIRECTIONAL_LIGHT_POSITION);
  directionalLight.target.position.copy(targetPosition);
  directionalLight.target.updateMatrixWorld();
}

const respawnButton = respawnOverlay.querySelector('#respawn-button') as HTMLButtonElement;
respawnButton.addEventListener('click', () => doRespawn());

// Controls state
const keys: { [key: string]: boolean } = {};

window.addEventListener('keydown', (e) => {
  keys[e.code] = true;
});

window.addEventListener('keyup', (e) => {
  keys[e.code] = false;
});

window.addEventListener('mousedown', (e) => {
  if (e.button !== 0) return; // only left click

  // Convert mouse to NDC
  const mouse = new THREE.Vector2(
    (e.clientX / window.innerWidth) * 2 - 1,
    -(e.clientY / window.innerHeight) * 2 + 1
  );

  const raycaster = new THREE.Raycaster();
  raycaster.setFromCamera(mouse, camera);

  // Intersect with horizontal plane at CHARACTER_INITIAL_Y
  const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -TUNING.CHARACTER_INITIAL_Y);
  const intersectPoint = new THREE.Vector3();
  const hit = raycaster.ray.intersectPlane(plane, intersectPoint);
  if (hit) {
    const dir = new THREE.Vector3().subVectors(intersectPoint, player.position).setY(0);
    if (dir.lengthSq() < 1e-6) {
      player.attack(enemies);
    } else {
      dir.normalize();
      player.attack(enemies, dir);
    }
  } else {
    player.attack(enemies);
  }
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

  const inputDirection = new THREE.Vector3();
  const cameraForward = new THREE.Vector3();
  const cameraRight = new THREE.Vector3();

  // Get camera forward vector projected on XZ plane
  camera.getWorldDirection(cameraForward);
  cameraForward.y = 0;
  cameraForward.normalize();

  // Get camera right vector
  cameraRight.crossVectors(cameraForward, new THREE.Vector3(0, 1, 0));

  if (keys['ArrowUp'] || keys['KeyW']) {
    inputDirection.add(cameraForward);
  }
  if (keys['ArrowDown'] || keys['KeyS']) {
    inputDirection.sub(cameraForward);
  }
  if (keys['ArrowLeft'] || keys['KeyA']) {
    inputDirection.sub(cameraRight);
  }
  if (keys['ArrowRight'] || keys['KeyD']) {
    inputDirection.add(cameraRight);
  }

  // Only allow player to update/move/attack while alive
  if (!player.isDead) {
    player.update(dt);
    player.move(inputDirection, dt);
    if (keys['Space']) {
      player.attack(enemies);
    }
  } else {
    // still let update run minimal flash/cleanup
    player.update(dt);
  }

  // Camera / light behavior: freeze when dead, otherwise follow player
  if (player.isDead) {
    if (!deathHandled) {
      deathHandled = true;
      respawnTimer = PLAYER_RESPAWN_TIME;
      frozenCameraPos.copy(camera.position);
      frozenLookAt.set(player.position.x, TUNING.CHARACTER_INITIAL_Y, player.position.z);
      respawnOverlay.style.display = 'flex';
      const countdownEl = document.getElementById('respawn-countdown');
      if (countdownEl) countdownEl.textContent = `Respawn in ${Math.ceil(respawnTimer)}`;
    } else {
      respawnTimer -= deltaSeconds;
      const countdownEl = document.getElementById('respawn-countdown');
      if (countdownEl) countdownEl.textContent = `Respawn in ${Math.max(0, Math.ceil(respawnTimer))}`;
      if (respawnTimer <= 0) doRespawn();
    }

    // Keep camera and light fixed at the moment of death
    camera.position.copy(frozenCameraPos);
    camera.lookAt(frozenLookAt);
    directionalLight.position.copy(frozenLookAt).add(TUNING.DIRECTIONAL_LIGHT_POSITION);
    directionalLight.target.position.copy(frozenLookAt);
    directionalLight.target.updateMatrixWorld();
  } else {
    const targetPosition = new THREE.Vector3(player.position.x, TUNING.CHARACTER_INITIAL_Y, player.position.z);
    camera.position.copy(targetPosition).add(TUNING.ISO_OFFSET);
    camera.lookAt(targetPosition);

    // Update directional light to follow character (keep shadows in view)
    directionalLight.position.copy(targetPosition).add(TUNING.DIRECTIONAL_LIGHT_POSITION);
    directionalLight.target.position.copy(targetPosition);
    directionalLight.target.updateMatrixWorld();

    // Ensure overlay is hidden if revived outside of the respawn flow
    if (deathHandled) {
      deathHandled = false;
      respawnOverlay.style.display = 'none';
    }
  }

  for (let i = enemies.length - 1; i >= 0; i--) {
    const enemy = enemies[i];
    if (enemy.isDead) {
      // Small chance to remove from array, or just leave it hidden
      // scene.remove(enemy.mesh); 
      // enemies.splice(i, 1);
      continue;
    }
    enemy.update(dt);
  }

  composer.render();
}

// Start loop
requestAnimationFrame(animate);
