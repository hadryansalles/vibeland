import './style.css'
import * as THREE from 'three'
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { SSAOPass } from 'three/examples/jsm/postprocessing/SSAOPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { TUNING } from './tuning'

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

// Cube Character
const cubeGeometry = new THREE.BoxGeometry(TUNING.CHARACTER_SIZE, TUNING.CHARACTER_SIZE, TUNING.CHARACTER_SIZE);
const cubeMaterial = new THREE.MeshStandardMaterial({ color: TUNING.CHARACTER_COLOR });
const cube = new THREE.Mesh(cubeGeometry, cubeMaterial);
cube.position.y = TUNING.CHARACTER_INITIAL_Y;
cube.castShadow = true; // Character casts shadows
cube.receiveShadow = true;
scene.add(cube);

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

// Animation Loop
let jumpTime = 0;

function animate() {
  requestAnimationFrame(animate);

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
    // Normalize to ensure consistent speed in all directions
    direction.normalize().multiplyScalar(TUNING.MOVEMENT_SPEED);
    cube.position.add(direction);

    jumpTime += TUNING.JUMP_SPEED_INCREMENT;
    // Bouncing motion
    const bounce = Math.abs(Math.sin(jumpTime));
    cube.position.y = TUNING.CHARACTER_INITIAL_Y + bounce * TUNING.JUMP_BOUNCE_HEIGHT;

    // Squeeze and stretch
    // Squash at the bottom (bounce near 0), stretch at the top (bounce near 1)
    const squashFactor = TUNING.JUMP_SQUASH_FACTOR;
    const scaleY = 1 - squashFactor + (bounce * squashFactor * 2);
    const scaleXZ = 1 / Math.sqrt(scaleY);
    cube.scale.set(scaleXZ, scaleY, scaleXZ);
  } else {
    jumpTime = 0;
    cube.position.y = THREE.MathUtils.lerp(cube.position.y, TUNING.CHARACTER_INITIAL_Y, TUNING.JUMP_LERP_FACTOR);
    cube.scale.lerp(new THREE.Vector3(1, 1, 1), TUNING.JUMP_LERP_FACTOR);
  }

  // Stable target for camera and lights (ignoring jump height)
  const targetPosition = new THREE.Vector3(cube.position.x, TUNING.CHARACTER_INITIAL_Y, cube.position.z);

  // Camera follow with isometric offset
  camera.position.copy(targetPosition).add(TUNING.ISO_OFFSET);
  camera.lookAt(targetPosition);

  // Update directional light to follow character (keep shadows in view)
  directionalLight.position.copy(targetPosition).add(TUNING.DIRECTIONAL_LIGHT_POSITION);
  directionalLight.target.position.copy(targetPosition);
  directionalLight.target.updateMatrixWorld();

  composer.render();
}

animate();
