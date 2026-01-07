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
};

