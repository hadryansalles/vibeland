import * as THREE from 'three';
import { Entity } from './entity';
import { TUNING } from './tuning';
import { convertModelToTHREEJS } from './model';
import type { Model } from './model';
import { createSectorMesh } from './attack_visuals';

export class Player extends Entity {
    private jumpTime: number = 0;
    private attackCooldown: number = 0;

    constructor() {
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

        const mesh = convertModelToTHREEJS(playerModel);
        mesh.position.y = TUNING.CHARACTER_INITIAL_Y;
        super(mesh, TUNING.PLAYER_HEALTH);
        // Set collision properties
        this.collisionRadius = TUNING.CHARACTER_SIZE * 0.5;
        this.mass = 2;
    }

    update(dt: number) {
        // Keep flash update running but otherwise do nothing while dead
        this.updateFlash(dt);
        if (this.isDead) return;

        if (this.attackCooldown > 0) {
            this.attackCooldown -= dt / 60; // dt is in reference frames (60fps)
        }
    }

    attack(enemies: Entity[], direction?: THREE.Vector3) {
        if (this.attackCooldown > 0 || this.isDead || !this.scene) return;

        // Determine attack direction (XZ plane). If none provided, use the player's facing.
        let dir: THREE.Vector3;
        if (direction) {
            dir = direction.clone().setY(0);
        } else {
            dir = new THREE.Vector3(0, 0, 1).applyQuaternion(this.mesh.quaternion).setY(0);
        }
        if (dir.lengthSq() < 1e-6) dir.set(0, 0, 1);
        dir.normalize();

        const angleRad = THREE.MathUtils.degToRad(TUNING.PLAYER_ATTACK_ARC_ANGLE);
        const segs = TUNING.PLAYER_ATTACK_SEGMENTS;

        // Visual: sector oriented toward the attack direction
        const sector = createSectorMesh(TUNING.PLAYER_ATTACK_RANGE, angleRad, segs, 0xffffff, 0.6);
        const yaw = Math.atan2(dir.x, dir.z);
        sector.rotation.y = yaw;
        sector.position.copy(this.position);
        sector.position.y = 0.05;
        this.scene.add(sector);

        // Animate fade + slight expansion over duration
        const duration = TUNING.ATTACK_VISUAL_DURATION;
        const start = performance.now();
        const initialOpacity = (sector.material as THREE.MeshBasicMaterial).opacity;
        const animate = () => {
            const elapsed = (performance.now() - start) / 1000;
            const t = Math.min(1, elapsed / duration);
            const scale = 1 + t * 0.5;
            sector.scale.set(scale, scale, scale);
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

        // Damage detection: range + angle test
        const cosHalf = Math.cos(angleRad / 2);
        enemies.forEach(enemy => {
            if (enemy.isDead) return;
            const toEnemy = new THREE.Vector3().subVectors(enemy.position, this.position).setY(0);
            const dist = toEnemy.length();
            if (dist <= TUNING.PLAYER_ATTACK_RANGE) {
                toEnemy.normalize();
                const dot = dir.dot(toEnemy);
                if (dot >= cosHalf) {
                    enemy.takeDamage(TUNING.PLAYER_ATTACK_DAMAGE);
                }
            }
        });

        this.attackCooldown = TUNING.PLAYER_ATTACK_COOLDOWN;
    }

    move(direction: THREE.Vector3, dt: number) {
        if (this.isDead) return;
        if (direction.lengthSq() > 0) {
            // Normalize to ensure consistent speed in all directions.
            direction.normalize().multiplyScalar(TUNING.MOVEMENT_SPEED * dt);
            this.mesh.position.add(direction);

            // Advance jump time scaled by delta frames
            this.jumpTime += TUNING.JUMP_SPEED_INCREMENT * dt;

            // Bouncing motion
            const bounce = Math.abs(Math.sin(this.jumpTime));
            this.mesh.position.y = TUNING.CHARACTER_INITIAL_Y + bounce * TUNING.JUMP_BOUNCE_HEIGHT;

            // Squeeze and stretch
            const squashFactor = TUNING.JUMP_SQUASH_FACTOR;
            const scaleY = 1 - squashFactor + (bounce * squashFactor * 2);
            const scaleXZ = 1 / Math.sqrt(scaleY);
            this.mesh.scale.set(scaleXZ, scaleY, scaleXZ);

            // Rotate player to face movement direction (smooth)
            const moveDir = new THREE.Vector3(direction.x, 0, direction.z);
            if (moveDir.lengthSq() > 1e-6) {
                moveDir.normalize();
                const desiredYaw = Math.atan2(moveDir.x, moveDir.z);

                const baseLerp = TUNING.ROTATION_LERP_FACTOR;
                const lerpAlpha = 1 - Math.pow(1 - baseLerp, dt);

                const targetQuat = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), desiredYaw);
                this.mesh.quaternion.slerp(targetQuat, lerpAlpha);
            }
        } else {
            // Reset jump time and smoothly lerp back to resting pose.
            this.jumpTime = 0;

            const baseLerp = TUNING.JUMP_LERP_FACTOR;
            const lerpAlpha = 1 - Math.pow(1 - baseLerp, dt);

            this.mesh.position.y = THREE.MathUtils.lerp(this.mesh.position.y, TUNING.CHARACTER_INITIAL_Y, lerpAlpha);
            this.mesh.scale.lerp(new THREE.Vector3(1, 1, 1), lerpAlpha);
        }
    }
}
