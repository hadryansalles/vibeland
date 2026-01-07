import * as THREE from 'three';
import { TUNING } from './tuning';

type DamageNumber = {
  el: HTMLDivElement;
  worldPos: THREE.Vector3;
  vel: THREE.Vector3;
  ttl: number;
  age: number;
  isHeal: boolean;
};

type Particle = {
  mesh: THREE.Mesh;
  vel: THREE.Vector3;
  rotVel: THREE.Vector3;
  ttl: number;
  age: number;
  gravity: number;
};

export type HitFX = {
  targetPos: THREE.Vector3;
  fromPos?: THREE.Vector3;
  damage: number;
  isPlayerTarget: boolean;
  killed?: boolean;
  crit?: boolean;
};

function clamp01(v: number) {
  return Math.max(0, Math.min(1, v));
}

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

function randRange(min: number, max: number) {
  return min + Math.random() * (max - min);
}

class JuiceManager {
  private scene: THREE.Scene | null = null;
  private camera: THREE.Camera | null = null;
  private rendererEl: HTMLElement | null = null;

  // --- Hit stop ---
  private hitStopLeft = 0;

  // --- Camera shake ---
  private trauma = 0;
  private shakeOffset = new THREE.Vector3();

  // --- Camera zoom punch ---
  private zoomPunch = 0;

  // --- DOM overlays ---
  private damageLayer: HTMLDivElement | null = null;
  private screenFlash: HTMLDivElement | null = null;
  private damageNumbers: DamageNumber[] = [];

  // --- Particles (simple mesh shards) ---
  private particles: Particle[] = [];
  private particlePool: THREE.Mesh[] = [];
  private particleGeometry: THREE.BufferGeometry;

  constructor() {
    this.particleGeometry = new THREE.BoxGeometry(0.06, 0.06, 0.06);
  }

  init(opts: { scene: THREE.Scene; camera: THREE.Camera; rendererEl: HTMLElement }) {
    this.scene = opts.scene;
    this.camera = opts.camera;
    this.rendererEl = opts.rendererEl;

    // Damage numbers layer
    const dmg = document.createElement('div');
    dmg.id = 'damage-layer';
    document.body.appendChild(dmg);
    this.damageLayer = dmg;

    // Screen flash layer
    const flash = document.createElement('div');
    flash.id = 'screen-flash';
    document.body.appendChild(flash);
    this.screenFlash = flash;
  }

  /**
   * Called from the main loop with *real* seconds (not time-scaled).
   */
  update(realDtSeconds: number) {
    // Hit-stop timer uses real time (feels snappy even when dt is scaled).
    if (this.hitStopLeft > 0) {
      this.hitStopLeft = Math.max(0, this.hitStopLeft - realDtSeconds);
    }

    // Trauma decays in real time.
    const traumaDecay = TUNING.CAMERA_SHAKE_DECAY_PER_SEC ?? 2.6;
    this.trauma = Math.max(0, this.trauma - traumaDecay * realDtSeconds);

    // Generate camera offset from trauma.
    const maxShake = TUNING.CAMERA_SHAKE_MAX ?? 0.45;
    const amp = Math.min(maxShake, maxShake * this.trauma * this.trauma);
    // random each frame (good enough for this style)
    this.shakeOffset.set(randRange(-amp, amp), randRange(-amp, amp) * 0.55, randRange(-amp, amp));

    // Zoom punch relax
    const zoomReturn = TUNING.CAMERA_ZOOM_RETURN_PER_SEC ?? 8;
    this.zoomPunch = Math.max(0, this.zoomPunch - zoomReturn * realDtSeconds);

    this.updateDamageNumbers(realDtSeconds);
    this.updateParticles(realDtSeconds);

    // Screen flash is a pure CSS animation; we just let it fade via class/opacity.
    if (this.screenFlash) {
      const targetOpacity = this.trauma > 0.35 ? 0.08 : 0;
      const current = Number(this.screenFlash.style.opacity || '0');
      this.screenFlash.style.opacity = String(lerp(current, targetOpacity, 1 - Math.pow(1 - 0.12, realDtSeconds * 60)));
    }
  }

  getTimeScale() {
    if (this.hitStopLeft > 0) return TUNING.HITSTOP_SCALE ?? 0.05;
    return 1;
  }

  getCameraOffset() {
    return this.shakeOffset;
  }

  getZoomMultiplier() {
    const maxPunch = TUNING.CAMERA_ZOOM_PUNCH ?? 0.06;
    return 1 + maxPunch * this.zoomPunch;
  }

  onHit(fx: HitFX) {
    // Time/impact feel
    const dmg = Math.max(0, fx.damage);
    const dmg01 = clamp01(dmg / (TUNING.JUICE_DAMAGE_REFERENCE ?? 25));
    const isBig = !!fx.killed || dmg >= (TUNING.JUICE_BIG_HIT_DAMAGE ?? 25) || !!fx.crit;

    const traumaAdd = (fx.isPlayerTarget ? (TUNING.CAMERA_SHAKE_PLAYER_HIT ?? 0.22) : (TUNING.CAMERA_SHAKE_ENEMY_HIT ?? 0.14)) * (0.5 + 0.7 * dmg01);
    this.trauma = clamp01(this.trauma + traumaAdd + (isBig ? 0.18 : 0));

    if (isBig) {
      this.hitStopLeft = Math.max(this.hitStopLeft, TUNING.HITSTOP_DURATION ?? 0.045);
      this.zoomPunch = Math.min(1, this.zoomPunch + 0.85);
    } else {
      // micro punch for regular hits
      this.zoomPunch = Math.min(1, this.zoomPunch + 0.35);
    }

    // Visual feedback
    this.spawnDamageNumber({
      pos: fx.targetPos,
      amount: fx.damage,
      crit: fx.crit,
      isPlayerTarget: fx.isPlayerTarget,
    });

    this.spawnHitRing(fx.targetPos, fx.isPlayerTarget ? 0xff6677 : 0xffffff);
    this.spawnHitParticles(fx.targetPos, fx.isPlayerTarget ? 0xff6677 : 0xffffff, isBig ? 14 : 8);

    if (fx.isPlayerTarget) {
      // quick flash pulse for player hits
      if (this.screenFlash) {
        this.screenFlash.style.opacity = '0.22';
      }
    }
  }

  onDeath(opts: { pos: THREE.Vector3; isPlayer: boolean }) {
    const color = opts.isPlayer ? 0xff6677 : 0xffffff;
    this.spawnHitRing(opts.pos, color);
    this.spawnHitParticles(opts.pos, color, opts.isPlayer ? 34 : 22);
    this.trauma = clamp01(this.trauma + (opts.isPlayer ? 0.6 : 0.25));
    this.hitStopLeft = Math.max(this.hitStopLeft, opts.isPlayer ? (TUNING.PLAYER_DEATH_HITSTOP ?? 0.08) : (TUNING.ENEMY_DEATH_HITSTOP ?? 0.05));
    this.zoomPunch = Math.min(1, this.zoomPunch + (opts.isPlayer ? 1 : 0.8));
  }

  onHeal(opts: { pos: THREE.Vector3; amount: number }) {
    this.spawnHealNumber(opts.pos, opts.amount);
    this.spawnHitParticles(opts.pos, 0x66ff88, 10);
    this.zoomPunch = Math.min(1, this.zoomPunch + 0.25);
  }

  private spawnDamageNumber(opts: { pos: THREE.Vector3; amount: number; crit?: boolean; isPlayerTarget: boolean }) {
    if (!this.damageLayer || !this.camera || !this.rendererEl) return;

    const el = document.createElement('div');
    el.className = 'damage-number';

    const amountInt = Math.max(0, Math.round(opts.amount));
    el.textContent = opts.crit ? `CRIT ${amountInt}` : String(amountInt);
    if (opts.crit) el.classList.add('crit');
    if (opts.isPlayerTarget) el.classList.add('to-player');

    this.damageLayer.appendChild(el);

    const worldPos = opts.pos.clone();
    worldPos.y += 1.2;

    const vel = new THREE.Vector3(randRange(-0.22, 0.22), randRange(0.9, 1.25), randRange(-0.22, 0.22));

    this.damageNumbers.push({
      el,
      worldPos,
      vel,
      ttl: TUNING.DAMAGE_NUMBER_TTL ?? 0.75,
      age: 0,
      isHeal: false,
    });
  }

  private spawnHealNumber(pos: THREE.Vector3, amount: number) {
    if (!this.damageLayer || !this.camera || !this.rendererEl) return;

    const el = document.createElement('div');
    el.className = 'damage-number heal';
    el.textContent = `+${Math.max(0, Math.round(amount))}`;
    this.damageLayer.appendChild(el);

    const worldPos = pos.clone();
    worldPos.y += 1.4;
    const vel = new THREE.Vector3(randRange(-0.16, 0.16), randRange(1.0, 1.4), randRange(-0.16, 0.16));

    this.damageNumbers.push({
      el,
      worldPos,
      vel,
      ttl: TUNING.DAMAGE_NUMBER_TTL ?? 0.75,
      age: 0,
      isHeal: true,
    });
  }

  private updateDamageNumbers(realDtSeconds: number) {
    if (!this.camera || !this.rendererEl) return;

    const rect = this.rendererEl.getBoundingClientRect();

    for (let i = this.damageNumbers.length - 1; i >= 0; i--) {
      const dn = this.damageNumbers[i];
      dn.age += realDtSeconds;

      // integrate in world space
      const gravity = dn.isHeal ? 0.7 : 1.25;
      dn.vel.y -= gravity * realDtSeconds;
      dn.worldPos.addScaledVector(dn.vel, realDtSeconds);

      // project to screen
      const p = dn.worldPos.clone().project(this.camera);
      const x = rect.left + (p.x * 0.5 + 0.5) * rect.width;
      const y = rect.top + (-p.y * 0.5 + 0.5) * rect.height;

      const t = clamp01(dn.age / dn.ttl);
      const opacity = 1 - t;
      const scale = lerp(1.05, 0.92, t);

      dn.el.style.left = `${x}px`;
      dn.el.style.top = `${y}px`;
      dn.el.style.opacity = String(opacity);
      dn.el.style.transform = `translate(-50%, -50%) scale(${scale})`;

      if (dn.age >= dn.ttl) {
        dn.el.remove();
        this.damageNumbers.splice(i, 1);
      }
    }
  }

  private spawnHitRing(pos: THREE.Vector3, color: number) {
    if (!this.scene) return;

    const geom = new THREE.RingGeometry(0.12, 0.16, 24);
    const mat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.85, side: THREE.DoubleSide });
    const ring = new THREE.Mesh(geom, mat);

    ring.position.copy(pos);
    ring.position.y += 0.06;
    ring.rotation.x = -Math.PI / 2;

    this.scene.add(ring);

    const start = performance.now();
    const dur = TUNING.HIT_RING_DURATION ?? 0.18;

    const tick = () => {
      const t = (performance.now() - start) / 1000;
      const a = clamp01(t / dur);
      const s = 1 + a * 2.8;
      ring.scale.set(s, s, s);
      mat.opacity = Math.max(0, 0.85 * (1 - a));

      if (a >= 1) {
        this.scene?.remove(ring);
        geom.dispose();
        mat.dispose();
        return;
      }
      requestAnimationFrame(tick);
    };

    requestAnimationFrame(tick);
  }

  private getParticleMesh(color: number) {
    const mesh = this.particlePool.pop();
    if (mesh) {
      (mesh.material as THREE.MeshBasicMaterial).color.setHex(color);
      (mesh.material as THREE.MeshBasicMaterial).opacity = 1;
      mesh.visible = true;
      return mesh;
    }

    const mat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 1 });
    return new THREE.Mesh(this.particleGeometry, mat);
  }

  private releaseParticleMesh(mesh: THREE.Mesh) {
    mesh.visible = false;
    this.particlePool.push(mesh);
  }

  private spawnHitParticles(pos: THREE.Vector3, color: number, count: number) {
    if (!this.scene) return;

    const maxParticles = TUNING.HIT_PARTICLE_MAX_ACTIVE ?? 220;
    // drop oldest if over budget
    while (this.particles.length + count > maxParticles && this.particles.length > 0) {
      const p = this.particles.shift();
      if (p) {
        this.scene.remove(p.mesh);
        this.releaseParticleMesh(p.mesh);
      }
    }

    for (let i = 0; i < count; i++) {
      const m = this.getParticleMesh(color);
      m.position.copy(pos);
      m.position.y += randRange(0.25, 1.1);
      m.rotation.set(randRange(0, Math.PI), randRange(0, Math.PI), randRange(0, Math.PI));
      m.scale.setScalar(randRange(0.7, 1.3));

      const vel = new THREE.Vector3(randRange(-1.6, 1.6), randRange(1.4, 3.2), randRange(-1.6, 1.6));
      const rotVel = new THREE.Vector3(randRange(-7, 7), randRange(-7, 7), randRange(-7, 7));

      const ttl = randRange(0.20, 0.42);
      const gravity = randRange(6.5, 10.5);

      this.scene.add(m);
      this.particles.push({ mesh: m, vel, rotVel, ttl, age: 0, gravity });
    }
  }

  private updateParticles(realDtSeconds: number) {
    if (!this.scene) return;

    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.age += realDtSeconds;

      p.vel.y -= p.gravity * realDtSeconds;
      p.mesh.position.addScaledVector(p.vel, realDtSeconds);

      p.mesh.rotation.x += p.rotVel.x * realDtSeconds;
      p.mesh.rotation.y += p.rotVel.y * realDtSeconds;
      p.mesh.rotation.z += p.rotVel.z * realDtSeconds;

      const a = clamp01(p.age / p.ttl);
      (p.mesh.material as THREE.MeshBasicMaterial).opacity = Math.max(0, 1 - a);

      if (p.age >= p.ttl) {
        this.scene.remove(p.mesh);
        this.releaseParticleMesh(p.mesh);
        this.particles.splice(i, 1);
      }
    }
  }
}

export const juice = new JuiceManager();
