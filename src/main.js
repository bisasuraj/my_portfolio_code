// ==========================================
// 3D CHARACTER CONTROLLER WITH THREE.JS
// ==========================================

// Import required Three.js modules
import * as THREE from "three";
import { FBXLoader } from "three/examples/jsm/loaders/FBXLoader.js";
import { TextGeometry } from "three/examples/jsm/geometries/TextGeometry";
import { FontLoader } from "three/examples/jsm/loaders/FontLoader.js";

// ==========================================
// CHARACTER CONTROLLER CLASSES
// ==========================================

/**
 * Proxy class to provide access to character animations
 * This helps separate animation data from the main controller
 */
class BasicCharacterControllerProxy {
  constructor(animations) {
    this._animations = animations;
  }

  get animations() {
    return this._animations;
  }
}

/**
 * Main character controller class
 * Handles character movement, animation loading, and physics
 */
class BasicCharacterController {
  constructor(params) {
    this._Init(params);
  }

  _Init(params) {
    // Store reference to camera and scene
    this._params = params;
    
    // Physics properties for character movement
    this._decceleration = new THREE.Vector3(-0.0005, -0.0001, -5.0); // How fast character slows down
    this._acceleration = new THREE.Vector3(1, 0.25, 50.0);           // How fast character speeds up
    this._velocity = new THREE.Vector3(0, 0, 0);                     // Current speed in each direction
    this._position = new THREE.Vector3();                            // Current position

    // Animation and control systems
    this._animations = {};                                            // Store all character animations
    this._input = new BasicCharacterControllerInput();               // Handle keyboard input
    this._stateMachine = new CharacterFSM(                          // Manage animation states (idle, walk, run, dance)
      new BasicCharacterControllerProxy(this._animations)
    );

    // Load the character model and animations
    this._LoadModels();
  }

  
  /**
   * Load the main character model and all animations
   */
  _LoadModels() {
    // Create loading screen elements
    this._setupLoadingScreen();

    // Get the path to character model using Vite's import system
    const characterPath = new URL('./resources/character/character.fbx', import.meta.url).href;
    const loader = new FBXLoader();

    // Set up loading progress tracking
    this._setupLoadingProgress(loader);

    // Load the main character model
    loader.load(
      characterPath,
      (fbx) => this._onCharacterLoaded(fbx),           // Success callback
      undefined,                                        // Progress callback (unused)
      (err) => console.error("Failed to load character.fbx:", err) // Error callback
    );
  }

  /**
   * Set up the loading screen visibility
   */
  _setupLoadingScreen() {
    const canvas = document.getElementsByTagName("canvas");
    console.log("Canvas elements found:", canvas.length);

    // Hide the 3D scene while loading
    if (canvas[0]) {
      canvas[0].style.display = "none";
      console.log("Canvas hidden during loading");
    } else {
      console.warn("No canvas found");
    }
  }

  /**
   * Set up loading progress bar updates
   */
  _setupLoadingProgress(loader) {
    const progressBar = document.getElementById('progress-bar');
    console.log("Progress bar element:", progressBar);

    // Update progress bar during loading
    loader.manager.onProgress = function(url, loaded, total) {
      const progress = (loaded / total) * 100;
      if (progressBar) progressBar.value = progress;
      console.log(`Loading ${url}: ${loaded}/${total} (${progress.toFixed(2)}%)`);
    };

    // Show scene and hide progress bar when loading is complete
    loader.manager.onLoad = function() {
      console.log("All assets loaded");
      const canvas = document.getElementsByTagName("canvas")[0];
      if (canvas) canvas.style.display = "block";
      
      const progressElement = document.getElementById('pb');
      if (progressElement) progressElement.remove();
      console.log("Loading complete - progress bar removed, canvas visible");
    };
  }

  /**
   * Handle successful character model loading
   */
  _onCharacterLoaded(fbx) {
    console.log("Character FBX loaded:", fbx);

    // Configure character material (make it solid, not transparent)
    if (fbx.children[0]) {
      fbx.children[0].material.transparent = false;
      console.log("Set character material to solid");
    }

    // Scale character to appropriate size
    fbx.scale.setScalar(0.1);
    console.log("Character scaled to 10% of original size");

    // Enable shadow casting for realistic lighting
    fbx.traverse((child) => {
      child.castShadow = true;
    });
    console.log("Enabled shadows for character");

    // Store character reference and add to scene
    this._target = fbx;
    this._params.scene.add(this._target);
    console.log("Character added to scene");

    // Set up animation system
    this._mixer = new THREE.AnimationMixer(this._target);
    console.log("Animation mixer created");

    // Load all character animations
    this._loadCharacterAnimations();
  }

  /**
   * Load all character animation files
   */
  _loadCharacterAnimations() {
    // Create loading manager to track when all animations are loaded
    this._manager = new THREE.LoadingManager();
    this._manager.onLoad = () => {
      console.log("All animations loaded, setting initial state to idle");
      this._stateMachine.SetState("idle");
    };

    // Function to handle each loaded animation
    const onAnimationLoad = (animName, anim) => {
      if (!anim || !anim.animations || anim.animations.length === 0) {
        console.error(`Animation ${animName} is empty or invalid!`);
        return;
      }

      console.log(`Animation loaded: ${animName}`, anim);
      
      // Get the animation clip and create an action for it
      const clip = anim.animations[0];
      const action = this._mixer.clipAction(clip);

      // Store animation for later use
      this._animations[animName] = { clip, action };
      console.log(`Animation ${animName} ready for use`);
    };

    // Create loader for animation files
    const animLoader = new FBXLoader(this._manager);
    console.log("Animation loader initialized");

    // Define all animation files to load
    const animFiles = [
      { name: "walk", file: new URL('./resources/character/walk3.fbx', import.meta.url).href },
      { name: "run", file: new URL('./resources/character/run3.fbx', import.meta.url).href },
      { name: "idle", file: new URL('./resources/character/idle3.fbx', import.meta.url).href },
      { name: "dance", file: new URL('./resources/character/dance3.fbx', import.meta.url).href },
    ];

    // Load each animation file
    animFiles.forEach(anim => {
      animLoader.load(
        anim.file,
        (loadedAnim) => onAnimationLoad(anim.name, loadedAnim),    // Success
        undefined,                                                  // Progress (unused)
        (err) => console.error(`Failed to load ${anim.file}:`, err) // Error
      );
    });
    console.log("Animation loading started");
  }

  // Getter methods to access character position and rotation from outside
  get Position() {
    return this._position;
  }

  get Rotation() {
    if (!this._target) {
      return new THREE.Quaternion(); // Return empty rotation if no character loaded
    }
    return this._target.quaternion;
  }

  /**
   * Update character every frame
   * This handles movement, rotation, and animation
   */
  Update(timeInSeconds) {
    // Don't update if state machine isn't ready
    if (!this._stateMachine._currentState) {
      return;
    }

    // Update animation state machine (handles switching between idle, walk, run, dance)
    this._stateMachine.Update(timeInSeconds, this._input);

    // Apply physics - calculate deceleration (natural slowing down)
    const velocity = this._velocity;
    const frameDecceleration = new THREE.Vector3(
      velocity.x * this._decceleration.x,
      velocity.y * this._decceleration.y,
      velocity.z * this._decceleration.z
    );
    
    // Apply deceleration over time
    frameDecceleration.multiplyScalar(timeInSeconds);
    // Prevent over-deceleration (don't reverse direction)
    frameDecceleration.z = Math.sign(frameDecceleration.z) * 
                          Math.min(Math.abs(frameDecceleration.z), Math.abs(velocity.z));

    velocity.add(frameDecceleration);

    // Get character object and set up rotation calculations
    const controlObject = this._target;
    const quaternion = new THREE.Quaternion();
    const axis = new THREE.Vector3();
    const rotation = controlObject.quaternion.clone();

    // Calculate acceleration (speed boost when running)
    const acc = this._acceleration.clone();
    if (this._input._keys.shift) {
      acc.multiplyScalar(5.0); // 5x speed when holding shift
    }

    // Don't move during dance animation
    if (this._stateMachine._currentState.Name == "dance") {
      acc.multiplyScalar(0.0);
    }

    // Handle forward/backward movement
    if (this._input._keys.forward) {
      velocity.z += acc.z * timeInSeconds;
    }
    if (this._input._keys.backward) {
      velocity.z -= acc.z * timeInSeconds;
    }

    // Handle left/right rotation
    if (this._input._keys.left) {
      axis.set(0, 1, 0); // Y-axis for horizontal rotation
      quaternion.setFromAxisAngle(axis, 2.0 * Math.PI * timeInSeconds * this._acceleration.y);
      rotation.multiply(quaternion);
    }
    if (this._input._keys.right) {
      axis.set(0, 1, 0); // Y-axis for horizontal rotation
      quaternion.setFromAxisAngle(axis, 2.0 * -Math.PI * timeInSeconds * this._acceleration.y);
      rotation.multiply(quaternion);
    }

    // Apply rotation to character
    controlObject.quaternion.copy(rotation);

    // Calculate movement direction based on character's facing direction
    const oldPosition = new THREE.Vector3();
    oldPosition.copy(controlObject.position);

    // Forward direction (where character is facing)
    const forward = new THREE.Vector3(0, 0, 1);
    forward.applyQuaternion(controlObject.quaternion);
    forward.normalize();

    // Sideways direction (perpendicular to forward)
    const sideways = new THREE.Vector3(1, 0, 0);
    sideways.applyQuaternion(controlObject.quaternion);
    sideways.normalize();

    // Apply movement
    sideways.multiplyScalar(velocity.x * timeInSeconds);
    forward.multiplyScalar(velocity.z * timeInSeconds);

    controlObject.position.add(forward);
    controlObject.position.add(sideways);

    // Update stored position
    this._position.copy(controlObject.position);

    // Update animations
    if (this._mixer) {
      this._mixer.update(timeInSeconds);
    }
  }
}

// ==========================================
// INPUT HANDLER CLASS
// ==========================================

/**
 * Handles keyboard input for character movement
 * Tracks which keys are currently pressed
 */
class BasicCharacterControllerInput {
  constructor() {
    this._Init();
  }

  _Init() {
    // Track state of movement keys
    this._keys = {
      forward: false,   // W key or Up arrow
      backward: false,  // S key or Down arrow
      left: false,      // A key or Left arrow
      right: false,     // D key or Right arrow
      space: false,     // Space bar (for dance)
      shift: false,     // Shift key (for running)
    };

    // Listen for key presses and releases
    document.addEventListener("keydown", (e) => this._onKeyDown(e), false);
    document.addEventListener("keyup", (e) => this._onKeyUp(e), false);
  }

  /**
   * Handle key press events
   */
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

  /**
   * Handle key release events
   */
  _onKeyUp(event) {
    switch (event.keyCode) {
      case 87: case 38: // W or Up Arrow
        this._keys.forward = false;
        break;
      case 65: case 37: // A or Left Arrow
        this._keys.left = false;
        break;
      case 83: case 40: // S or Down Arrow
        this._keys.backward = false;
        break;
      case 68: case 39: // D or Right Arrow
        this._keys.right = false;
        break;
      case 32: // Space bar
        this._keys.space = false;
        break;
      case 16: // Shift
        this._keys.shift = false;
        break;
    }
  }
}

// ==========================================
// FINITE STATE MACHINE (ANIMATION STATES)
// ==========================================

/**
 * Base finite state machine class
 * Manages switching between different states
 */
class FiniteStateMachine {
  constructor() {
    this._states = {};        // Available states
    this._currentState = null; // Currently active state
  }

  /**
   * Register a new state type
   */
  _AddState(name, type) {
    this._states[name] = type;
  }

  /**
   * Switch to a different state
   */
  SetState(name) {
    const prevState = this._currentState;

    // Don't switch if already in this state
    if (prevState) {
      if (prevState.Name == name) {
        return;
      }
      prevState.Exit(); // Clean up previous state
    }

    // Create and enter new state
    const state = new this._states[name](this);
    this._currentState = state;
    state.Enter(prevState);
  }

  /**
   * Update current state
   */
  Update(timeElapsed, input) {
    if (this._currentState) {
      this._currentState.Update(timeElapsed, input);
    }
  }
}

/**
 * Character-specific state machine
 * Manages character animation states
 */
class CharacterFSM extends FiniteStateMachine {
  constructor(proxy) {
    super();
    this._proxy = proxy; // Reference to animation proxy
    this._Init();
  }

  _Init() {
    // Register all available character states
    this._AddState("idle", IdleState);
    this._AddState("walk", WalkState);
    this._AddState("run", RunState);
    this._AddState("dance", DanceState);
  }
}

// ==========================================
// CHARACTER ANIMATION STATES
// ==========================================

/**
 * Base state class
 * All character states inherit from this
 */
class State {
  constructor(parent) {
    this._parent = parent; // Reference to state machine
  }

  Enter() {}  // Called when entering this state
  Exit() {}   // Called when leaving this state
  Update() {} // Called every frame while in this state
}

/**
 * Dance animation state
 * Plays dance animation once, then returns to idle
 */
class DanceState extends State {
  constructor(parent) {
    super(parent);
    
    // Callback for when dance animation finishes
    this._FinishedCallback = () => {
      this._Finished();
    };
  }

  get Name() {
    return "dance";
  }

  Enter(prevState) {
    const curAction = this._parent._proxy._animations["dance"].action;
    const mixer = curAction.getMixer();
    
    // Listen for animation completion
    mixer.addEventListener("finished", this._FinishedCallback);

    if (prevState) {
      const prevAction = this._parent._proxy._animations[prevState.Name].action;

      // Set up dance animation to play once
      curAction.reset();
      curAction.setLoop(THREE.LoopOnce, 1);
      curAction.clampWhenFinished = true;
      curAction.crossFadeFrom(prevAction, 0.2, true); // Smooth transition
      curAction.play();
    } else {
      curAction.play();
    }
  }

  /**
   * Called when dance animation completes
   */
  _Finished() {
    this._Cleanup();
    this._parent.SetState("idle"); // Return to idle state
  }

  /**
   * Clean up event listeners
   */
  _Cleanup() {
    const action = this._parent._proxy._animations["dance"].action;
    action.getMixer().removeEventListener("finished", this._FinishedCallback);
  }

  Exit() {
    this._Cleanup();
  }

  Update(_) {
    // Dance state doesn't need to check for transitions
    // It automatically transitions back to idle when finished
  }
}

/**
 * Walking animation state
 * Active when moving without shift key
 */
class WalkState extends State {
  constructor(parent) {
    super(parent);
  }

  get Name() {
    return "walk";
  }

  Enter(prevState) {
    const curAction = this._parent._proxy._animations["walk"].action;
    
    if (prevState) {
      const prevAction = this._parent._proxy._animations[prevState.Name].action;

      curAction.enabled = true;

      // Sync timing when transitioning from run to walk
      if (prevState.Name == "run") {
        const ratio = curAction.getClip().duration / prevAction.getClip().duration;
        curAction.time = prevAction.time * ratio;
      } else {
        // Start fresh for other transitions
        curAction.time = 0.0;
        curAction.setEffectiveTimeScale(1.0);
        curAction.setEffectiveWeight(1.0);
      }

      curAction.crossFadeFrom(prevAction, 0.5, true); // Smooth transition
      curAction.play();
    } else {
      curAction.play();
    }
  }

  Exit() {}

  Update(timeElapsed, input) {
    // Check if still moving
    if (input._keys.forward || input._keys.backward) {
      // Switch to run if holding shift
      if (input._keys.shift) {
        this._parent.SetState("run");
      }
      return;
    }

    // Stop moving - go to idle
    this._parent.SetState("idle");
  }
}

/**
 * Running animation state
 * Active when moving with shift key held
 */
class RunState extends State {
  constructor(parent) {
    super(parent);
  }

  get Name() {
    return "run";
  }

  Enter(prevState) {
    const curAction = this._parent._proxy._animations["run"].action;
    
    if (prevState) {
      const prevAction = this._parent._proxy._animations[prevState.Name].action;

      curAction.enabled = true;

      // Sync timing when transitioning from walk to run
      if (prevState.Name == "walk") {
        const ratio = curAction.getClip().duration / prevAction.getClip().duration;
        curAction.time = prevAction.time * ratio;
      } else {
        // Start fresh for other transitions
        curAction.time = 0.0;
        curAction.setEffectiveTimeScale(1.0);
        curAction.setEffectiveWeight(1.0);
      }

      curAction.crossFadeFrom(prevAction, 0.5, true); // Smooth transition
      curAction.play();
    } else {
      curAction.play();
    }
  }

  Exit() {}

  Update(timeElapsed, input) {
    // Check if still moving
    if (input._keys.forward || input._keys.backward) {
      // Switch to walk if not holding shift
      if (!input._keys.shift) {
        this._parent.SetState("walk");
      }
      return;
    }

    // Stop moving - go to idle
    this._parent.SetState("idle");
  }
}

/**
 * Idle animation state
 * Active when character is not moving
 */
class IdleState extends State {
  constructor(parent) {
    super(parent);
  }

  get Name() {
    return "idle";
  }

  Enter(prevState) {
    const idleAction = this._parent._proxy._animations["idle"].action;
    
    if (prevState) {
      const prevAction = this._parent._proxy._animations[prevState.Name].action;
      
      // Set up idle animation
      idleAction.time = 0.0;
      idleAction.enabled = true;
      idleAction.setEffectiveTimeScale(1.0);
      idleAction.setEffectiveWeight(1.0);
      idleAction.crossFadeFrom(prevAction, 0.5, true); // Smooth transition
      idleAction.play();
    } else {
      idleAction.play();
    }
  }

  Exit() {}

  Update(_, input) {
    // Check for state transitions
    if (input._keys.forward || input._keys.backward) {
      this._parent.SetState("walk"); // Start walking
    } else if (input._keys.space) {
      this._parent.SetState("dance"); // Start dancing
    }
  }
}

// ==========================================
// CAMERA CONTROLLER CLASS
// ==========================================

/**
 * Third-person camera that follows the character
 * Maintains smooth movement and proper viewing angle
 */
class ThirdPersonCamera {
  constructor(params) {
    this._params = params;
    this._camera = params.camera;

    // Current camera position and look-at target
    this._currentPosition = new THREE.Vector3();
    this._currentLookat = new THREE.Vector3();
  }

  /**
   * Calculate ideal camera position relative to character
   */
  _CalculateIdealOffset() {
    const idealOffset = new THREE.Vector3(-15, 17, -26); // Behind, above, and back
    idealOffset.applyQuaternion(this._params.target.Rotation); // Rotate with character
    idealOffset.add(this._params.target.Position);             // Move with character
    return idealOffset;
  }

  /**
   * Calculate where camera should look
   */
  _CalculateIdealLookat() {
    const idealLookat = new THREE.Vector3(0, 10, 50); // Look ahead of character
    idealLookat.applyQuaternion(this._params.target.Rotation); // Rotate with character
    idealLookat.add(this._params.target.Position);             // Move with character
    return idealLookat;
  }

  /**
   * Update camera position and target smoothly
   */
  Update(timeElapsed) {
    const idealOffset = this._CalculateIdealOffset();
    const idealLookat = this._CalculateIdealLookat();

    // Smooth interpolation factor (prevents jerky camera movement)
    const t = 1.0 - Math.pow(0.001, timeElapsed);

    // Gradually move camera towards ideal position
    this._currentPosition.lerp(idealOffset, t);
    this._currentLookat.lerp(idealLookat, t);

    // Apply camera position and direction
    this._camera.position.copy(this._currentPosition);
    this._camera.lookAt(this._currentLookat);
  }
}

// ==========================================
// MAIN WORLD CLASS
// ==========================================

/**
 * Main class that sets up and manages the entire 3D world
 * Handles scene creation, lighting, models, and the game loop
 */
class World {
  constructor() {
    this._Initialize();
  }

  _Initialize() {
    // Set up the 3D renderer
    this._setupRenderer();
    
    // Set up the camera
    this._setupCamera();
    
    // Set up the scene and lighting
    this._setupScene();
    
    // Set up mouse interaction
    this._setupMouseInteraction();
    
    // Create the ground
    this._createGround();
    
    // Initialize arrays for animations and timing
    this._mixers = [];
    this._previousRAF = null;

    // Load character and environment
    this._LoadAnimatedModel();
    this._LoadHouseModels();

    // Start the animation loop
    this._RAF();
  }

  /**
   * Set up the WebGL renderer
   */
  _setupRenderer() {
    this._threejs = new THREE.WebGLRenderer({ antialias: true });
    
    // Configure renderer for better visuals
    this._threejs.outputEncoding = THREE.sRGBEncoding;
    this._threejs.shadowMap.enabled = true;
    this._threejs.shadowMap.type = THREE.PCFSoftShadowMap;
    this._threejs.setPixelRatio(window.devicePixelRatio);
    this._threejs.setSize(window.innerWidth, window.innerHeight);

    // Add renderer to webpage
    document.body.appendChild(this._threejs.domElement);

    // Handle window resizing
    window.addEventListener("resize", () => this._OnWindowResize(), false);
  }

  /**
   * Set up the camera
   */
  _setupCamera() {
    const fov = 60;                    // Field of view
    const aspect = 1920 / 1080;        // Aspect ratio
    const near = 1.0;                  // Near clipping plane
    const far = 1000.0;                // Far clipping plane
    
    this._camera = new THREE.PerspectiveCamera(fov, aspect, near, far);
    this._camera.position.set(25, 10, 10); // Initial position

    // Third-person camera will be set up later when character loads
  }

  /**
   * Set up the scene and lighting
   */
  _setupScene() {
    this._scene = new THREE.Scene();
    this._raycaster = new THREE.Raycaster(); // For mouse interaction

    // Main directional light (sun-like lighting)
    let light = new THREE.DirectionalLight(0xffffff, 0.2);
    light.position.set(20, 100, 10);
    light.target.position.set(0, 0, 0);
    
    // Configure shadows
    light.castShadow = true;
    light.shadow.bias = -0.001;
    light.shadow.mapSize.width = 2048;
    light.shadow.mapSize.height = 2048;
    light.shadow.camera.near = 0.1;
    light.shadow.camera.far = 500.0;
    light.shadow.camera.left = 100;
    light.shadow.camera.right = -100;
    light.shadow.camera.top = 100;
    light.shadow.camera.bottom = -100;
    this._scene.add(light);

    // Ambient light (general illumination)
    light = new THREE.AmbientLight(0xffffff, 1);
    this._scene.add(light);
  }

  /**
   * Set up mouse interaction tracking
   */
  _setupMouseInteraction() {
    this._mouse = { x: undefined, y: undefined };
    
    addEventListener("mousemove", (event) => {
      // Convert mouse coordinates to normalized device coordinates
      this._mouse.x = (event.clientX / innerWidth) * 2 - 1;
      this._mouse.y = -(event.clientY / innerHeight) * 2 + 1;
    });
  }

  /**
   * Create the ground plane
   */
  _createGround() {
    const plane = new THREE.Mesh(
      new THREE.PlaneGeometry(300, 300, 1, 1),       // Large flat plane
      new THREE.MeshStandardMaterial({
        color: new THREE.Color(0xae9273)              // Brown/tan color
      })
    );

    // Configure ground properties
    plane.castShadow = false;    // Ground doesn't cast shadows
    plane.receiveShadow = true;  // Ground receives shadows from other objects
    plane.rotation.x = -Math.PI / 2; // Rotate to be horizontal
    this._scene.add(plane);
  }

  /**
   * Load text and decorative models for the scene
   */
  _LoadHouseModels() {
    const loader = new FontLoader();
    
    // Load fonts for text rendering
    loader.load("resources/font/optimer_bold.typeface.json", (font3d) => {
      loader.load("resources/font/helvetiker_regular.typeface.json", (font) => {
        this._createWelcomeText(font);     // Create main welcome text
        this._createInstructionText(font); // Create instruction text
        this._create3DNameText(font3d);    // Create 3D name text
      });
    });
  }

  /**
   * Create the main welcome text
   */
  _createWelcomeText(font) {
    const material = new THREE.MeshBasicMaterial({
      color: 0x67ACA2,
      transparent: true,
      opacity: 0.8,
      side: THREE.DoubleSide,
    });

    const message = "Thrilled to have you here. \n\n" +
                   "I'm a full-stack software developer with a love for crafting user-focused software that scales effortlessly. \n" +
                   "With a wide range of skills and experience, I'm constantly driving improvements throughout the product lifecycle. \n" +
                   "I can't wait to show you my professional and personal projects. \n" +
                   "Let's dive in!";

    const shapes = font.generateShapes(message, 11);
    const geometry = new THREE.ShapeGeometry(shapes);
    const text = new THREE.Mesh(geometry, material);

    // Position the text in the scene
    text.rotateY(110);
    text.position.set(380, 150, 360);
    this._scene.add(text);
    this._text = text; // Store reference for potential interaction
  }

  /**
   * Create instruction text for controls
   */
  _createInstructionText(font) {
    const material = new THREE.MeshBasicMaterial({
      color: 0x67ACA2,
      transparent: true,
      opacity: 0.8,
      side: THREE.DoubleSide,
    });

    const instructions = "use Arrow keys to move\nand\nhold Shift to run";
    const shapes = font.generateShapes(instructions, 2);
    const geometry = new THREE.ShapeGeometry(shapes);
    const text = new THREE.Mesh(geometry, material);

    // Position instruction text
    text.rotateY(110);
    text.position.set(-40, 18, 70);
    this._scene.add(text);
  }

  /**
   * Create 3D extruded text for the name/title
   */
  _create3DNameText(font3d) {
    const textGeometry = new TextGeometry("B.Suraj\n   Software Developer", {
      font: font3d,
      size: 4,                    // Text size
      height: 0.2,                // Text depth/extrusion
      curveSegments: 10,          // Smoothness of curves
      bevelEnabled: true,         // Add beveled edges
      bevelThickness: 0.26,       // Bevel thickness
      bevelSize: 0.26,            // Bevel size
      bevelOffset: 0,             // Bevel offset
      bevelSegments: 5,           // Bevel smoothness
    });

    const material = new THREE.MeshPhongMaterial({
      color: 0x504685,            // Purple color
      opacity: 0.84,
      transparent: true,
    });

    const nameText = new THREE.Mesh(textGeometry, material);
    
    // Position the 3D name text
    nameText.rotateY(110);
    nameText.position.set(15, 17, 20);
    this._scene.add(nameText);
  }

  /**
   * Load and set up the animated character
   */
  _LoadAnimatedModel() {
    const params = {
      camera: this._camera,
      scene: this._scene,
    };
    
    // Create character controller
    this._controls = new BasicCharacterController(params);
    
    // Set up third-person camera to follow character
    this._thirdPersonCamera = new ThirdPersonCamera({
      camera: this._camera,
      target: this._controls,
    });
  }

  /**
   * Handle window resize events
   */
  _OnWindowResize() {
    // Update camera aspect ratio and projection
    this._camera.aspect = window.innerWidth / window.innerHeight;
    this._camera.updateProjectionMatrix();
    
    // Update renderer size
    this._threejs.setSize(window.innerWidth, window.innerHeight);
  }

  /**
   * Main animation loop (RAF = RequestAnimationFrame)
   * This runs continuously to animate the scene
   */
  _RAF() {
    // Schedule next frame
    window.requestAnimationFrame((currentTime) => {
      // Initialize timing on first frame
      if (this._previousRAF === null) {
        this._previousRAF = currentTime;
      }

      // Continue the animation loop
      this._RAF();

      // Render the scene
      this._threejs.render(this._scene, this._camera);

      // Update all animated objects
      this._Step(currentTime - this._previousRAF);
      this._previousRAF = currentTime;

      // Update mouse interaction raycasting
      this._raycaster.setFromCamera(this._mouse, this._camera);
      // Note: Mouse interaction with text objects can be implemented here
    });
  }

  /**
   * Update all animated objects each frame
   * @param {number} timeElapsed - Time since last frame in milliseconds
   */
  _Step(timeElapsed) {
    // Convert milliseconds to seconds
    const timeElapsedS = timeElapsed * 0.001;

    // Update any additional animation mixers
    if (this._mixers) {
      this._mixers.forEach((mixer) => mixer.update(timeElapsedS));
    }

    // Update character controller (movement, animations, etc.)
    if (this._controls) {
      this._controls.Update(timeElapsedS);
    }

    // Update third-person camera to follow character
    if (this._thirdPersonCamera) {
      this._thirdPersonCamera.Update(timeElapsedS);
    }
  }
}

// ==========================================
// APPLICATION STARTUP
// ==========================================

/**
 * Global application instance
 * This will hold our main World object
 */
let _APP = null;

/**
 * Start the application when the page is fully loaded
 * DOMContentLoaded ensures all HTML elements are ready
 */
window.addEventListener("DOMContentLoaded", () => {
  console.log("Starting 3D Character Controller Application...");
  _APP = new World();
  console.log("Application started successfully!");
});