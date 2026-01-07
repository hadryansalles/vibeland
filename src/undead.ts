import * as THREE from 'three';
import { Entity } from './entity';
import { TUNING } from './tuning';
import { convertModelToTHREEJS } from './model';
import type { Model } from './model';
import { createSectorMesh, createRectangleMesh } from './attack_visuals';

export class Undead extends Entity {
    private target: Entity;
    private attackCooldown: number = 0;
    private lungeTimeLeft: number = 0; // seconds
    private lastDamagedTimer: number = 999;

    constructor(position: THREE.Vector3, target: Entity) {
        // Blocky skeletal/undead model made from cubes
        const undeadModel: Model = {
            cubes: [
                // Torso
                { position: [0, 0, 0], size: [0.6, 0.8, 0.3], color: [0.9, 0.9, 0.85] },
                // Head
                { position: [0, 0.55, 0], size: [0.36, 0.36, 0.36], color: [0.95, 0.95, 0.9] },
                // Left arm
                { position: [-0.5, 0.05, 0], size: [0.18, 0.6, 0.18], color: [0.9, 0.9, 0.85] },
                // Right arm
                { position: [0.5, 0.05, 0], size: [0.18, 0.6, 0.18], color: [0.9, 0.9, 0.85] },
                // Pelvis
                { position: [0, -0.45, 0], size: [0.45, 0.2, 0.25], color: [0.85, 0.85, 0.8] },
                // Left leg
                { position: [-0.15, -0.85, 0], size: [0.18, 0.4, 0.18], color: [0.85, 0.85, 0.8] },
                // Right leg
                { position: [0.15, -0.85, 0], size: [0.18, 0.4, 0.18], color: [0.85, 0.85, 0.8] },
                // Eye sockets (dark)
                { position: [-0.08, 0.58, 0.18], size: [0.06, 0.06, 0.02], color: [0, 0, 0] },
                { position: [0.08, 0.58, 0.18], size: [0.06, 0.06, 0.02], color: [0, 0, 0] },
            ],
        };

        const mesh = convertModelToTHREEJS(undeadModel);
        mesh.position.copy(position);
        mesh.position.y = TUNING.UNDEAD_INITIAL_Y;
        mesh.castShadow = true;
        mesh.receiveShadow = true;

        super(mesh, TUNING.UNDEAD_HEALTH, 'Undead');

        this.collisionRadius = TUNING.UNDEAD_SIZE * 0.5;
        this.mass = 1.2;
        this.target = target;
    }

    update(dt: number) {
        this.updateFlash(dt);

        // If playing death animation, drive it and skip other behavior
        if (this.isDying) {
            this.updateDeath(dt);
            return;
        }

        if (this.isDead || !this.target || this.target.isDead || this.target.isDying) return;

        if (this.attackCooldown > 0) this.attackCooldown -= dt / 60;

        // Regen timer (seconds)
        this.lastDamagedTimer += dt / 60;
        if (this.lastDamagedTimer >= TUNING.UNDEAD_REGEN_DELAY && this.health < this.maxHealth) {
            // Regenerate slowly over time
            this.health = Math.min(this.maxHealth, this.health + TUNING.UNDEAD_REGEN_AMOUNT * (dt / 60));
        }

        const toTarget = new THREE.Vector3().subVectors(this.target.position, this.position).setY(0);
        const dist = toTarget.length();

        // If currently lunging, continue forward
        if (this.lungeTimeLeft > 0) {
            this.lungeTimeLeft -= dt / 60;
            // Move in facing direction
            const forward = new THREE.Vector3(0, 0, 1).applyQuaternion(this.mesh.quaternion).setY(0).normalize();
            this.mesh.position.add(forward.multiplyScalar(TUNING.UNDEAD_LUNGE_SPEED * dt));
        } else {
            // Normal shamble toward player
            if (dist > 1e-4) {
                toTarget.normalize();
                this.mesh.position.add(toTarget.multiplyScalar(TUNING.UNDEAD_SPEED * dt));

                // Face movement direction slowly
                const desiredYaw = Math.atan2(toTarget.x, toTarget.z);
                const targetQuat = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), desiredYaw);
                const lerpAlpha = 1 - Math.pow(1 - TUNING.ROTATION_LERP_FACTOR * 0.5, dt);
                this.mesh.quaternion.slerp(targetQuat, lerpAlpha);
            }

            // Decide to lunge if close and cooldown ready
            if (dist <= 3.0 && this.attackCooldown <= 0 && Math.random() < 0.02) {
                this.lungeTimeLeft = TUNING.UNDEAD_LUNGE_DURATION;
                this.attackCooldown = TUNING.UNDEAD_ATTACK_COOLDOWN;
                // small visual for lunge (flash) that covers the entire dash distance
                if (this.scene) {
                    const dir = new THREE.Vector3().subVectors(this.target.position, this.position).setY(0);
                    if (dir.lengthSq() < 1e-6) dir.set(0, 0, 1);
                    dir.normalize();
                    const yaw = Math.atan2(dir.x, dir.z);
                    const dashLength = this.getDashDistance();
                    const rect = createRectangleMesh(TUNING.UNDEAD_ATTACK_WIDTH, dashLength, 0xffcc99, 0.7);
                    rect.rotation.y = yaw;
                    rect.position.copy(this.position);
                    rect.position.y = 0.05;
                    this.scene.add(rect);
                    setTimeout(() => {
                        if (this.scene) {
                            this.scene.remove(rect);
                            rect.geometry.dispose();
                            (rect.material as THREE.Material).dispose();
                        }
                    }, TUNING.ATTACK_VISUAL_DURATION * 1000);
                }
            }
        }

        // If the target is inside the forward rectangle, perform a direct hit
        if (this.attackCooldown <= 0) {
            const checkLength = this.lungeTimeLeft > 0 ? this.getDashDistance() : TUNING.UNDEAD_ATTACK_RANGE;
            if (this.isPointInForwardRect(this.target.position, TUNING.UNDEAD_ATTACK_WIDTH, checkLength)) {
                this.attack(this.target);
            }
        }
    }

    attack(target: Entity) {
        if (this.attackCooldown > 0 || this.isDead || this.isDying || target.isDead || target.isDying || !this.scene) return;
        // Only apply damage if the target is inside the forward rectangular area
        const width = TUNING.UNDEAD_ATTACK_WIDTH;
        const length = TUNING.UNDEAD_ATTACK_RANGE;

        // Visual: rectangular hit area in front of undead
        const dir = new THREE.Vector3().subVectors(target.position, this.position).setY(0);
        if (dir.lengthSq() < 1e-6) dir.set(0, 0, 1);
        dir.normalize();
        const yaw = Math.atan2(dir.x, dir.z);
        // If currently lunging, extend the rectangle to cover the full dash distance
        const visualLength = this.lungeTimeLeft > 0 ? this.getDashDistance() : length;
        const rect = createRectangleMesh(width, visualLength, 0xff8888, 0.85);
        rect.rotation.y = yaw;
        rect.position.copy(this.position);
        rect.position.y = 0.05;
        this.scene.add(rect);

        const duration = TUNING.ATTACK_VISUAL_DURATION;
        const start = performance.now();
        const initialOpacity = (rect.material as THREE.MeshBasicMaterial).opacity;
        const animate = () => {
            const elapsed = (performance.now() - start) / 1000;
            const t = Math.min(1, elapsed / duration);
            rect.scale.set(1 + t * 0.35, 1, 1 + t * 0.35);
            (rect.material as THREE.MeshBasicMaterial).opacity = Math.max(0, initialOpacity * (1 - t));
            if (t >= 1) {
                if (this.scene) this.scene.remove(rect);
                rect.geometry.dispose();
                (rect.material as THREE.Material).dispose();
                return;
            }
            requestAnimationFrame(animate);
        };
        animate();

        // Apply damage only if inside rectangle (use same dash-aware length)
        const effectiveLength = this.lungeTimeLeft > 0 ? this.getDashDistance() : length;
        if (this.isPointInForwardRect(target.position, width, effectiveLength)) {
            target.takeDamage(TUNING.UNDEAD_ATTACK_DAMAGE);
        }

        this.attackCooldown = TUNING.UNDEAD_ATTACK_COOLDOWN;
    }

    takeDamage(amount: number) {
        super.takeDamage(amount);
        this.lastDamagedTimer = 0;
    }

    private isPointInForwardRect(point: THREE.Vector3, width: number, length: number) {
        // Transform the point into the undead's local space so +Z is forward
        const toPoint = new THREE.Vector3().subVectors(point, this.position).setY(0);
        const inv = this.mesh.quaternion.clone().conjugate();
        const local = toPoint.clone().applyQuaternion(inv);
        // local.z forward component should be between 0 and length, local.x within half width
        return local.z >= 0 && local.z <= length && Math.abs(local.x) <= width * 0.5;
    }

    // Compute the expected dash distance (world units) covered during the lunge.
    // Uses the same frame-based movement convention: speed * duration * 60 (frames)
    private getDashDistance() {
        return TUNING.UNDEAD_LUNGE_SPEED * TUNING.UNDEAD_LUNGE_DURATION * 60;
    }
}
