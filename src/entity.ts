import * as THREE from 'three';
import { TUNING } from './tuning';

export abstract class Entity {
    public mesh: THREE.Object3D;
    public displayName: string;
    public health: number;
    public maxHealth: number;
    // true when fully dead (no longer updated / removed)
    public isDead: boolean = false;
    // true while playing the death animation (tilt + fade). When true the entity should not act.
    public isDying: boolean = false;
    // Collision radius on the XZ plane (world units). Subclasses should set appropriately.
    public collisionRadius: number = 0.5;
    // Mass used for collision resolution (larger mass -> moves less when collided)
    public mass: number = 1;
    protected flashTimer: number = 0;
    protected scene: THREE.Scene | null = null;
    // Death animation state
    protected deathTimer: number = 0; // seconds
    protected deathDuration: number = TUNING.DEATH_FADE_DURATION;
    protected deathStartQuat: THREE.Quaternion | null = null;
    protected deathTargetQuat: THREE.Quaternion | null = null;

    constructor(mesh: THREE.Object3D, health: number = 100, displayName?: string) {
        this.mesh = mesh;
        this.health = health;
        this.maxHealth = health;
        // default displayName to concrete class name if not provided
        this.displayName = displayName ?? (this.constructor && (this.constructor as any).name) ?? 'Entity';
    }

    abstract update(dt: number): void;

    protected updateFlash(dt: number) {
        if (this.flashTimer > 0) {
            this.flashTimer -= dt / 60;
            if (this.flashTimer <= 0) {
                this.flashTimer = 0;
                this.resetMaterials();
            }
        }
    }

    // Drives the death animation (tilt + fade). Call this from subclasses' update(dt).
    protected updateDeath(dt: number) {
        if (!this.isDying) return;

        // advance timer (dt is in reference-frame units: frames @60hz)
        this.deathTimer += dt / 60;
        const t = Math.min(1, this.deathTimer / (this.deathDuration || 1));

        // Interpolate rotation from start to target
        if (this.deathStartQuat && this.deathTargetQuat) {
            this.mesh.quaternion.copy(this.deathStartQuat).slerp(this.deathTargetQuat, t);
        }

        // Fade materials
        this.mesh.traverse((child) => {
            if (child instanceof THREE.Mesh) {
                const mat = child.material as any;
                const init = child.userData.deathInitialOpacity ?? (mat && mat.opacity !== undefined ? mat.opacity : 1);
                if (mat && typeof mat.opacity === 'number') {
                    mat.opacity = Math.max(0, init * (1 - t));
                }
            }
        });

        // Finish
        if (t >= 1) {
            this.isDying = false;
            this.isDead = true;
            // hide fully at end
            this.mesh.visible = false;
        }
    }

    protected setFlashMaterials() {
        this.mesh.traverse((child) => {
            if (child instanceof THREE.Mesh) {
                if (!child.userData.originalMaterial) {
                    child.userData.originalMaterial = child.material;
                }
                child.material = new THREE.MeshStandardMaterial({ 
                    color: TUNING.DAMAGE_FLASH_COLOR,
                    emissive: TUNING.DAMAGE_FLASH_COLOR,
                    emissiveIntensity: 1
                });
            }
        });
    }

    protected resetMaterials() {
        this.mesh.traverse((child) => {
            if (child instanceof THREE.Mesh && child.userData.originalMaterial) {
                child.material = child.userData.originalMaterial;
            }
        });
    }

    takeDamage(amount: number) {
        if (this.isDead || this.isDying) return;
        this.health -= amount;
        this.flashTimer = TUNING.DAMAGE_FLASH_DURATION; // Flash using tuning
        this.setFlashMaterials();
        
        console.log(`${this.constructor.name} took ${amount} damage. Health: ${this.health}`);
        if (this.health <= 0) {
            this.health = 0;
            this.die();
        }
    }

    die() {
        if (this.isDead || this.isDying) return;
        // start death animation (tilt + fade)
        this.isDying = true;
        this.deathTimer = 0;
        this.deathDuration = TUNING.DEATH_FADE_DURATION ?? this.deathDuration;

        // store start and target quaternions (tilt around local X axis)
        this.deathStartQuat = this.mesh.quaternion.clone();
        const angleRad = (TUNING.DEATH_ROTATION_ANGLE_DEGREES ?? 90) * Math.PI / 180;
        // randomize direction a bit so bodies can fall left/right
        const dir = Math.random() < 0.5 ? 1 : -1;
        const tiltQuat = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), dir * angleRad);
        this.deathTargetQuat = this.deathStartQuat.clone().multiply(tiltQuat);

        // Prepare materials for fading: clone materials so we can modify opacity safely
        this.mesh.traverse((child) => {
            if (child instanceof THREE.Mesh) {
                // save original material (for revive) if not saved
                if (!child.userData.deathOriginalMaterial) child.userData.deathOriginalMaterial = child.material;
                // attempt to clone material to avoid altering shared material
                try {
                    const cloned = (child.material as any).clone();
                    cloned.transparent = true;
                    // ensure opacity value exists
                    if (cloned.opacity === undefined) cloned.opacity = 1;
                    child.material = cloned;
                } catch (e) {
                    // fallback: if clone not available, just make the existing material transparent
                    (child.material as any).transparent = true;
                }
                // remember initial opacity to scale from
                const mat = child.material as any;
                child.userData.deathInitialOpacity = mat && mat.opacity !== undefined ? mat.opacity : 1;
            }
        });
    }

    revive(position?: THREE.Vector3) {
        this.isDead = false;
        this.isDying = false;
        this.health = this.maxHealth;
        this.flashTimer = 0;
        // restore any death-cloned materials
        this.mesh.traverse((child) => {
            if (child instanceof THREE.Mesh) {
                if (child.userData.deathOriginalMaterial) {
                    child.material = child.userData.deathOriginalMaterial;
                    delete child.userData.deathOriginalMaterial;
                }
                delete child.userData.deathInitialOpacity;
            }
        });
        this.resetMaterials();
        this.mesh.visible = true;
        if (position) {
            this.mesh.position.copy(position);
        }
    }

    addToScene(scene: THREE.Scene) {
        this.scene = scene;
        // attach a back-reference so raycasts can find the Entity from an Object3D
        (this.mesh as any).userData = (this.mesh as any).userData || {};
        (this.mesh as any).userData.entity = this;
        scene.add(this.mesh);
    }

    get position() {
        return this.mesh.position;
    }

    get rotation() {
        return this.mesh.rotation;
    }

    get quaternion() {
        return this.mesh.quaternion;
    }

    get scale() {
        return this.mesh.scale;
    }
}
