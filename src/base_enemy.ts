import * as THREE from 'three';
import { TUNING } from './tuning';

export class BaseEnemy {
    public mesh: THREE.Mesh;
    private target: THREE.Object3D;

    constructor(scene: THREE.Scene, position: THREE.Vector3, target: THREE.Object3D) {
        this.target = target;

        const geometry = new THREE.BoxGeometry(TUNING.ENEMY_SIZE, TUNING.ENEMY_SIZE, TUNING.ENEMY_SIZE);
        const material = new THREE.MeshStandardMaterial({ color: TUNING.ENEMY_COLOR });
        this.mesh = new THREE.Mesh(geometry, material);
        
        this.mesh.position.copy(position);
        this.mesh.position.y = TUNING.ENEMY_SIZE / 2; // Ensure it sits on the ground
        
        this.mesh.castShadow = true;
        this.mesh.receiveShadow = true;

        scene.add(this.mesh);
    }

    update(dt: number) {
        if (!this.target) return;

        // Calculate direction towards the target (player)
        // We only care about X and Z for movement on the ground
        const direction = new THREE.Vector3()
            .subVectors(this.target.position, this.mesh.position)
            .setY(0) // Keep movement on the ground plane
            .normalize();

        // Move towards the target
        this.mesh.position.add(direction.multiplyScalar(TUNING.ENEMY_SPEED * dt));
    }
}
