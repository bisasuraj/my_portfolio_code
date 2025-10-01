
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

    document.addEventListener("keydown", (e) => this._onKeyDown(e), false);
    document.addEventListener("keyup", (e) => this._onKeyUp(e), false);
  }

  _onKeyDown(event) {
    switch (event.keyCode) {
      case 87: case 38: // W or Up Arrow
        this._keys.forward = true;
        break;
      case 65: case 37: // A or Left Arrow
        this._keys.left = true;
        break;
      case 83: case 40: // S or Down Arrow
        this._keys.backward = true;
        break;
      case 68: case 39: // D or Right Arrow
        this._keys.right = true;
        break;
      case 32: // Space bar
        this._keys.space = true;
        break;
      case 16: // Shift
        this._keys.shift = true;
        break;
    }
  }

  _onKeyUp(event) {
    switch (event.keyCode) {
      case 87: case 38:
        this._keys.forward = false;
        break;
      case 65: case 37:
        this._keys.left = false;
        break;
      case 83: case 40:
        this._keys.backward = false;
        break;
      case 68: case 39:
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