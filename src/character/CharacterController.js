import * as THREE from "three";
import { FBXLoader } from "three/examples/jsm/loaders/FBXLoader.js";
import { CharacterInput } from './CharacterInput.js';
import { AnimationProxy } from './animations/AnimationProxy.js';
import { CharacterFSM } from './animations/CharacterFSM.js'; // Changed!

export class CharacterController {
  constructor(params) {
    this._Init(params);
  }

  _Init(params) {
    this._params = params;
    
    this._decceleration = new THREE.Vector3(-0.0005, -0.0001, -5.0);
    this._acceleration = new THREE.Vector3(1, 0.25, 50.0);
    this._velocity = new THREE.Vector3(0, 0, 0);
    this._position = new THREE.Vector3();

    this._animations = {};
    this._input = new CharacterInput();
    this._stateMachine = new CharacterFSM(
      new AnimationProxy(this._animations)
    );

    this._LoadModels();
  }

  _LoadModels() {
    this._setupLoadingScreen();

    const characterPath = "resources/character/character.fbx";
    const loader = new FBXLoader();

    this._setupLoadingProgress(loader);

    loader.load(
      characterPath,
      (fbx) => this._onCharacterLoaded(fbx),
      undefined,
      (err) => console.error("Failed to load character.fbx:", err)
    );
  }

  _setupLoadingScreen() {
    const canvas = document.getElementsByTagName("canvas");
    console.log("Canvas elements found:", canvas.length);

    if (canvas[0]) {
      canvas[0].style.display = "none";
      console.log("Canvas hidden during loading");
    } else {
      console.warn("No canvas found");
    }
  }

  _setupLoadingProgress(loader) {
    const progressBar = document.getElementById('progress-bar');
    console.log("Progress bar element:", progressBar);

    loader.manager.onProgress = function(url, loaded, total) {
      const progress = (loaded / total) * 100;
      if (progressBar) progressBar.value = progress;
      console.log(`Loading ${url}: ${loaded}/${total} (${progress.toFixed(2)}%)`);
    };

    loader.manager.onLoad = function() {
      console.log("All assets loaded");
      const canvas = document.getElementsByTagName("canvas")[0];
      if (canvas) canvas.style.display = "block";
      
      const progressElement = document.getElementById('pb');
      if (progressElement) progressElement.remove();
      console.log("Loading complete - progress bar removed, canvas visible");
    };
  }

  _onCharacterLoaded(fbx) {
    console.log("Character FBX loaded:", fbx);

    if (fbx.children[0]) {
      fbx.children[0].material.transparent = false;
      console.log("Set character material to solid");
    }

    fbx.scale.setScalar(0.1);
    console.log("Character scaled to 10% of original size");

    fbx.traverse((child) => {
      child.castShadow = true;
    });
    console.log("Enabled shadows for character");

    this._target = fbx;
    this._params.scene.add(this._target);
    console.log("Character added to scene");

    this._mixer = new THREE.AnimationMixer(this._target);
    console.log("Animation mixer created");

    this._loadCharacterAnimations();
  }

  _loadCharacterAnimations() {
    this._manager = new THREE.LoadingManager();
    this._manager.onLoad = () => {
      console.log("All animations loaded, setting initial state to idle");
      this._stateMachine.SetState("idle");
    };

    const onAnimationLoad = (animName, anim) => {
      if (!anim || !anim.animations || anim.animations.length === 0) {
        console.error(`Animation ${animName} is empty or invalid!`);
        return;
      }

      console.log(`Animation loaded: ${animName}`, anim);
      
      const clip = anim.animations[0];
      const action = this._mixer.clipAction(clip);

      this._animations[animName] = { clip, action };
      console.log(`Animation ${animName} ready for use`);
    };

    const animLoader = new FBXLoader(this._manager);
    console.log("Animation loader initialized");

    const animFiles = [
      { name: "walk", file: 'resources/character/walk3.fbx'},
      { name: "run", file: "resources/character/run3.fbx" },
      { name: "idle", file: "resources/character/idle3.fbx" },
      { name: "dance", file: "resources/character/dance3.fbx" },
    ];

    animFiles.forEach(anim => {
      animLoader.load(
        anim.file,
        (loadedAnim) => onAnimationLoad(anim.name, loadedAnim),
        undefined,
        (err) => console.error(`Failed to load ${anim.file}:`, err)
      );
    });
    console.log("Animation loading started");
  }

  get Position() {
    return this._position;
  }

  get Rotation() {
    if (!this._target) {
      return new THREE.Quaternion();
    }
    return this._target.quaternion;
  }

  Update(timeInSeconds) {
    if (!this._stateMachine._currentState) {
      return;
    }

    this._stateMachine.Update(timeInSeconds, this._input);

    const velocity = this._velocity;
    const frameDecceleration = new THREE.Vector3(
      velocity.x * this._decceleration.x,
      velocity.y * this._decceleration.y,
      velocity.z * this._decceleration.z
    );
    
    frameDecceleration.multiplyScalar(timeInSeconds);
    frameDecceleration.z = Math.sign(frameDecceleration.z) * 
                          Math.min(Math.abs(frameDecceleration.z), Math.abs(velocity.z));

    velocity.add(frameDecceleration);

    const controlObject = this._target;
    const quaternion = new THREE.Quaternion();
    const axis = new THREE.Vector3();
    const rotation = controlObject.quaternion.clone();

    const acc = this._acceleration.clone();
    if (this._input._keys.shift) {
      acc.multiplyScalar(5.0);
    }

    if (this._stateMachine._currentState.Name == "dance") {
      acc.multiplyScalar(0.0);
    }

    if (this._input._keys.forward) {
      velocity.z += acc.z * timeInSeconds;
    }
    if (this._input._keys.backward) {
      velocity.z -= acc.z * timeInSeconds;
    }

    if (this._input._keys.left) {
      axis.set(0, 1, 0);
      quaternion.setFromAxisAngle(axis, 2.0 * Math.PI * timeInSeconds * this._acceleration.y);
      rotation.multiply(quaternion);
    }
    if (this._input._keys.right) {
      axis.set(0, 1, 0);
      quaternion.setFromAxisAngle(axis, 2.0 * -Math.PI * timeInSeconds * this._acceleration.y);
      rotation.multiply(quaternion);
    }

    controlObject.quaternion.copy(rotation);

    const oldPosition = new THREE.Vector3();
    oldPosition.copy(controlObject.position);

    const forward = new THREE.Vector3(0, 0, 1);
    forward.applyQuaternion(controlObject.quaternion);
    forward.normalize();

    const sideways = new THREE.Vector3(1, 0, 0);
    sideways.applyQuaternion(controlObject.quaternion);
    sideways.normalize();

    sideways.multiplyScalar(velocity.x * timeInSeconds);
    forward.multiplyScalar(velocity.z * timeInSeconds);

    controlObject.position.add(forward);
    controlObject.position.add(sideways);

    this._position.copy(controlObject.position);

    if (this._mixer) {
      this._mixer.update(timeInSeconds);
    }
  }
}