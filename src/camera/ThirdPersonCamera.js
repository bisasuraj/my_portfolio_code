import * as THREE from "three";



// ==========================================
// CAMERA CONTROLLER CLASS
// ==========================================

/**
 * Free orbital camera that rotates around the character
 * Uses pointer lock for mouse control
 * Always active - mouse movement orbits camera around target
 * Preserves initial camera position and angles
 */

export class ThirdPersonCamera {
  constructor(params) {
    this._params = params;
    this._camera = params.camera;

    this._currentPosition = new THREE.Vector3();
    this._currentLookat = new THREE.Vector3();

    // Orbital rotation angles - initialize from current camera position
    this._azimuthAngle = 160;
    this._polarAngle = Math.PI / 3;
    this._distance = 35;

    // Mouse tracking for orbital camera
    this._mouseSensitivity = 0.002;
    this._isPointerLocked = false;

    // Mouse and pointer lock event listeners
    this._onMouseMove = this._onMouseMove.bind(this);
    this._onPointerLockChange = this._onPointerLockChange.bind(this);
    this._onPointerLockError = this._onPointerLockError.bind(this);

    document.addEventListener('mousemove', this._onMouseMove);
    document.addEventListener('pointerlockchange', this._onPointerLockChange);
    document.addEventListener('pointerlockerror', this._onPointerLockError);

    // Initialize camera angles from current position (delayed until character is loaded)
    this._initializeCameraAngles();

    console.log('Free camera initialized. Click empty space to enable camera control.');
  }

  _initializeCameraAngles() {
    // Use manual camera settings instead of calculating from current position
    // This allows you to control the initial camera angle and distance
    console.log('Using manual camera settings:', {
      azimuth: this._azimuthAngle,
      polar: this._polarAngle,
      distance: this._distance
    });

    // All angle calculations are now commented out - use manual values above
    /*
    if (!this._params.target || !this._params.target.Position) {
      console.log('Character not loaded yet, using default angles');
      return;
    }
    const characterPos = this._params.target.Position;
    const offset = this._camera.position.clone().sub(characterPos);
    this._distance = offset.length();

    if (this._distance > 0) {
      this._azimuthAngle = Math.atan2(offset.x, offset.z);
      this._polarAngle = Math.acos(Math.max(-1, Math.min(1, offset.y / this._distance)));
    }
    */
  }

  // Public method to enable pointer lock (called from World.js)
  enablePointerLock() {
    const canvas = this._params.canvas || document.body;
    canvas.requestPointerLock = canvas.requestPointerLock ||
                                  canvas.mozRequestPointerLock ||
                                  canvas.webkitRequestPointerLock;
    if (canvas.requestPointerLock) {
      canvas.requestPointerLock();
      console.log('Free camera enabled - move mouse to orbit around character');
    } else {
      console.error('Pointer lock not supported');
    }
  }

  // Public method to check if pointer lock is active
  isPointerLocked() {
    return this._isPointerLocked;
  }

  _onPointerLockChange() {
    const canvas = this._params.canvas || document.body;
    this._isPointerLocked = document.pointerLockElement === canvas ||
                             document.mozPointerLockElement === canvas ||
                             document.webkitPointerLockElement === canvas;

    if (this._isPointerLocked) {
      console.log('✓ Free camera ACTIVE - Move mouse to orbit. Press ESC to exit.');
    } else {
      console.log('✗ Free camera DISABLED - Click empty space to enable');
    }
  }

  _onPointerLockError() {
    console.error('Pointer lock error');
  }

  _onMouseMove(event) {
    if (!this._isPointerLocked) return;

    // movementX/Y gives us the mouse movement delta directly when pointer is locked
    const deltaX = event.movementX || event.mozMovementX || event.webkitMovementX || 0;
    const deltaY = event.movementY || event.mozMovementY || event.webkitMovementY || 0;

    // Update angles based on mouse movement
    this._azimuthAngle -= deltaX * this._mouseSensitivity;
    this._polarAngle -= deltaY * this._mouseSensitivity;

    // Clamp polar angle to prevent camera from flipping upside down
    // Allow full 360° rotation but prevent going too far up or down
    const minPolarAngle = 0.1; // Nearly straight up
    const maxPolarAngle = Math.PI - 0.1; // Nearly straight down
    this._polarAngle = Math.max(minPolarAngle, Math.min(maxPolarAngle, this._polarAngle));

    // Wrap azimuth angle to keep it in reasonable range
    if (this._azimuthAngle > Math.PI * 2) this._azimuthAngle -= Math.PI * 2;
    if (this._azimuthAngle < -Math.PI * 2) this._azimuthAngle += Math.PI * 2;
  }

  Update(timeElapsed) {
    // Check if character loaded and angles not initialized yet
    if (this._distance === 30 && this._params.target && this._params.target.Position) {
      this._initializeCameraAngles();
    }

    // Always use orbital camera
    const characterPos = this._params.target.Position;
    if (!characterPos) return;

    // Calculate camera position based on spherical coordinates
    const x = this._distance * Math.sin(this._polarAngle) * Math.sin(this._azimuthAngle);
    const y = this._distance * Math.cos(this._polarAngle);
    const z = this._distance * Math.sin(this._polarAngle) * Math.cos(this._azimuthAngle);

    // Apply smooth interpolation for camera movement
    const targetPosition = new THREE.Vector3(
      characterPos.x + x,
      characterPos.y + y,
      characterPos.z + z
    );

    // Look ahead of the character in the direction they're facing
    const lookAheadDistance = 10; // How far ahead to look (adjust this value)
    const lookAtOffset = new THREE.Vector3(0, 5, lookAheadDistance); // (x, y, z) offset
    lookAtOffset.applyQuaternion(this._params.target.Rotation); // Apply character's rotation
    const lookAtTarget = characterPos.clone().add(lookAtOffset);

    // Smooth camera movement
    const t = 1.0 - Math.pow(0.001, timeElapsed);
    this._currentPosition.lerp(targetPosition, t);
    this._currentLookat.lerp(lookAtTarget, t);

    this._camera.position.copy(this._currentPosition);
    this._camera.lookAt(this._currentLookat);
  }

  // Clean up event listeners
  dispose() {
    document.removeEventListener('mousemove', this._onMouseMove);
    document.removeEventListener('pointerlockchange', this._onPointerLockChange);
    document.removeEventListener('pointerlockerror', this._onPointerLockError);

    // Exit pointer lock if active
    if (this._isPointerLocked && document.exitPointerLock) {
      document.exitPointerLock();
    }
  }
}
