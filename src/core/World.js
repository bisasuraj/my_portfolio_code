import * as THREE from "three";
import { CharacterController } from '../character/CharacterController.js';
import { ThirdPersonCamera } from '../camera/ThirdPersonCamera.js';
import { SceneSetup } from '../scene/SceneSetup.js';
import { TextElements } from '../scene/TextElements.js';
import { PhysicsWorld } from '../physics/PhysicsWorld.js';

export class World {
  constructor() {
    this._Initialize();
  }

  _Initialize() {
    // Use SceneSetup for clean initialization
    this._threejs = SceneSetup.createRenderer();
    this._camera = SceneSetup.createCamera();
    this._scene = SceneSetup.createScene();

    // Initialize physics world
    this._physics = new PhysicsWorld();

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

    // Add physics boxes in front of character
    this._addPhysicsBoxes();

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
    this._draggedBody = null;
    this._dragPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
    this._dragPoint = new THREE.Vector3();

    addEventListener("mousemove", (event) => {
      this._mouse.x = (event.clientX / innerWidth) * 2 - 1;
      this._mouse.y = -(event.clientY / innerHeight) * 2 + 1;
      this._checkHover();
      this._handleDrag(event);
    });

    addEventListener("mousedown", (event) => {
      this._startDrag();
    });

    addEventListener("mouseup", (event) => {
      this._endDrag();
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
        this._startDrag();
      }
    });

    addEventListener("touchmove", (event) => {
      if (event.touches.length === 1) {
        const touch = event.touches[0];
        this._mouse.x = (touch.clientX / innerWidth) * 2 - 1;
        this._mouse.y = -(touch.clientY / innerHeight) * 2 + 1;
        this._handleDrag(event);
      }
    });

    addEventListener("touchend", (event) => {
      this._endDrag();
    });
  }

  _checkHover() {
    if (!this._camera || this._mouse.x === undefined) return;

    this._raycaster.setFromCamera(this._mouse, this._camera);

    // Check for LinkedIn icon first
    const textInteractables = TextElements.getInteractableObjects();
    const textIntersects = this._raycaster.intersectObjects(textInteractables, true);

    if (textIntersects.length > 0) {
      let object = textIntersects[0].object;
      while (object.parent && !object.userData.isLinkedInIcon) {
        object = object.parent;
      }

      if (object.userData.isLinkedInIcon && this._hoveredObject !== object) {
        document.body.style.cursor = "pointer";
        if (object.userData.glowMaterial) {
          object.userData.glowMaterial.opacity = 0.7;
        }
        this._hoveredObject = object;
      }
      return;
    }

    // Check for physics objects
    const physicsObjects = this._physics.getInteractableObjects();
    const physicsIntersects = this._raycaster.intersectObjects(physicsObjects, false);

    if (physicsIntersects.length > 0) {
      document.body.style.cursor = "grab";
      this._hoveredObject = physicsIntersects[0].object;
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

  _startDrag() {
    if (!this._camera || this._mouse.x === undefined) return;

    this._raycaster.setFromCamera(this._mouse, this._camera);
    const physicsObjects = this._physics.getInteractableObjects();
    console.log("Checking drag on", physicsObjects.length, "objects");
    const intersects = this._raycaster.intersectObjects(physicsObjects, false);
    console.log("Intersects:", intersects.length);

    if (intersects.length > 0) {
      const mesh = intersects[0].object;
      this._draggedBody = this._physics.getBodyFromMesh(mesh);
      console.log("Dragging body:", this._draggedBody);

      if (this._draggedBody) {
        document.body.style.cursor = "grabbing";
        // Set drag plane at the object's height
        this._dragPlane.constant = -intersects[0].point.y;
        this._dragPoint.copy(intersects[0].point);
        console.log("Drag started at:", this._dragPoint);
      }
    }
  }

  _handleDrag(event) {
    if (!this._draggedBody || !this._camera) return;

    this._raycaster.setFromCamera(this._mouse, this._camera);
    const newPoint = new THREE.Vector3();

    if (this._raycaster.ray.intersectPlane(this._dragPlane, newPoint)) {
      // Calculate force direction without modifying newPoint
      const forceDir = new THREE.Vector3().subVectors(newPoint, this._dragPoint);
      const force = forceDir.multiplyScalar(300);

      this._physics.applyForceToBody(this._draggedBody, force);
      this._dragPoint.copy(newPoint);
    }
  }

  _endDrag() {
    if (this._draggedBody) {
      this._draggedBody = null;
      document.body.style.cursor = "default";
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

    // Add character physics collider after character is loaded
    // We'll check if character is ready in the update loop
    this._characterBody = null;
  }

  _addPhysicsBoxes() {
    // Add a box in front of where the character starts (0, 0, 0)
    // Position it a bit in front and to the side
    const boxPosition = new THREE.Vector3(15, 20, 15);
    const boxSize = new THREE.Vector3(10, 10, 10);

    const boxData = this._physics.addBox(
      boxPosition,
      boxSize,
      35,
      this._scene,
      "DON'T\nDRAG\nME"
    );

    const boxPosition2 = new THREE.Vector3(-45, 50, 15);
    const boxSize2 = new THREE.Vector3(8, 8, 8);
    
    const boxData2 = this._physics.addBox(
      boxPosition2,
      boxSize2,
      35,
      this._scene,
      "Hi again :)"
    );

    console.log("Physics boxes added:", boxData);
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

      // Create character physics body once character is loaded
      if (!this._characterBody && this._controls._target) {
        this._characterBody = this._physics.addCharacterCollider(this._controls);
        console.log("Character physics body created:", this._characterBody);
      }

      // Sync character physics body with character position
      if (this._characterBody) {
        this._physics.syncCharacterBody(this._characterBody, this._controls);
      }
    }

    if (this._thirdPersonCamera) {
      this._thirdPersonCamera.Update(timeElapsedS);
    }

    // Update physics simulation
    if (this._physics) {
      this._physics.update(timeElapsedS);
    }
  }
}