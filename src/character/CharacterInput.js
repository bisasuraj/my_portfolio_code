// ==========================================
// INPUT HANDLER CLASS
// ==========================================

/**
 * Handles keyboard input for character movement
 * Tracks which keys are currently pressed
 */
export class CharacterInput {
  constructor() {
    this._Init();
  }

  _Init() {
    this._keys = {
      forward: false,
      backward: false,
      left: false,
      right: false,
      space: false,
      shift: false,
    };

    // Joystick state
    this._joystickActive = false;
    this._joystickVector = { x: 0, y: 0 };

    // Keyboard input
    document.addEventListener("keydown", (e) => this._onKeyDown(e), false);
    document.addEventListener("keyup", (e) => this._onKeyUp(e), false);

    // Setup virtual joystick
    this._setupJoystick();
  }

  _setupJoystick() {
    const trySetup = () => {
      const container = document.getElementById("joystick-container");
      const stick = document.getElementById("joystick-stick");
      const base = document.getElementById("joystick-base");

      if (!container || !stick || !base) {
        setTimeout(trySetup, 100);
        return;
      }

      const maxDistance = 45; // Maximum distance the stick can move from center
      let isDragging = false;
      let startX = 0;
      let startY = 0;

      const updateJoystick = (clientX, clientY) => {
        const rect = base.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;

        let deltaX = clientX - centerX;
        let deltaY = clientY - centerY;

        // Calculate distance from center
        const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

        // Limit the stick movement to maxDistance
        if (distance > maxDistance) {
          const angle = Math.atan2(deltaY, deltaX);
          deltaX = Math.cos(angle) * maxDistance;
          deltaY = Math.sin(angle) * maxDistance;
        }

        // Update stick position
        stick.style.transform = `translate(calc(-50% + ${deltaX}px), calc(-50% + ${deltaY}px))`;

        // Normalize the vector (-1 to 1)
        this._joystickVector.x = deltaX / maxDistance;
        this._joystickVector.y = deltaY / maxDistance;

        // Update movement keys based on joystick position
        const threshold = 0.3;
        this._keys.forward = this._joystickVector.y < -threshold;
        this._keys.backward = this._joystickVector.y > threshold;
        this._keys.left = this._joystickVector.x < -threshold;
        this._keys.right = this._joystickVector.x > threshold;
      };

      const resetJoystick = () => {
        stick.style.transform = "translate(-50%, -50%)";
        stick.classList.remove("active");
        this._joystickVector.x = 0;
        this._joystickVector.y = 0;
        this._joystickActive = false;

        // Reset all movement keys
        this._keys.forward = false;
        this._keys.backward = false;
        this._keys.left = false;
        this._keys.right = false;
      };

      const onStart = (e) => {
        e.preventDefault();
        isDragging = true;
        this._joystickActive = true;
        stick.classList.add("active");

        const touch = e.touches ? e.touches[0] : e;
        updateJoystick(touch.clientX, touch.clientY);
      };

      const onMove = (e) => {
        if (!isDragging) return;
        e.preventDefault();

        const touch = e.touches ? e.touches[0] : e;
        updateJoystick(touch.clientX, touch.clientY);
      };

      const onEnd = (e) => {
        if (!isDragging) return;
        e.preventDefault();
        isDragging = false;
        resetJoystick();
      };

      // Touch events
      base.addEventListener("touchstart", onStart, { passive: false });
      stick.addEventListener("touchstart", onStart, { passive: false });
      document.addEventListener("touchmove", onMove, { passive: false });
      document.addEventListener("touchend", onEnd, { passive: false });

      // Mouse events (for testing on desktop)
      base.addEventListener("mousedown", onStart);
      stick.addEventListener("mousedown", onStart);
      document.addEventListener("mousemove", onMove);
      document.addEventListener("mouseup", onEnd);
    };

    trySetup();
  }

  _onKeyDown(event) {
    switch (event.keyCode) {
      case 87:
      case 38:
        this._keys.forward = true;
        break;
      case 65:
      case 37:
        this._keys.left = true;
        break;
      case 83:
      case 40:
        this._keys.backward = true;
        break;
      case 68:
      case 39:
        this._keys.right = true;
        break;
      case 32:
        this._keys.space = true;
        break;
      case 16:
        this._keys.shift = true;
        break;
    }
  }

  _onKeyUp(event) {
    switch (event.keyCode) {
      case 87:
      case 38:
        this._keys.forward = false;
        break;
      case 65:
      case 37:
        this._keys.left = false;
        break;
      case 83:
      case 40:
        this._keys.backward = false;
        break;
      case 68:
      case 39:
        this._keys.right = false;
        break;
      case 32:
        this._keys.space = false;
        break;
      case 16:
        this._keys.shift = false;
        break;
    }
  }
}
