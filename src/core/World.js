import * as THREE from "three";
import { CharacterController } from '../character/CharacterController.js';
import { ThirdPersonCamera } from '../camera/ThirdPersonCamera.js';
import { SceneSetup } from '../scene/SceneSetup.js';
import { TextElements } from '../scene/TextElements.js';

export class World {
  constructor() {
    this._Initialize();
  }

  _Initialize() {
    // Use SceneSetup for clean initialization
    this._threejs = SceneSetup.createRenderer();
    this._camera = SceneSetup.createCamera();
    this._scene = SceneSetup.createScene();

    // Set up mouse interaction
    this._setupMouseInteraction();

    // Create ground
    SceneSetup.createGround(this._scene);

    // Initialize arrays for animations and timing
    this._mixers = [];
    this._previousRAF = null;

    // Load character and environment
    this._LoadAnimatedModel();
    TextElements.loadAndCreateText(this._scene);

    // Handle window resizing
    window.addEventListener("resize", () => this._OnWindowResize(), false);

    // Handle mobile viewport changes (address bar show/hide)
    window.visualViewport?.addEventListener("resize", () => this._OnWindowResize(), false);

    // Start the animation loop
    this._RAF();
  }

  _setupMouseInteraction() {
    this._raycaster = new THREE.Raycaster();
    this._mouse = { x: undefined, y: undefined };
    this._hoveredObject = null;

    addEventListener("mousemove", (event) => {
      this._mouse.x = (event.clientX / innerWidth) * 2 - 1;
      this._mouse.y = -(event.clientY / innerHeight) * 2 + 1;
      this._checkHover();
    });

    addEventListener("click", (event) => {
      this._handleClick();
    });

    // Add touch support for mobile
    addEventListener("touchstart", (event) => {
      if (event.touches.length === 1) {
        const touch = event.touches[0];
        this._mouse.x = (touch.clientX / innerWidth) * 2 - 1;
        this._mouse.y = -(touch.clientY / innerHeight) * 2 + 1;
        this._handleClick();
      }
    });
  }

  _checkHover() {
    if (!this._camera || this._mouse.x === undefined) return;

    this._raycaster.setFromCamera(this._mouse, this._camera);
    const interactables = TextElements.getInteractableObjects();

    if (interactables.length === 0) return;

    const intersects = this._raycaster.intersectObjects(interactables, true);

    if (intersects.length > 0) {
      // Find the parent group
      let object = intersects[0].object;
      while (object.parent && !object.userData.isLinkedInIcon) {
        object = object.parent;
      }

      if (object.userData.isLinkedInIcon && this._hoveredObject !== object) {
        // Hover on
        document.body.style.cursor = "pointer";
        if (object.userData.glowMaterial) {
          object.userData.glowMaterial.opacity = 0.7;
        }
        this._hoveredObject = object;
      }
    } else {
      // Hover off
      if (this._hoveredObject) {
        document.body.style.cursor = "default";
        if (this._hoveredObject.userData.glowMaterial) {
          this._hoveredObject.userData.glowMaterial.opacity = 0;
        }
        this._hoveredObject = null;
      }
    }
  }

  _handleClick() {
    if (!this._camera || this._mouse.x === undefined) return;

    this._raycaster.setFromCamera(this._mouse, this._camera);
    const interactables = TextElements.getInteractableObjects();

    if (interactables.length === 0) return;

    const intersects = this._raycaster.intersectObjects(interactables, true);

    if (intersects.length > 0) {
      let object = intersects[0].object;
      while (object.parent && !object.userData.isLinkedInIcon) {
        object = object.parent;
      }

      if (object.userData.isLinkedInIcon && object.userData.url) {
        window.open(object.userData.url, "_blank");
      }
    }
  }

  _LoadAnimatedModel() {
    const params = {
      camera: this._camera,
      scene: this._scene,
    };
    
    this._controls = new CharacterController(params);
    
    this._thirdPersonCamera = new ThirdPersonCamera({
      camera: this._camera,
      target: this._controls,
    });
  }

  _OnWindowResize() {
    this._camera.aspect = window.innerWidth / window.innerHeight;
    this._camera.updateProjectionMatrix();
    this._threejs.setSize(window.innerWidth, window.innerHeight);
  }

  _RAF() {
    window.requestAnimationFrame((currentTime) => {
      if (this._previousRAF === null) {
        this._previousRAF = currentTime;
      }

      this._RAF();

      this._threejs.render(this._scene, this._camera);
      this._Step(currentTime - this._previousRAF);
      this._previousRAF = currentTime;
    });
  }

  _Step(timeElapsed) {
    const timeElapsedS = timeElapsed * 0.001;

    if (this._mixers) {
      this._mixers.forEach((mixer) => mixer.update(timeElapsedS));
    }

    if (this._controls) {
      this._controls.Update(timeElapsedS);
    }

    if (this._thirdPersonCamera) {
      this._thirdPersonCamera.Update(timeElapsedS);
    }
  }
}