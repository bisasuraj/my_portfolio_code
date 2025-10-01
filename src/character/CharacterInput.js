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

    // Keyboard input
    document.addEventListener("keydown", (e) => this._onKeyDown(e), false);
    document.addEventListener("keyup", (e) => this._onKeyUp(e), false);

    // On-screen buttons input - retry until buttons are found
    this._setupButtons();
  }

  _setupButtons() {
    const btnMap = {
      "btn-forward": "forward",
      "btn-backward": "backward",
      "btn-left": "left",
      "btn-right": "right",
    };

    const trySetup = () => {
      let allFound = true;

      Object.keys(btnMap).forEach((id) => {
        const el = document.getElementById(id);
        if (!el) {
          allFound = false;
          return;
        }

        // Press
        ["touchstart", "mousedown"].forEach((evt) =>
          el.addEventListener(evt, (e) => {
            e.preventDefault();
            this._keys[btnMap[id]] = true;
          })
        );

        // Release
        ["touchend", "mouseup", "mouseleave"].forEach((evt) =>
          el.addEventListener(evt, (e) => {
            e.preventDefault();
            this._keys[btnMap[id]] = false;
          })
        );
      });

      if (!allFound) {
        setTimeout(trySetup, 100);
      }
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
