import * as THREE from 'three';
import { Entity } from './entity';
import { TUNING } from './tuning';
import { convertModelToTHREEJS } from './model';
import type { Model } from './model';
import { createSectorMesh } from './attack_visuals';
import { audio } from './audio';

export class Slime extends Entity {
    private target: Entity;
    private jumpTime: number = Math.random() * Math.PI * 2;
    private attackCooldown: number = 0;

    constructor(position: THREE.Vector3, target: Entity) {
        // Simple cute slime model built from cubes
        const slimeModel: Model = {
            cubes: [
                // Main body (lower)
                { position: [0, -0.3, 0], size: [0.5, 0.5, 0.5], color: [0.18, 0.9, 0.36] },
                // Top gloss
                { position: [0, -0.1, 0.08], size: [0.3, 0.12, 0.3], color: [0.12, 0.95, 0.4] },
            ],
        };

        const mesh = convertModelToTHREEJS(slimeModel);
        mesh.position.copy(position);
        mesh.position.y = TUNING.SLIME_INITIAL_Y;
        mesh.castShadow = true;
        mesh.receiveShadow = true;

        super(mesh, TUNING.SLIME_HEALTH, 'Slime');

        this.collisionRadius = TUNING.SLIME_SIZE * 0.5;
        this.mass = 0.7;
        this.target = target;
        // Make slightly translucent
        if (this.mesh instanceof THREE.Mesh) {
            (this.mesh.material as THREE.MeshStandardMaterial).transparent = true;
            (this.mesh.material as THREE.MeshStandardMaterial).opacity = 0.95;
            (this.mesh.material as THREE.MeshStandardMaterial).roughness = 0.6;
        }
    }

    update(dt: number) {
        // Keep flash update running
        this.updateFlash(dt);

        // If playing death animation, drive it and skip other behavior
        if (this.isDying) {
            this.updateDeath(dt);
            return;
        }

        if (this.isDead || !this.target || this.target.isDead || this.target.isDying) return;

        if (this.attackCooldown > 0) this.attackCooldown -= dt / 60;

        // Movement: hop toward target with a soft bounce
        const toTarget = new THREE.Vector3().subVectors(this.target.position, this.position).setY(0);
        const dist = toTarget.length();

        if (dist > 1e-4) {
            toTarget.normalize();
            this.mesh.position.add(toTarget.multiplyScalar(TUNING.SLIME_SPEED * dt));

            // Face movement direction
            const desiredYaw = Math.atan2(toTarget.x, toTarget.z);
            const targetQuat = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), desiredYaw);
            const lerpAlpha = 1 - Math.pow(1 - TUNING.ROTATION_LERP_FACTOR, dt);
            this.mesh.quaternion.slerp(targetQuat, lerpAlpha);
        }

        // Hopping animation
        this.jumpTime += TUNING.SLIME_HOP_SPEED * dt;
        const bounce = Math.abs(Math.sin(this.jumpTime));
        this.mesh.position.y = TUNING.SLIME_INITIAL_Y + bounce * TUNING.SLIME_BOUNCE_HEIGHT;

        // Squash & stretch
        const squashFactor = TUNING.SLIME_SQUASH_FACTOR;
        const scaleY = 1 - squashFactor + (bounce * squashFactor * 2);
        const scaleXZ = 1 / Math.sqrt(Math.max(0.0001, scaleY));
        this.mesh.scale.set(scaleXZ, scaleY, scaleXZ);

        // Attack if in range
        if (dist <= TUNING.SLIME_ATTACK_RANGE) {
            this.attack(this.target);
        }

        // Apply any knockback impulse after our movement/animation.
        this.applyKnockback(dt);
    }

    attack(target: Entity) {
        if (this.attackCooldown > 0 || this.isDead || this.isDying || target.isDead || target.isDying || !this.scene) return;

        audio.playEnemyAttack('slime');

        target.takeDamage(TUNING.SLIME_ATTACK_DAMAGE, { from: this.position, knockback: TUNING.PLAYER_HIT_KNOCKBACK });
        this.attackCooldown = TUNING.SLIME_ATTACK_COOLDOWN;

        // Small visual wedge in front of slime
        const dir = new THREE.Vector3().subVectors(target.position, this.position).setY(0);
        if (dir.lengthSq() < 1e-6) dir.set(0, 0, 1);
        dir.normalize();

        const angleRad = THREE.MathUtils.degToRad(60);
        const segs = 8;
        const sector = createSectorMesh(TUNING.SLIME_ATTACK_RANGE, angleRad, segs, 0x55ff55, 0.6);
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
            sector.scale.setScalar(1 + t * 0.4);
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
