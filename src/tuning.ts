import * as THREE from 'three';

export const TUNING = {
    // Scene
    SCENE_BACKGROUND_COLOR: 0x888888,
    
    // Camera
    FRUSTUM_SIZE: 20,
    ISO_OFFSET: new THREE.Vector3(20, 20, 20),
    CAMERA_NEAR: 1,
    CAMERA_FAR: 1000,

    // Lights
    AMBIENT_LIGHT_COLOR: 0xffffff,
    AMBIENT_LIGHT_INTENSITY: 0.6,
    DIRECTIONAL_LIGHT_COLOR: 0xffffff,
    DIRECTIONAL_LIGHT_INTENSITY: 0.8,
    DIRECTIONAL_LIGHT_POSITION: new THREE.Vector3(-10, 20, 10),

    // Ground
    PLANE_SIZE: 50,
    PLANE_COLOR: 0x444444,
    // Tile/grid
    TILE_WORLD_SIZE: 1, // world units per tile

    // Character
    CHARACTER_SIZE: 1,
    CHARACTER_COLOR: 0xaaaaaa,
    CHARACTER_INITIAL_Y: 0.5,
    PLAYER_HEALTH: 100,
    PLAYER_ATTACK_RANGE: 2,
    PLAYER_ATTACK_DAMAGE: 50,
    PLAYER_ATTACK_COOLDOWN: 0.5, // Seconds
    PLAYER_ATTACK_ARC_ANGLE: 90, // degrees
    PLAYER_ATTACK_SEGMENTS: 24,

    // Enemy
    ENEMY_SIZE: 1,
    ENEMY_COLOR: 0xff0000,
    ENEMY_SPEED: 0.05, // Units per second (reduced to make enemies slower)
    ENEMY_INITIAL_POSITION: new THREE.Vector3(5, 0.5, 5),    
    ENEMY_HEALTH: 50,
    ENEMY_ATTACK_RANGE: 1.2,
    ENEMY_ATTACK_DAMAGE: 10,
    ENEMY_ATTACK_COOLDOWN: 1.0, // Seconds
    ENEMY_ATTACK_ARC_ANGLE: 90,
    ENEMY_ATTACK_SEGMENTS: 12,

    // Slime (small, bouncy melee enemy)
    SLIME_SIZE: 0.9,
    SLIME_INITIAL_Y: 0.45,
    SLIME_HEALTH: 24,
    SLIME_SPEED: 0.07,
    SLIME_HOP_SPEED: 0.18,
    SLIME_BOUNCE_HEIGHT: 0.25,
    SLIME_SQUASH_FACTOR: 0.18,
    SLIME_ATTACK_RANGE: 1.0,
    SLIME_ATTACK_DAMAGE: 8,
    SLIME_ATTACK_COOLDOWN: 0.8,

    // Undead (slow, durable lunger with small regeneration)
    UNDEAD_SIZE: 1.0,
    UNDEAD_INITIAL_Y: 1.0,
    UNDEAD_HEALTH: 90,
    UNDEAD_SPEED: 0.03,
    UNDEAD_ATTACK_RANGE: 1.4,
    UNDEAD_ATTACK_WIDTH: 1.2,
    UNDEAD_ATTACK_DAMAGE: 18,
    UNDEAD_ATTACK_COOLDOWN: 1.6,
    UNDEAD_LUNGE_SPEED: 0.45,
    UNDEAD_LUNGE_DURATION: 0.22,
    UNDEAD_REGEN_AMOUNT: 1, // HP per second when idle
    UNDEAD_REGEN_DELAY: 3.0, // seconds after taking damage before regen

    // Visuals
    ATTACK_VISUAL_DURATION: 0.2, // Seconds
    DAMAGE_FLASH_DURATION: 0.1, // Seconds
    DAMAGE_FLASH_COLOR: 0xffffff,

    // Movement
    MOVEMENT_SPEED: 0.10,
    // Rotation smoothing when changing facing direction (per-frame base lerp)
    ROTATION_LERP_FACTOR: 0.2,

    // Jump Animation
    JUMP_SPEED_INCREMENT: 0.15,
    JUMP_BOUNCE_HEIGHT: 0.2, // Height added to base position
    JUMP_SQUASH_FACTOR: 0.1,
    JUMP_LERP_FACTOR: 0.1,
    JUMP_BASE_Y_OFFSET: 0.5, // Center point of the cube

    // SSAO
    SSAO_KERNEL_RADIUS: 5,
    SSAO_MIN_DISTANCE: 0.0001,
    SSAO_MAX_DISTANCE: 0.005,
    // Death animation
    DEATH_FADE_DURATION: 0.3, // seconds to fully fade out
    DEATH_ROTATION_ANGLE_DEGREES: 90,

    // --- Juice / feel ---
    // Hit-stop (time scale) applied briefly on big hits / kills.
    HITSTOP_DURATION: 0.045, // seconds
    HITSTOP_SCALE: 0.05, // 0..1
    ENEMY_DEATH_HITSTOP: 0.05, // seconds
    PLAYER_DEATH_HITSTOP: 0.08, // seconds

    // Camera shake (screen-space feel via camera position offset)
    CAMERA_SHAKE_MAX: 0.45,
    CAMERA_SHAKE_DECAY_PER_SEC: 2.6,
    CAMERA_SHAKE_ENEMY_HIT: 0.14,
    CAMERA_SHAKE_PLAYER_HIT: 0.22,

    // Camera zoom punch (orthographic zoom multiplier)
    CAMERA_ZOOM_PUNCH: 0.06,
    CAMERA_ZOOM_RETURN_PER_SEC: 8,

    // Damage numbers / hit VFX
    DAMAGE_NUMBER_TTL: 0.75, // seconds
    HIT_RING_DURATION: 0.18, // seconds
    HIT_PARTICLE_MAX_ACTIVE: 220,

    // Basic knockback distances (world units)
    HIT_KNOCKBACK: 0.22, // player -> enemies
    PLAYER_HIT_KNOCKBACK: 0.14, // enemies -> player

    // Damage thresholds used to scale feedback
    JUICE_DAMAGE_REFERENCE: 25,
    JUICE_BIG_HIT_DAMAGE: 25,

    // Player survivability feel
    PLAYER_IFRAMES: 0.25, // seconds of invulnerability after taking damage
    PLAYER_ON_KILL_HEAL: 6, // heal per kill (small, helps the "flow")

    // Player crits (mostly a feel/feedback mechanic)
    PLAYER_CRIT_CHANCE: 0.12,
    PLAYER_CRIT_MULT: 1.6,

    // Audio (SFX)
    // Note: browsers require a user gesture (click/tap/keydown) before audio can start.
    SFX_VOLUME: 0.25, // master SFX gain (0..1)
    SFX_ATTACK_VOLUME: 0.16,
    SFX_HIT_VOLUME: 0.22,
    SFX_DEATH_VOLUME: 0.28,
    SFX_UI_VOLUME: 0.18,

    // SFX bus processing (for extra "juice")
    SFX_DRIVE: 0.15, // 0..~0.5 (soft clip amount)
    SFX_COMP_THRESHOLD: -18,
    SFX_COMP_KNEE: 24,
    SFX_COMP_RATIO: 6,
    SFX_COMP_ATTACK: 0.003,
    SFX_COMP_RELEASE: 0.12,
    SFX_TONE_LP_HZ: 12000,
};

