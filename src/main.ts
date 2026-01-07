import './style.css'
import * as THREE from 'three'

// Scene setup
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x333333);

// Geometric properties
const aspectRatio = window.innerWidth / window.innerHeight;
const frustumSize = 20;

// Orthographic Camera for true top-down view without perspective distortion
const camera = new THREE.OrthographicCamera(
    frustumSize * aspectRatio / -2,
    frustumSize * aspectRatio / 2,
    frustumSize / 2,
    frustumSize / -2,
    1,
    1000
);

camera.position.set(0, 20, 0);
camera.lookAt(0, 0, 0);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// Lights
const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
directionalLight.position.set(10, 20, 10);
directionalLight.castShadow = true;
scene.add(directionalLight);

// Ground
const planeGeometry = new THREE.PlaneGeometry(50, 50);
const planeMaterial = new THREE.MeshStandardMaterial({ color: 0x444444 });
const plane = new THREE.Mesh(planeGeometry, planeMaterial);
plane.rotation.x = -Math.PI / 2;
scene.add(plane);

// Grid Helper
const gridHelper = new THREE.GridHelper(50, 50);
scene.add(gridHelper);

// Cube Character
const cubeGeometry = new THREE.BoxGeometry(1, 1, 1);
const cubeMaterial = new THREE.MeshStandardMaterial({ color: 0x00ff00 });
const cube = new THREE.Mesh(cubeGeometry, cubeMaterial);
cube.position.y = 0.5;
scene.add(cube);

// Controls state
const keys: { [key: string]: boolean } = {};
const speed = 0.15;

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
});

// Animation Loop
function animate() {
  requestAnimationFrame(animate);

  let moved = false;
  if (keys['ArrowUp'] || keys['KeyW']) {
    cube.position.z -= speed;
    moved = true;
  }
  if (keys['ArrowDown'] || keys['KeyS']) {
    cube.position.z += speed;
    moved = true;
  }
  if (keys['ArrowLeft'] || keys['KeyA']) {
    cube.position.x -= speed;
    moved = true;
  }
  if (keys['ArrowRight'] || keys['KeyD']) {
    cube.position.x += speed;
    moved = true;
  }

  if (moved) {
    // Make camera follow the cube
    camera.position.x = cube.position.x;
    camera.position.z = cube.position.z;
    camera.lookAt(cube.position);
  }

  renderer.render(scene, camera);
}

animate();
