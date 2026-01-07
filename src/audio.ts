import { TUNING } from './tuning';

type SoundId =
  | 'player_attack'
  | 'enemy_attack'
  | 'slime_attack'
  | 'undead_attack'
  | 'hit'
  | 'player_hit'
  | 'death'
  | 'player_death'
  | 'respawn'
  | 'ui_click';

type OscType = OscillatorType;

function clamp01(v: number) {
  return Math.max(0, Math.min(1, v));
}

function randRange(min: number, max: number) {
  return min + Math.random() * (max - min);
}

function randSign() {
  return Math.random() < 0.5 ? -1 : 1;
}

function nowMs() {
  return (typeof performance !== 'undefined' ? performance.now() : Date.now());
}

class GameAudio {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private sfx: GainNode | null = null;
  private drive: WaveShaperNode | null = null;
  private compressor: DynamicsCompressorNode | null = null;
  private tone: BiquadFilterNode | null = null;
  private noise: AudioBuffer | null = null;

  private enabled: boolean = true;
  private unlocked: boolean = false;

  private lastPlayedAtMs = new Map<SoundId, number>();

  private readonly storageEnabledKey = 'vibeland_sfx_enabled';
  private readonly storageVolumeKey = 'vibeland_sfx_volume';

  initFromStorage() {
    try {
      const enabledRaw = localStorage.getItem(this.storageEnabledKey);
      const volRaw = localStorage.getItem(this.storageVolumeKey);

      if (enabledRaw !== null) this.enabled = enabledRaw === 'true';
      if (volRaw !== null) {
        const v = Number(volRaw);
        if (Number.isFinite(v)) this.setVolume(v);
      } else {
        this.setVolume(TUNING.SFX_VOLUME ?? 0.25);
      }

      this.applyGains();
    } catch {
      // ignore
    }
  }

  setEnabled(enabled: boolean) {
    this.enabled = enabled;
    try {
      localStorage.setItem(this.storageEnabledKey, String(enabled));
    } catch {
      // ignore
    }
    this.applyGains();
  }

  getEnabled() {
    return this.enabled;
  }

  setVolume(volume01: number) {
    const v = clamp01(volume01);
    try {
      localStorage.setItem(this.storageVolumeKey, String(v));
    } catch {
      // ignore
    }

    // If we already have nodes, apply immediately.
    if (this.sfx) this.sfx.gain.value = v;
  }

  getVolume() {
    return this.sfx?.gain.value ?? (TUNING.SFX_VOLUME ?? 0.25);
  }

  /**
   * Must be called from a user gesture (pointerdown/keydown/touchstart) to satisfy browser autoplay rules.
   */
  async unlock() {
    this.ensureGraph();
    if (!this.ctx) return;

    try {
      if (this.ctx.state !== 'running') await this.ctx.resume();
      this.unlocked = this.ctx.state === 'running';
    } catch {
      // ignore
    }
  }

  /**
   * Convenience: install one-time unlock handlers on a target (canvas/window/etc).
   */
  installUnlockHandlers(target: EventTarget) {
    const handler = () => {
      // Fire and forget.
      void this.unlock();
      target.removeEventListener('pointerdown', handler as any);
      target.removeEventListener('keydown', handler as any);
      target.removeEventListener('touchstart', handler as any);
    };

    target.addEventListener('pointerdown', handler as any, { once: true } as any);
    target.addEventListener('keydown', handler as any, { once: true } as any);
    target.addEventListener('touchstart', handler as any, { once: true } as any);
  }

  private applyGains() {
    // If not created yet, nothing to apply.
    if (!this.master || !this.sfx) return;
    this.master.gain.value = this.enabled ? 1 : 0;
  }

  private ensureGraph() {
    if (this.ctx && this.master && this.sfx) return;

    const AudioContextCtor = (window.AudioContext || (window as any).webkitAudioContext) as typeof AudioContext | undefined;
    if (!AudioContextCtor) return;

    this.ctx = new AudioContextCtor();

    this.master = this.ctx.createGain();
    this.sfx = this.ctx.createGain();

    // Sweeteners: gentle soft-clipping + glue compression, plus a final tone shaper.
    // This makes the simple synth/noise effects feel more "gamey" and punchy.
    this.drive = this.ctx.createWaveShaper();
    this.drive.oversample = '4x';
    this.drive.curve = this.makeDistortionCurve(TUNING.SFX_DRIVE ?? 0.15);

    this.compressor = this.ctx.createDynamicsCompressor();
    this.compressor.threshold.value = TUNING.SFX_COMP_THRESHOLD ?? -18;
    this.compressor.knee.value = TUNING.SFX_COMP_KNEE ?? 24;
    this.compressor.ratio.value = TUNING.SFX_COMP_RATIO ?? 6;
    this.compressor.attack.value = TUNING.SFX_COMP_ATTACK ?? 0.003;
    this.compressor.release.value = TUNING.SFX_COMP_RELEASE ?? 0.12;

    this.tone = this.ctx.createBiquadFilter();
    this.tone.type = 'lowpass';
    this.tone.frequency.value = TUNING.SFX_TONE_LP_HZ ?? 12000;
    this.tone.Q.value = 0.707;

    this.master.gain.value = this.enabled ? 1 : 0;
    this.sfx.gain.value = clamp01(TUNING.SFX_VOLUME ?? 0.25);

    // Routing: SFX bus -> drive -> compressor -> tone -> master -> output
    this.sfx.connect(this.drive);
    this.drive.connect(this.compressor);
    this.compressor.connect(this.tone);
    this.tone.connect(this.master);
    this.master.connect(this.ctx.destination);

    this.noise = this.createNoiseBuffer(this.ctx);
  }

  private makeDistortionCurve(amount: number) {
    // Common waveshaper curve; small values add harmonics without going full fuzz.
    const k = Math.max(0, amount) * 50;
    const n = 2048;
    const curve = new Float32Array(n);
    const deg = Math.PI / 180;
    for (let i = 0; i < n; i++) {
      const x = (i * 2) / (n - 1) - 1;
      curve[i] = ((3 + k) * x * 20 * deg) / (Math.PI + k * Math.abs(x));
    }
    return curve;
  }

  private makePanner(pan: number) {
    if (!this.ctx) return null;
    const ctx = this.ctx;
    // Prefer StereoPanner when available.
    const anyCtx = ctx as any;
    if (typeof anyCtx.createStereoPanner === 'function') {
      const p = anyCtx.createStereoPanner() as StereoPannerNode;
      p.pan.setValueAtTime(Math.max(-1, Math.min(1, pan)), ctx.currentTime);
      return p as AudioNode;
    }

    // Fallback: PannerNode (2D-ish).
    const p = ctx.createPanner();
    p.panningModel = 'equalpower';
    p.distanceModel = 'linear';
    p.refDistance = 1;
    p.maxDistance = 1000;
    p.rolloffFactor = 0;
    p.positionX.setValueAtTime(pan, ctx.currentTime);
    p.positionY.setValueAtTime(0, ctx.currentTime);
    p.positionZ.setValueAtTime(1, ctx.currentTime);
    return p;
  }

  private shouldPlay(id: SoundId, cooldownMs: number) {
    if (cooldownMs <= 0) return true;
    const t = nowMs();
    const last = this.lastPlayedAtMs.get(id) ?? -Infinity;
    if (t - last < cooldownMs) return false;
    this.lastPlayedAtMs.set(id, t);
    return true;
  }

  private createNoiseBuffer(ctx: AudioContext) {
    const seconds = 1;
    const length = Math.max(1, Math.floor(ctx.sampleRate * seconds));
    const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < length; i++) {
      // white noise
      data[i] = Math.random() * 2 - 1;
    }
    return buffer;
  }

  private playOsc(opts: {
    type: OscType;
    freq: number;
    freqEnd?: number;
    duration: number;
    volume: number;
    detune?: number;
    pan?: number;
    // If true, adds a very short transient to make the hit feel more immediate.
    transient?: boolean;
  }) {
    if (!this.enabled) return;
    this.ensureGraph();
    if (!this.ctx || !this.sfx) return;
    if (!this.unlocked && this.ctx.state !== 'running') return;

    const t0 = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    const pan = opts.pan ?? 0;
    const panner = this.makePanner(pan);

    osc.type = opts.type;
    // Small random pitch wobble keeps repeated SFX from sounding robotic.
    const f0 = Math.max(1, opts.freq * randRange(0.985, 1.015));
    osc.frequency.setValueAtTime(f0, t0);
    if (opts.freqEnd !== undefined) {
      osc.frequency.exponentialRampToValueAtTime(Math.max(1, opts.freqEnd * randRange(0.99, 1.01)), t0 + opts.duration);
    }
    if (opts.detune) osc.detune.setValueAtTime(opts.detune + randSign() * randRange(0, 6), t0);

    // Quick attack + exponential release
    gain.gain.setValueAtTime(0.0001, t0);
    const vol = Math.max(0.0001, opts.volume) * randRange(0.92, 1.08);
    gain.gain.exponentialRampToValueAtTime(vol, t0 + 0.004);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + Math.max(0.02, opts.duration));

    osc.connect(gain);
    if (panner) {
      gain.connect(panner);
      panner.connect(this.sfx);
    } else {
      gain.connect(this.sfx);
    }

    // Optional transient: tiny click/pop (super short burst) to add punch.
    if (opts.transient) {
      this.playNoise({ duration: 0.015, volume: vol * 0.35, highpassHz: 1200, lowpassHz: 8000, pan });
    }

    osc.start(t0);
    osc.stop(t0 + opts.duration + 0.02);
  }

  private playNoise(opts: {
    duration: number;
    volume: number;
    lowpassHz?: number;
    highpassHz?: number;
    pan?: number;
  }) {
    if (!this.enabled) return;
    this.ensureGraph();
    if (!this.ctx || !this.sfx || !this.noise) return;
    if (!this.unlocked && this.ctx.state !== 'running') return;

    const t0 = this.ctx.currentTime;

    const src = this.ctx.createBufferSource();
    src.buffer = this.noise;

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.0001, t0);
    const vol = Math.max(0.0001, opts.volume) * randRange(0.9, 1.1);
    gain.gain.exponentialRampToValueAtTime(vol, t0 + 0.004);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + Math.max(0.02, opts.duration));

    const pan = opts.pan ?? 0;
    const panner = this.makePanner(pan);

    let node: AudioNode = src;

    if (opts.highpassHz) {
      const hp = this.ctx.createBiquadFilter();
      hp.type = 'highpass';
      hp.frequency.setValueAtTime(opts.highpassHz, t0);
      node.connect(hp);
      node = hp;
    }

    if (opts.lowpassHz) {
      const lp = this.ctx.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.setValueAtTime(opts.lowpassHz, t0);
      node.connect(lp);
      node = lp;
    }

    node.connect(gain);
    if (panner) {
      gain.connect(panner);
      panner.connect(this.sfx);
    } else {
      gain.connect(this.sfx);
    }

    src.start(t0);
    src.stop(t0 + opts.duration + 0.02);
  }

  // ----- Public SFX helpers -----

  playPlayerAttack() {
    if (!this.shouldPlay('player_attack', 40)) return;
    const v = (TUNING.SFX_ATTACK_VOLUME ?? 0.16);
    const pan = randRange(-0.25, 0.25);

    // Juicy melee: airy whoosh + bright snap + tiny sub thump.
    this.playNoise({ duration: 0.075, volume: v * 1.05, highpassHz: 420, lowpassHz: 4200, pan });
    this.playOsc({ type: 'triangle', freq: 520, freqEnd: 220, duration: 0.07, volume: v * 0.42, pan, transient: true });
    this.playOsc({ type: 'sine', freq: 120, freqEnd: 70, duration: 0.06, volume: v * 0.14, pan: pan * 0.3 });
  }

  playEnemyAttack(kind: 'enemy' | 'slime' | 'undead' = 'enemy') {
    const id: SoundId = kind === 'slime' ? 'slime_attack' : kind === 'undead' ? 'undead_attack' : 'enemy_attack';
    if (!this.shouldPlay(id, 60)) return;

    const base = (TUNING.SFX_ATTACK_VOLUME ?? 0.16);
    const v = kind === 'undead' ? base * 0.95 : kind === 'slime' ? base * 0.75 : base * 0.85;
    const f0 = kind === 'undead' ? 180 : kind === 'slime' ? 260 : 220;
    const f1 = kind === 'undead' ? 120 : kind === 'slime' ? 170 : 140;

    const pan = randRange(-0.35, 0.35);

    // "Bite" tone + noisy impact.
    this.playOsc({ type: 'square', freq: f0, freqEnd: f1, duration: 0.08, volume: v * 0.28, pan, transient: true });
    this.playNoise({ duration: 0.055, volume: v * 0.85, highpassHz: 180, lowpassHz: kind === 'slime' ? 2400 : 1800, pan });

    // Undead: extra low growl.
    if (kind === 'undead') {
      this.playOsc({ type: 'sawtooth', freq: 95, freqEnd: 65, duration: 0.11, volume: v * 0.12, pan: pan * 0.25 });
    }
  }

  playHit(opts: { isPlayer?: boolean; damage?: number; hp01?: number } = {}) {
    const id: SoundId = opts.isPlayer ? 'player_hit' : 'hit';
    if (!this.shouldPlay(id, 25)) return;

    const base = (TUNING.SFX_HIT_VOLUME ?? 0.22);
    const dmg = Math.max(0, opts.damage ?? 10);
    const dmgScale = clamp01(dmg / 25);
    const lowHp = opts.hp01 !== undefined ? clamp01(1 - opts.hp01) : 0;
    const v = base * (0.65 + 0.6 * dmgScale + 0.25 * lowHp);

    const pan = randRange(-0.45, 0.45);

    if (opts.isPlayer) {
      // Thuddy hit with grit + a little crack.
      this.playOsc({ type: 'sine', freq: 150, freqEnd: 70, duration: 0.11, volume: v * 0.42, pan: pan * 0.25 });
      this.playNoise({ duration: 0.075, volume: v * 0.85, lowpassHz: 1400, highpassHz: 70, pan });
      this.playOsc({ type: 'triangle', freq: 540, freqEnd: 220, duration: 0.035, volume: v * 0.12, pan, transient: true });
    } else {
      // Sharper impact: click + mid smack + airy noise.
      this.playOsc({ type: 'triangle', freq: 680, freqEnd: 260, duration: 0.055, volume: v * 0.28, pan, transient: true });
      this.playNoise({ duration: 0.045, volume: v * 0.95, highpassHz: 520, lowpassHz: 5200, pan });
      // tiny body thump
      this.playOsc({ type: 'sine', freq: 120, freqEnd: 85, duration: 0.06, volume: v * 0.12, pan: pan * 0.2 });
    }
  }

  playDeath(isPlayer: boolean) {
    const id: SoundId = isPlayer ? 'player_death' : 'death';
    if (!this.shouldPlay(id, 120)) return;

    const base = (TUNING.SFX_DEATH_VOLUME ?? 0.28);

    const pan = randRange(-0.25, 0.25);

    if (isPlayer) {
      // longer fall + rumble
      this.playOsc({ type: 'sawtooth', freq: 260, freqEnd: 62, duration: 0.42, volume: base * 0.26, pan: pan * 0.3 });
      this.playNoise({ duration: 0.30, volume: base * 0.62, lowpassHz: 1000, highpassHz: 35, pan });
      // "life leaving" sparkle at the start (very subtle)
      this.playOsc({ type: 'triangle', freq: 860, freqEnd: 520, duration: 0.12, volume: base * 0.06, pan, transient: true });
    } else {
      this.playOsc({ type: 'square', freq: 205, freqEnd: 85, duration: 0.26, volume: base * 0.20, pan: pan * 0.35 });
      this.playNoise({ duration: 0.18, volume: base * 0.52, lowpassHz: 1800, highpassHz: 85, pan });
      this.playOsc({ type: 'sine', freq: 110, freqEnd: 70, duration: 0.14, volume: base * 0.08, pan: pan * 0.25 });
    }
  }

  playRespawn() {
    if (!this.shouldPlay('respawn', 200)) return;
    const v = (TUNING.SFX_UI_VOLUME ?? 0.18) * 0.9;
    const pan = randRange(-0.15, 0.15);
    this.playOsc({ type: 'sine', freq: 460, freqEnd: 920, duration: 0.20, volume: v * 0.52, pan, transient: true });
    this.playOsc({ type: 'triangle', freq: 690, freqEnd: 1040, duration: 0.16, volume: v * 0.30, detune: -8, pan: pan * 0.7 });
  }

  playUIClick() {
    if (!this.shouldPlay('ui_click', 40)) return;
    const v = (TUNING.SFX_UI_VOLUME ?? 0.18);
    const pan = randRange(-0.1, 0.1);
    this.playOsc({ type: 'square', freq: 980, freqEnd: 760, duration: 0.028, volume: v * 0.28, pan, transient: true });
    this.playOsc({ type: 'triangle', freq: 1200, freqEnd: 980, duration: 0.02, volume: v * 0.10, pan: pan * 0.8 });
  }
}

export const audio = new GameAudio();
