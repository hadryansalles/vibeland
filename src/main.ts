import './style.css'
import * as THREE from 'three'
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { SSAOPass } from 'three/examples/jsm/postprocessing/SSAOPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { TUNING } from './tuning'
import { Player } from './player';
import { Enemy } from './enemy';
import { Slime } from './slime';
import { Undead } from './undead';
import { Entity } from './entity';
import { createWorld } from './world';
import { audio } from './audio';
import { juice } from './juice';

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

// Juice / feel manager (hit-stop, shake, damage numbers, particles)
juice.init({ scene, camera, rendererEl: renderer.domElement });

// Audio: restore settings and satisfy browser gesture requirements.
audio.initFromStorage();
audio.installUnlockHandlers(window);
audio.installUnlockHandlers(renderer.domElement);

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
createWorld(scene);

// Player Character
const player = new Player();
player.addToScene(scene);

// Enemy
const enemies: Entity[] = [];
for (let i = 0; i < 100; i++) {
  const angle = Math.random() * Math.PI * 2;
  const radius = 10 + Math.random() * 20; // Spawn between 10 and 30 units away
  const x = Math.cos(angle) * radius;
  const z = Math.sin(angle) * radius;
  const r = Math.random();
  let ent: Entity;
  if (r < 0.45) {
    ent = new Slime(new THREE.Vector3(x, 0.45, z), player);
  } else if (r < 0.9) {
    ent = new Undead(new THREE.Vector3(x, 0.5, z), player);
  } else {
    ent = new Enemy(new THREE.Vector3(x, 0.5, z), player);
  }
  ent.addToScene(scene);
  enemies.push(ent);
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

// Hover tooltip overlay (shows entity name / info when mouse over)
const hoverOverlay = document.createElement('div');
hoverOverlay.id = 'hover-overlay';
// fixed on-screen position (doesn't follow cursor)
hoverOverlay.style.display = 'flex';
hoverOverlay.style.flexDirection = 'column';
hoverOverlay.style.position = 'fixed';
hoverOverlay.style.top = '12px';
hoverOverlay.style.right = '12px';
hoverOverlay.style.pointerEvents = 'none';
hoverOverlay.style.zIndex = '10000';
hoverOverlay.style.padding = '6px 8px';
hoverOverlay.style.background = 'rgba(0,0,0,0.75)';
hoverOverlay.style.color = '#fff';
hoverOverlay.style.borderRadius = '6px';
hoverOverlay.style.fontFamily = 'system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial';
hoverOverlay.style.fontSize = '12px';
hoverOverlay.style.whiteSpace = 'nowrap';
document.body.appendChild(hoverOverlay);

const hoverRaycaster = new THREE.Raycaster();
const hoverMouse = new THREE.Vector2();
// Mouse hold state for auto-attack
let mouseDown = false;
let lastAttackPoint: THREE.Vector3 | null = null;

renderer.domElement.addEventListener('mousemove', (e) => {
  const rect = renderer.domElement.getBoundingClientRect();
  const x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
  const y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
  hoverMouse.set(x, y);
  hoverRaycaster.setFromCamera(hoverMouse, camera);
  const intersects = hoverRaycaster.intersectObjects(scene.children, true);

  let foundEntity: any = null;
  for (const it of intersects) {
    let obj: any = it.object;
    while (obj && !obj.userData?.entity) obj = obj.parent;
    if (obj && obj.userData && obj.userData.entity) {
      foundEntity = obj.userData.entity;
      break;
    }
  }

  if (foundEntity) {
    const name = foundEntity.displayName ?? (foundEntity.constructor && foundEntity.constructor.name) ?? 'Entity';
    const health = typeof foundEntity.health === 'number' && typeof foundEntity.maxHealth === 'number'
      ? `${Math.max(0, Math.round(foundEntity.health))} / ${Math.round(foundEntity.maxHealth)}`
      : '';
    const status = foundEntity.isDead ? ' (Dead)' : '';
    hoverOverlay.innerHTML = `<strong>${name}</strong>${status}${health ? `<div style="margin-top:4px;font-size:11px;opacity:0.9">HP: ${health}</div>` : ''}`;
    // fixed overlay; just show it and update contents
    hoverOverlay.style.opacity = '1';
  } else {
    hoverOverlay.style.opacity = '0';
  }

  // Update last attack ground point so holding the mouse will aim there
  const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -TUNING.CHARACTER_INITIAL_Y);
  const planePoint = new THREE.Vector3();
  const hitPlane = hoverRaycaster.ray.intersectPlane(plane, planePoint);
  if (hitPlane) lastAttackPoint = planePoint.clone();
  else lastAttackPoint = null;
});

renderer.domElement.addEventListener('mouseleave', () => {
  // stop auto-attacking when leaving the canvas
  mouseDown = false;
});

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

// Minimal HUD (HP + SFX state)
const hud = document.createElement('div');
hud.id = 'hud';
hud.innerHTML = `
  <div class="hud-panel">
    <div class="hud-row">
      <div class="hud-label">HP</div>
      <div class="hud-bar"><div class="hud-bar-fill" id="hud-hp-fill"></div></div>
      <div class="hud-text" id="hud-hp-text"></div>
    </div>
    <div class="hud-row hud-row-small">
      <div class="hud-hint">Hold LMB: auto-attack · Space: attack · M: toggle SFX (<span id="hud-sfx"></span>)</div>
    </div>
  </div>
`;
document.body.appendChild(hud);
const hudHpFill = document.getElementById('hud-hp-fill') as HTMLDivElement;
const hudHpText = document.getElementById('hud-hp-text') as HTMLDivElement;
const hudSfx = document.getElementById('hud-sfx') as HTMLSpanElement;
hudSfx.textContent = audio.getEnabled() ? 'on' : 'off';

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

  audio.playRespawn();
}

const respawnButton = respawnOverlay.querySelector('#respawn-button') as HTMLButtonElement;
respawnButton.addEventListener('click', () => {
  audio.playUIClick();
  doRespawn();
});

// Controls state
const keys: { [key: string]: boolean } = {};

window.addEventListener('keydown', (e) => {
  keys[e.code] = true;

  // Toggle SFX mute (press M)
  if (e.code === 'KeyM' && !e.repeat) {
    audio.setEnabled(!audio.getEnabled());
    hudSfx.textContent = audio.getEnabled() ? 'on' : 'off';
  }
});

window.addEventListener('keyup', (e) => {
  keys[e.code] = false;
});

window.addEventListener('mousedown', (e) => {
  if (e.button !== 0) return; // only left click
  if (player.isDead || (player as any).isDying) return;

  mouseDown = true;

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
    lastAttackPoint = intersectPoint.clone();
    const dir = new THREE.Vector3().subVectors(intersectPoint, player.position).setY(0);
    if (dir.lengthSq() < 1e-6) {
      player.attack(enemies);
    } else {
      dir.normalize();
      player.attack(enemies, dir);
    }
  } else {
    lastAttackPoint = null;
    player.attack(enemies);
  }
});

// Stop auto-attack on mouse up
window.addEventListener('mouseup', (e) => {
  if (e.button === 0) mouseDown = false;
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

// Simple collision resolution for entities (circle-based on XZ plane)
function resolveEntityCollisions(entities: Entity[]) {
  for (let i = 0; i < entities.length; i++) {
    const a = entities[i];
    if (!a || a.isDead || (a as any).isDying) continue;
    for (let j = i + 1; j < entities.length; j++) {
      const b = entities[j];
      if (!b || b.isDead || (b as any).isDying) continue;

      const rA = a.collisionRadius ?? 0.5;
      const rB = b.collisionRadius ?? 0.5;

      let dx = b.position.x - a.position.x;
      let dz = b.position.z - a.position.z;
      let dist2 = dx * dx + dz * dz;
      const minDist = rA + rB;

      // If exactly overlapping, jitter a bit so we can resolve
      if (dist2 < 1e-8) {
        dx = (Math.random() - 0.5) * 1e-3;
        dz = (Math.random() - 0.5) * 1e-3;
        dist2 = dx * dx + dz * dz;
      }

      if (dist2 < minDist * minDist) {
        const dist = Math.sqrt(dist2);
        const overlap = minDist - dist;

        const nx = dx / (dist || 1);
        const nz = dz / (dist || 1);

        // Move proportional to inverse mass so heavier objects move less
        const totalMass = (a.mass || 1) + (b.mass || 1);
        const aMove = overlap * ((b.mass || 1) / totalMass);
        const bMove = overlap * ((a.mass || 1) / totalMass);

        a.position.x -= nx * aMove;
        a.position.z -= nz * aMove;
        b.position.x += nx * bMove;
        b.position.z += nz * bMove;
      }
    }
  }
}

function animate(time: number) {
  // Schedule next frame early
  requestAnimationFrame(animate);

  // Initialize last time on first frame
  if (_lastFrameTime === null) _lastFrameTime = time;

  // Real delta in seconds, clamped to avoid huge steps (e.g., when tab was inactive)
  const realDeltaSeconds = Math.min((time - _lastFrameTime) / 1000, 0.1);
  _lastFrameTime = time;

  // Update juice using real time (so shake/particles keep moving during hit-stop)
  juice.update(realDeltaSeconds);

  // Apply hit-stop as a time scale (only while alive)
  const timeScale = (player.isDead || (player as any).isDying) ? 1 : juice.getTimeScale();
  const deltaSeconds = realDeltaSeconds * timeScale;

  // Convert to "reference frames" assuming 60 FPS so existing tuning remains usable
  const dt = deltaSeconds * 60;

  // HUD update
  const hp01 = player.maxHealth > 0 ? player.health / player.maxHealth : 0;
  if (hudHpFill) hudHpFill.style.width = `${Math.max(0, Math.min(1, hp01)) * 100}%`;
  if (hudHpText) hudHpText.textContent = `${Math.max(0, Math.round(player.health))} / ${Math.round(player.maxHealth)}`;

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

  // Only allow player to move/attack while fully alive and not dying.
  if (!player.isDead && !(player as any).isDying) {
    player.update(dt);
    player.move(inputDirection, dt);
    if (keys['Space']) {
      player.attack(enemies);
    }
  } else {
    // still let update run (handles flash or death animation)
    player.update(dt);
  }

  // Auto-attack while left mouse button is held down
  if (mouseDown && !player.isDead && !(player as any).isDying) {
    if (lastAttackPoint) {
      const dir = new THREE.Vector3().subVectors(lastAttackPoint, player.position).setY(0);
      if (dir.lengthSq() < 1e-6) {
        player.attack(enemies);
      } else {
        dir.normalize();
        player.attack(enemies, dir);
      }
    } else {
      player.attack(enemies);
    }
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
    camera.position.copy(frozenCameraPos).add(juice.getCameraOffset());
    camera.lookAt(frozenLookAt);
    directionalLight.position.copy(frozenLookAt).add(TUNING.DIRECTIONAL_LIGHT_POSITION);
    directionalLight.target.position.copy(frozenLookAt);
    directionalLight.target.updateMatrixWorld();
  } else {
    const targetPosition = new THREE.Vector3(player.position.x, TUNING.CHARACTER_INITIAL_Y, player.position.z);
    camera.position.copy(targetPosition).add(TUNING.ISO_OFFSET).add(juice.getCameraOffset());
    camera.lookAt(targetPosition);

    // Zoom punch (orthographic camera)
    const desiredZoom = juice.getZoomMultiplier();
    if (Math.abs(camera.zoom - desiredZoom) > 1e-3) {
      camera.zoom = desiredZoom;
      camera.updateProjectionMatrix();
    }

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

  // Resolve simple circular collisions on XZ plane so entities don't overlap
  const allEntities: Entity[] = [player, ...enemies];
  resolveEntityCollisions(allEntities);

  composer.render();
}

// Start loop
requestAnimationFrame(animate);
