import * as THREE from 'three';
import { Entity } from './entity';
import { TUNING } from './tuning';
import { createSectorMesh } from './attack_visuals';

export class Enemy extends Entity {
    private target: Entity;
    private attackCooldown: number = 0;

    constructor(position: THREE.Vector3, target: Entity) {
        const geometry = new THREE.BoxGeometry(TUNING.ENEMY_SIZE, TUNING.ENEMY_SIZE, TUNING.ENEMY_SIZE);
        const material = new THREE.MeshStandardMaterial({ color: TUNING.ENEMY_COLOR });
        const mesh = new THREE.Mesh(geometry, material);
        
        mesh.position.copy(position);
        mesh.position.y = TUNING.ENEMY_SIZE / 2; // Ensure it sits on the ground
        
        mesh.castShadow = true;
        mesh.receiveShadow = true;

        super(mesh, TUNING.ENEMY_HEALTH);
        this.target = target;
        // Collision size for this enemy
        this.collisionRadius = TUNING.ENEMY_SIZE * 0.5;
        this.mass = 1;
    }

    update(dt: number) {
        if (!this.target || this.isDead || this.target.isDead) return;

        this.updateFlash(dt);

        if (this.attackCooldown > 0) {
            this.attackCooldown -= dt / 60;
        }

        const distance = this.position.distanceTo(this.target.position);

        if (distance <= TUNING.ENEMY_ATTACK_RANGE) {
            this.attack(this.target);
        } else {
            // Calculate direction towards the target
            const direction = new THREE.Vector3()
                .subVectors(this.target.position, this.mesh.position)
                .setY(0) // Keep movement on the ground plane
                .normalize();

            // Move towards the target
            this.mesh.position.add(direction.multiplyScalar(TUNING.ENEMY_SPEED * dt));
        }
    }

    attack(target: Entity) {
        if (this.attackCooldown > 0 || target.isDead || !this.scene) return;

        target.takeDamage(TUNING.ENEMY_ATTACK_DAMAGE);
        this.attackCooldown = TUNING.ENEMY_ATTACK_COOLDOWN;

        // Direction toward target on XZ plane
        const dir = new THREE.Vector3().subVectors(target.position, this.position).setY(0);
        if (dir.lengthSq() < 1e-6) dir.set(0, 0, 1);
        dir.normalize();

        const angleRad = THREE.MathUtils.degToRad(TUNING.ENEMY_ATTACK_ARC_ANGLE);
        const segs = TUNING.ENEMY_ATTACK_SEGMENTS;

        const sector = createSectorMesh(TUNING.ENEMY_ATTACK_RANGE, angleRad, segs, 0xff0000, 0.9);
        const yaw = Math.atan2(dir.x, dir.z);
        sector.rotation.y = yaw;
        sector.position.copy(this.position);
        sector.position.y = 0.05;
        this.scene.add(sector);

        const duration = TUNING.ATTACK_VISUAL_DURATION;
        const start = performance.now();
        const initialOpacity = (sector.material as THREE.MeshBasicMaterial).opacity;
        const animate = () => {
            const elapsed = (performance.now() - start) / 1000;
            const t = Math.min(1, elapsed / duration);
            sector.scale.setScalar(1 + t * 0.3);
            (sector.material as THREE.MeshBasicMaterial).opacity = Math.max(0, initialOpacity * (1 - t));
            if (t >= 1) {
                if (this.scene) this.scene.remove(sector);
                sector.geometry.dispose();
                (sector.material as THREE.Material).dispose();
                return;
            }
            requestAnimationFrame(animate);
        };
        animate();
    }
}
