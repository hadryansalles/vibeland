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

    // Character
    CHARACTER_SIZE: 1,
    CHARACTER_COLOR: 0xaaaaaa,
    CHARACTER_INITIAL_Y: 0.5,
    
    // Movement
    MOVEMENT_SPEED: 0.10,

    // Jump Animation
    JUMP_SPEED_INCREMENT: 0.08,
    JUMP_BOUNCE_HEIGHT: 1.0, // Height added to base position
    JUMP_SQUASH_FACTOR: 0.25,
    JUMP_LERP_FACTOR: 0.1,
    JUMP_BASE_Y_OFFSET: 0.5, // Center point of the cube

    // SSAO
    SSAO_KERNEL_RADIUS: 5,
    SSAO_MIN_DISTANCE: 0.0001,
    SSAO_MAX_DISTANCE: 0.005,
};

