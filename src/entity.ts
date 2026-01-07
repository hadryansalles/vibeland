import * as THREE from 'three';
import { TUNING } from './tuning';

export abstract class Entity {
    public mesh: THREE.Object3D;
    public displayName: string;
    public health: number;
    public maxHealth: number;
    public isDead: boolean = false;
    // Collision radius on the XZ plane (world units). Subclasses should set appropriately.
    public collisionRadius: number = 0.5;
    // Mass used for collision resolution (larger mass -> moves less when collided)
    public mass: number = 1;
    protected flashTimer: number = 0;
    protected scene: THREE.Scene | null = null;

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
        if (this.isDead) return;
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
        this.isDead = true;
        // Basic death behavior: hide mesh
        this.mesh.visible = false;
    }

    revive(position?: THREE.Vector3) {
        this.isDead = false;
        this.health = this.maxHealth;
        this.flashTimer = 0;
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
