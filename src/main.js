// "use strict";

// import "/css/style.css";
import * as THREE from "three";
// // import * as THREE from "three";
import { FBXLoader } from "three/examples/jsm/loaders/FBXLoader.js";
// import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
// import SplineLoader from "@splinetool/loader";

import { TextGeometry } from "three/examples/jsm/geometries/TextGeometry";

import { FontLoader } from "three/examples/jsm/loaders/FontLoader.js";
// import threeOrbitControls from "three-orbit-controls";

// import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.118/build/three.module.js";

// import { FBXLoader } from "https://cdn.jsdelivr.net/npm/three@0.118.1/examples/jsm/loaders/FBXLoader.js";
// // import { GLTFLoader } from "https://cdn.jsdelivr.net/npm/three@0.118.1/examples/jsm/loaders/GLTFLoader.js";
// import { OrbitControls } from "https://cdn.jsdelivr.net/npm/three@0.118/examples/jsm/controls/OrbitControls.js";

// import * as SplineLoader from "https://cdn.jsdelivr.net/npm/@splinetool/loader@0.9.75/build/SplineLoader.min.js";

// import { GLTFLoader } from "https://cdn.jsdelivr.net/npm/three@0.118.1/examples/jsm/loaders/GLTFLoader.js";

// import { Physijs } from "physijs";
// var Physijs = require("/js/physi.js")(THREE, Ammo);

// Physijs.scripts.worker = "/js/physijs_worker.js";
// Physijs.scripts.ammo = "/js/ammo.js";

// Physijs.scripts.worker = "physijs_worker.js";

// import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.118/build/three.module.js";

// import { OrbitControls } from "https://cdn.jsdelivr.net/npm/three@0.118/examples/jsm/controls/OrbitControls.js";

// import { FBXLoader } from "https://cdn.jsdelivr.net/npm/three@0.118.1/examples/jsm/loaders/FBXLoader.js";

// import { GLTFLoader } from "https://cdn.jsdelivr.net/npm/three@0.118.1/examples/jsm/loaders/GLTFLoader.js";

// const texture = loader.load([
//   "./resources/bluecloud_bk.jpg",
//   "./resources/bluecloud_dn.jpg",
//   "./resources/bluecloud_ft.jpg",
//   "./resources/bluecloud_lf.jpg",
//   "./resources/bluecloud_rt.jpg",
//   "./resources/bluecloud_up.jpg",
// ]);
// import OrbitControls from "three-orbit-controls";




class BasicCharacterControllerProxy {
  constructor(animations) {
    this._animations = animations;
  }

  get animations() {
    return this._animations;
  }
}

class BasicCharacterController {
  constructor(params) {
    this._Init(params);
  }

  // intersect(sphere, spradius, other, obradius) {
  //   // we are using multiplications because it's faster than calling Math.pow
  //   var distance = Math.sqrt(
  //     (sphere.x - other.x) * (sphere.x - other.x) +
  //       (sphere.y - other.y) * (sphere.y - other.y) +
  //       (sphere.z - other.z) * (sphere.z - other.z)
  //   );
  //   console.log(distance);
  //   return distance < spradius + obradius;
  // }

  _Init(params) {
    this._params = params;
    this._decceleration = new THREE.Vector3(-0.0005, -0.0001, -5.0);
    this._acceleration = new THREE.Vector3(1, 0.25, 50.0);
    this._velocity = new THREE.Vector3(0, 0, 0);
    this._position = new THREE.Vector3();

    this._animations = {};
    this._input = new BasicCharacterControllerInput();
    this._stateMachine = new CharacterFSM(
      new BasicCharacterControllerProxy(this._animations)
    );

    this._LoadModels();
  }

  _LoadModels() {

    //loading c
// const loadingManager = new THREE.LoadingManager();

// loadingManager.onStart = function(url,item,total){
//   console.log("Started");
// }

// ✅ Use new URL to resolve FBX file path in Vite
const characterPath = new URL('./resources/character/character.fbx', import.meta.url).href;

const loader = new FBXLoader();

// loading screen code
var bgc = document.getElementsByTagName("canvas");
console.log("Canvas elements found:", bgc.length);

if (bgc[0]) {
    bgc[0].style.display = "none";
    console.log("Canvas hidden");
} else {
    console.warn("No canvas found");
}

const progressBar = document.getElementById('progress-bar');
console.log("Progress bar element:", progressBar);

loader.manager.onProgress = function(url, loaded, total) {
    const progress = (loaded / total) * 100;
    progressBar.value = progress;
    console.log(`Loading ${url}: ${loaded}/${total} (${progress.toFixed(2)}%)`);
};

loader.manager.onLoad = function() {
    console.log("All assets loaded");
    if (bgc[0]) bgc[0].style.display = "block";
    const pbElement = document.getElementById('pb');
    if (pbElement) pbElement.remove();
    console.log("Progress bar removed, canvas visible");
};
// loading screen code end

// Use the resolved URL instead of require()
loader.load(
    characterPath,
    (fbx) => {
        console.log("Character FBX loaded:", fbx);

        if (fbx.children[0]) {
            fbx.children[0].material.transparent = false;
            console.log("Set character material transparency to false");
        } else {
            console.warn("FBX has no children");
        }

        fbx.scale.setScalar(0.1);
        console.log("Character scaled to 0.1");

        fbx.traverse((c) => {
            c.castShadow = true;
        });
        console.log("Set castShadow = true for all children");

        this._target = fbx;
        this._params.scene.add(this._target);
        console.log("Character added to scene");

        this._mixer = new THREE.AnimationMixer(this._target);
        console.log("Animation mixer created");

        this._manager = new THREE.LoadingManager();
        this._manager.onLoad = () => {
            console.log("All animations loaded, setting state to idle");
            this._stateMachine.SetState("idle");
        };

        const _OnLoad = (animName, anim) => {
            if (!anim || !anim.animations || anim.animations.length === 0) {
                console.error(`Animation ${animName} is empty or invalid!`);
                return;
            }

            console.log(`Animation loaded: ${animName}`, anim);
            const clip = anim.animations[0];
            const action = this._mixer.clipAction(clip);

            this._animations[animName] = { clip, action };
            console.log(`Animation ${animName} added to _animations`);
        };

        const animLoader = new FBXLoader(this._manager);
        console.log("Animation loader initialized");

        const animFiles = [
            { name: "walk", file: new URL('./resources/character/walk3.fbx', import.meta.url).href },
            { name: "run", file: new URL('./resources/character/run3.fbx', import.meta.url).href },
            { name: "idle", file: new URL('./resources/character/idle3.fbx', import.meta.url).href },
            { name: "dance", file: new URL('./resources/character/dance3.fbx', import.meta.url).href },
        ];

        animFiles.forEach(anim => {
            animLoader.load(
                anim.file,
                (a) => _OnLoad(anim.name, a),
                undefined,
                (err) => console.error(`Failed to load ${anim.file}:`, err)
            );
        });
        console.log("Animation loading started");
    },
    undefined,
    (err) => console.error("Failed to load character.fbx:", err)
);
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
    frameDecceleration.z =
      Math.sign(frameDecceleration.z) *
      Math.min(Math.abs(frameDecceleration.z), Math.abs(velocity.z));

    velocity.add(frameDecceleration);

    const controlObject = this._target;
    const _Q = new THREE.Quaternion();
    const _A = new THREE.Vector3();
    const _R = controlObject.quaternion.clone();

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
      _A.set(0, 1, 0);
      _Q.setFromAxisAngle(
        _A,
        2.0 * Math.PI * timeInSeconds * this._acceleration.y
      );
      _R.multiply(_Q);
    }
    if (this._input._keys.right) {
      _A.set(0, 1, 0);
      _Q.setFromAxisAngle(
        _A,
        2.0 * -Math.PI * timeInSeconds * this._acceleration.y
      );
      _R.multiply(_Q);
    }

    controlObject.quaternion.copy(_R);

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

class BasicCharacterControllerInput {
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
      case 87: // w
        this._keys.forward = true;
        break;
      case 65: // a
        this._keys.left = true;
        break;
      case 83: // s
        this._keys.backward = true;
        break;
      case 68: // d
        this._keys.right = true;
        break;
        case 38: // up arow
        this._keys.forward = true;
        break;
      case 37: // left arrow
        this._keys.left = true;
        break;
      case 40: // down arrow
        this._keys.backward = true;
        break;
      case 39: // right arrow
        this._keys.right = true;
        break;
      case 32: // SPACE
        this._keys.space = true;
        break;
      case 16: // SHIFT
        this._keys.shift = true;
        break;
    }
  }

  _onKeyUp(event) {
    switch (event.keyCode) {
      case 87: // w
        this._keys.forward = false;
        break;
      case 65: // a
        this._keys.left = false;
        break;
      case 83: // s
        this._keys.backward = false;
        break;
      case 68: // d
        this._keys.right = false;
        break;
      case 38: // up arow
        this._keys.forward = false;
        break;
      case 37: // left arrow
        this._keys.left = false;
        break;
      case 40: // down arrow
        this._keys.backward = false;
        break;
      case 39: // right arrow
        this._keys.right = false;
        break;
      case 32: // SPACE
        this._keys.space = false;
        break;
      case 16: // SHIFT
        this._keys.shift = false;
        break;
    }
  }
}

class FiniteStateMachine {
  constructor() {
    this._states = {};
    this._currentState = null;
  }

  _AddState(name, type) {
    this._states[name] = type;
  }

  SetState(name) {
    const prevState = this._currentState;

    if (prevState) {
      if (prevState.Name == name) {
        return;
      }
      prevState.Exit();
    }

    const state = new this._states[name](this);

    this._currentState = state;
    state.Enter(prevState);
  }

  Update(timeElapsed, input) {
    if (this._currentState) {
      this._currentState.Update(timeElapsed, input);
    }
  }
}

class CharacterFSM extends FiniteStateMachine {
  constructor(proxy) {
    super();
    this._proxy = proxy;
    this._Init();
  }

  _Init() {
    this._AddState("idle", IdleState);
    this._AddState("walk", WalkState);
    this._AddState("run", RunState);
    this._AddState("dance", DanceState);
  }
}

class State {
  constructor(parent) {
    this._parent = parent;
  }

  Enter() {}
  Exit() {}
  Update() {}
}

class DanceState extends State {
  constructor(parent) {
    super(parent);

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
    mixer.addEventListener("finished", this._FinishedCallback);

    if (prevState) {
      const prevAction = this._parent._proxy._animations[prevState.Name].action;

      curAction.reset();
      curAction.setLoop(THREE.LoopOnce, 1);
      curAction.clampWhenFinished = true;
      curAction.crossFadeFrom(prevAction, 0.2, true);
      curAction.play();
    } else {
      curAction.play();
    }
  }

  _Finished() {
    this._Cleanup();
    this._parent.SetState("idle");
  }

  _Cleanup() {
    const action = this._parent._proxy._animations["dance"].action;

    action.getMixer().removeEventListener("finished", this._CleanupCallback);
  }

  Exit() {
    this._Cleanup();
  }

  Update(_) {}
}

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

      if (prevState.Name == "run") {
        const ratio =
          curAction.getClip().duration / prevAction.getClip().duration;
        curAction.time = prevAction.time * ratio;
      } else {
        curAction.time = 0.0;
        curAction.setEffectiveTimeScale(1.0);
        curAction.setEffectiveWeight(1.0);
      }

      curAction.crossFadeFrom(prevAction, 0.5, true);
      curAction.play();
    } else {
      curAction.play();
    }
  }

  Exit() {}

  Update(timeElapsed, input) {
    if (input._keys.forward || input._keys.backward) {
      if (input._keys.shift) {
        this._parent.SetState("run");
      }
      return;
    }

    this._parent.SetState("idle");
  }
}

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

      if (prevState.Name == "walk") {
        const ratio =
          curAction.getClip().duration / prevAction.getClip().duration;
        curAction.time = prevAction.time * ratio;
      } else {
        curAction.time = 0.0;
        curAction.setEffectiveTimeScale(1.0);
        curAction.setEffectiveWeight(1.0);
      }

      curAction.crossFadeFrom(prevAction, 0.5, true);
      curAction.play();
    } else {
      curAction.play();
    }
  }

  Exit() {}

  Update(timeElapsed, input) {
    if (input._keys.forward || input._keys.backward) {
      if (!input._keys.shift) {
        this._parent.SetState("walk");
      }
      return;
    }

    this._parent.SetState("idle");
  }
}

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
      idleAction.time = 0.0;
      idleAction.enabled = true;
      idleAction.setEffectiveTimeScale(1.0);
      idleAction.setEffectiveWeight(1.0);
      idleAction.crossFadeFrom(prevAction, 0.5, true);
      idleAction.play();
    } else {
      idleAction.play();
    }
  }

  Exit() {}

  Update(_, input) {
    if (input._keys.forward || input._keys.backward) {
      this._parent.SetState("walk");
    } else if (input._keys.space) {
      this._parent.SetState("dance");
    }
  }
}

class ThirdPersonCamera {
  constructor(params) {
    this._params = params;
    this._camera = params.camera;

    this._currentPosition = new THREE.Vector3();
    this._currentLookat = new THREE.Vector3();
  }

  _CalculateIdealOffset() {
    const idealOffset = new THREE.Vector3(-15, 17, -26);
    idealOffset.applyQuaternion(this._params.target.Rotation);
    idealOffset.add(this._params.target.Position);
    return idealOffset;
  }

  _CalculateIdealLookat() {
    const idealLookat = new THREE.Vector3(0, 10, 50);

    idealLookat.applyQuaternion(this._params.target.Rotation);
    idealLookat.add(this._params.target.Position);
    return idealLookat;
  }

  Update(timeElapsed) {
    const idealOffset = this._CalculateIdealOffset();
    const idealLookat = this._CalculateIdealLookat();

    // const t = 0.05;
    // const t = 4.0 * timeElapsed;
    const t = 1.0 - Math.pow(0.001, timeElapsed);

    this._currentPosition.lerp(idealOffset, t);
    this._currentLookat.lerp(idealLookat, t);

    this._camera.position.copy(this._currentPosition);
    this._camera.lookAt(this._currentLookat);
  }
}

class World {
  constructor() {
    this._Initialize();
  }

  _Initialize() {
    //ammo code.........
    // this.collisionConfiguration_ = new Ammo.btDefaultCollisionConfiguration();
    // this.dispatcher_ = new Ammo.btCollisionDispatcher(
    //   this.collisionConfiguration_
    // );
    // this.broadphase_ = new Ammo.btDbvtBroadphase();
    // this.solver_ = new Ammo.btSequentialImpulseConstraintSolver();
    // this.physicsWorld_ = new Ammo.btDiscreteDynamicsWorld(
    //   this.dispatcher_,
    //   this.broadphase_,
    //   this.solver_,
    //   this.collisionConfiguration_
    // );
    // this.physicsWorld_.setGravity(new Ammo.btVector3(0, -100, 0));

    //..................
    this._threejs = new THREE.WebGLRenderer({ antialias: true });

    this._threejs.outputEncoding = THREE.sRGBEncoding;
    this._threejs.shadowMap.enabled = true;
    this._threejs.shadowMap.type = THREE.PCFSoftShadowMap;
    this._threejs.setPixelRatio(window.devicePixelRatio);
    this._threejs.setSize(window.innerWidth, window.innerHeight);

    document.body.appendChild(this._threejs.domElement);

    window.addEventListener(
      "resize",
      () => {
        this._OnWindowResize();
      },
      false
    );

    const fov = 60;
    const aspect = 1920 / 1080;
    const near = 1.0;
    const far = 1000.0;
    this._camera = new THREE.PerspectiveCamera(fov, aspect, near, far);
    this._camera.position.set(25, 10, 10);
    //code new  for camera tpp

    this._thirdPersonCamera = new ThirdPersonCamera({
      camera: this._camera,
    });

    this._scene = new THREE.Scene();
    //raycaster
    this._raycaster = new THREE.Raycaster();
    // prettier-ignore
    // this._scene = new Physijs.Scene;
    // this._scene.setGravity(new THREE.Vector3(0, -10, 0));

    //old code had 0xffffff,1.3
    let light = new THREE.DirectionalLight(0xffffff,0.2);
    light.position.set(20, 100, 10);
    light.target.position.set(0, 0, 0);
    light.castShadow = true;
    light.shadow.bias = -0.001;
    light.shadow.mapSize.width = 2048;
    light.shadow.mapSize.height = 2048;
    light.shadow.camera.near = 0.1;
    light.shadow.camera.far = 500.0;
    light.shadow.camera.near = 0.5;
    light.shadow.camera.far = 500.0;
    light.shadow.camera.left = 100;
    light.shadow.camera.right = -100;
    light.shadow.camera.top = 100;
    light.shadow.camera.bottom = -100;
    this._scene.add(light);

    // light = new THREE.AmbientLight(0x404040);
    light = new THREE.AmbientLight(0xffffff, 1);

    this._scene.add(light);

    // light = new THREE.PointLight();
    // light.position.set(0.8, 1.4, 1.0);
    // this._scene.add(light);

    // const controls = new OrbitControls(this._camera, this._threejs.domElement);
    // controls.target.set(0, 20, 0);
    // controls.update();

    // const loader = new THREE.CubeTextureLoader();
    // const texture = loader.load([
    //   "./resources/background/bluecloud_ft.jpg",
    //   "./resources/background/bluecloud_bk.jpg",
    //   "./resources/background/bluecloud_up.jpg",
    //   "./resources/background/bluecloud_dn.jpg",
    //   "./resources/background/bluecloud_rt.jpg",
    //   "./resources/background/bluecloud_lf.jpg",
    // ]);

    // this._scene.background = texture;
    //adding mouse event listner here...
    this._mouse = {
      x: undefined,
      y: undefined,
    };
    addEventListener("mousemove", (event) => {
      this._mouse.x = (event.clientX / innerWidth) * 2 - 1;
      this._mouse.y = -(event.clientY / innerHeight) * 2 + 1;
      // console.log(this._mouse);
    });

    const plane = new THREE.Mesh(
      new THREE.PlaneGeometry(300, 300, 1, 1),
      new THREE.MeshStandardMaterial({
        color: new THREE.Color(0xae9273)
        // color: 0x202020,
        // color: 0xbced91,
      })
    );

    plane.castShadow = false;
    plane.receiveShadow = true;
    plane.rotation.x = -Math.PI / 2;
    this._scene.add(plane);

    this._mixers = [];
    this._previousRAF = null;

    this._LoadAnimatedModel();

    this._LoadHouseModels();

    this._RAF();
  }

  _LoadHouseModels() {
    // const wallGeometry = new THREE.BoxGeometry(60, 20, 1);
    // const material = new THREE.MeshBasicMaterial({
    //   color: 0xffffff,
    // });
    // var x = new THREE.BoundingBoxHelper(material);
    // console.log(x);
    // const box = new THREE.Mesh(wallGeometry, material);
    // box.position.set(35, 10, 20);
    // this._scene.add(box);
    // var x = new THREE.BoundingBoxHelper(box);
    //loading gltf models?
    // const loader = new GLTFLoader();
    // loader.load('./resources/objects/Rocket_Ship_01.gltf',(gltf)=>{
    //   gltf.scene.position.set(35, 10, 20);
    //   gltf.scene.traverse(c=>{
    //     c.castShadow = true;
    //   });
    //   console.log(gltf);
    //   this._scene.add(gltf.scene);
    // });

    //spline working
    // const loader = new SplineLoader();
    // loader.load(
    //   "https://prod.spline.design/oFa6OpS1OjAuYO2c/scene.splinecode",
    //   (splineScene) => {
    //     console.log(splineScene);
    //     this._scene.add(splineScene);
    //   }
    // );

    const loader = new FontLoader();
    loader.load("resources/font/optimer_bold.typeface.json", (font3d) => {
      loader.load("resources/font/helvetiker_regular.typeface.json", (font) => {
        // const color = 0xbced91;
        

        const matLite = new THREE.MeshBasicMaterial({
          color: 0x67ACA2,
          transparent: true,
          opacity: 0.8,
          side: THREE.DoubleSide,
        });

        const message =
          // "A Software Developer\n\nextensively worked on\nFlutter  Chrome Extensions  .NET";
          // "Welcome to my portfolio!\n\nI'm a full-stack software developer with a passion for building applications that deliver exceptional user experiences and can scale to meet business needs. \nWith proven expertise in both application and SDK development, I'm skilled in driving improvements throughout the product lifecycle. \nMy excellent communication skills enable me to lead teams and collaborate effectively with cross-functional groups, while my adaptability \nensures success in diverse environments. I'm proficient in a range of technologies and languages, including \nC, C++, C#, Dart, JavaScript, and Python, and have hands-on experience working with tools such as \nFlutter, W.P.F, IoT, Git, VS Code, Postman, Figma, Notion, Slack, Play Console, Xcode, Firebase, Micro-Controllers, and Chrome Extensions.\nLet's explore my portfolio and learn more about my professional and personal projects.";
          // "Welcome to my portfolio! \n\nI'm a full-stack software developer with a passion for building intricate software that deliver exceptional user experiences \nand can scale to meet business needs. I'm skilled in driving improvements throughout the product lifecycle \nand have hands-on experience working with technologies and languages such as C, C++, C#, Dart, JavaScript, and Python, \nas well as tools like Flutter, WPF, IoT, Git, VS Code, Postman, Notion, Slack, Play Console, Xcode, Firebase, and Chrome Extensions. \nLet's explore my portfolio and learn more about my professional and personal projects.";
          "Thrilled to have you here. \n\nI'm a full-stack software developer with a love for crafting user-focused software that scales effortlessly. \nWith a wide range of skills and experience, I'm constantly driving improvements throughout the product lifecycle. \nI can't wait to show you my professional and personal projects. \nLet's dive in!";
          //7
        const shapes = font.generateShapes(message, 11);

        const geometry = new THREE.ShapeGeometry(shapes);

        const text = new THREE.Mesh(geometry, matLite);

        // console.log(text);
        // console.log(geometry);
        text.rotateY(110);
        text.position.x = 380;
        text.position.z = 360;
        text.position.y = 150;
        // text.position.x = 140;
        // text.position.z = 160;
        // text.position.y = 80;
        this._scene.add(text);

        this._text = text;
        //---------------adding instruction text-----------
        const inShapes = font.generateShapes("use Arrow keys to move\nand\nhold Shift to run", 2);
        const inGeometry = new THREE.ShapeGeometry(inShapes);

        const inText = new THREE.Mesh(inGeometry, matLite);
        inText.rotateY(110);
        // inText.position.x = -70;
        // inText.position.z = 160;
        // inText.position.y = 50;
        inText.position.x = -40;
        inText.position.z = 70;
        inText.position.y = 18;
        this._scene.add(inText);

        //----------loading 3d text----------------
        const textGeometry = new TextGeometry(
          "B.Suraj\n   Software Developer",
          {
            font: font3d,
            size: 4,
            height: 0.2,
            curveSegments: 10,
            bevelEnabled: true,
            bevelThickness: 0.26,
            bevelSize: 0.26,
            bevelOffset: 0,
            bevelSegments: 5,
          }
        );

        const tM = new THREE.MeshPhongMaterial({
          // color: 0xff6458a7,
          color: 0x504685,
          opacity: 0.84,
          transparent: true,
        });

        const nameText = new THREE.Mesh(textGeometry, tM);
        nameText.rotateY(110);
        nameText.position.x = 15;
        nameText.position.y = 17;
        nameText.position.z = 20;

        this._scene.add(nameText);
      });
    }); //end load function
  }

  _LoadAnimatedModel() {
    const params = {
      camera: this._camera,
      scene: this._scene,
    };
    this._controls = new BasicCharacterController(params);
    this._thirdPersonCamera = new ThirdPersonCamera({
      camera: this._camera,
      target: this._controls,
    });
  }

  // _LoadAnimatedModel() {
  //   const loader = new FBXLoader();
  //   loader.setPath("./resources/character/");
  //   loader.load("stand3.fbx", (fbx) => {
  //     fbx.scale.setScalar(0.1);
  //     // console.log(fbx);
  //     // console.log(fbx.children[0]);
  //     // fbx.children[0].material.opacity = 1.5;
  //     fbx.children[0].material.transparent = false;
  //     fbx.traverse((c) => {
  //       c.castShadow = true;
  //     });

  //     const params = {
  //       target: fbx,
  //       camera: this._camera,
  //     };
  //     //this._controls = new BasicCharacterControllerDemo(params);
  //     this._controls = new BasicCharacterController(params);

  //     const anim = new FBXLoader();
  //     anim.setPath("./resources/character/");
  //     anim.load("walk3.fbx", (anim) => {
  //       const m = new THREE.AnimationMixer(fbx);
  //       this._mixers.push(m);
  //       const idle = m.clipAction(anim.animations[0]);
  //       idle.play();
  //     });
  //     this._scene.add(fbx);
  //   });
  // }

  // _LoadAnimatedModelAndPlay(path, modelFile, animFile, offset) {
  //   const loader = new FBXLoader();
  //   loader.setPath(path);
  //   loader.load(modelFile, (fbx) => {
  //     fbx.scale.setScalar(0.1);
  //     fbx.traverse((c) => {
  //       c.castShadow = true;
  //     });
  //     fbx.position.copy(offset);

  //     const anim = new FBXLoader();
  //     anim.setPath(path);
  //     anim.load(animFile, (anim) => {
  //       const m = new THREE.AnimationMixer(fbx);
  //       this._mixers.push(m);
  //       const idle = m.clipAction(anim.animations[0]);
  //       idle.play();
  //     });
  //     this._scene.add(fbx);
  //   });
  // }

  _OnWindowResize() {
    this._camera.aspect = window.innerWidth / window.innerHeight;
    this._camera.updateProjectionMatrix();
    this._threejs.setSize(window.innerWidth, window.innerHeight);
  }

  _RAF() {
    window.requestAnimationFrame((t) => {
      if (this._previousRAF === null) {
        this._previousRAF = t;
      }
      // this._raycaster.setFromCamera(this.mouse, this._camera);

      this._RAF();

      this._threejs.render(this._scene, this._camera);

      this._Step(t - this._previousRAF);
      this._previousRAF = t;

      //mouse event ray caster
      this._raycaster.setFromCamera(this._mouse, this._camera);
      // const inter = this._raycaster.intersectObject(this._text);
      // console.log(inter);
      // console.log(this._text);
    });
  }

  _Step(timeElapsed) {
    const timeElapsedS = timeElapsed * 0.001;
    if (this._mixers) {
      this._mixers.map((m) => m.update(timeElapsedS));
    }

    if (this._controls) {
      this._controls.Update(timeElapsedS);
    }
    this._thirdPersonCamera.Update(timeElapsedS);

    //ammo code......
    // this.physicsWorld_.stepSimulation(timeElapsedS, 10);
  }
}

// window.addEventListener("DOMContentLoaded", async () => {
//   Ammo().then((lib) => {
//     Ammo = lib;
//     _APP = new World();
//   });

//old code
let _APP = null;

window.addEventListener("DOMContentLoaded", () => {
  _APP = new World();
});

// });

// function _LerpOverFrames(frames, t) {
//   const s = new THREE.Vector3(0, 0, 0);
//   const e = new THREE.Vector3(100, 0, 0);
//   const c = s.clone();

//   for (let i = 0; i < frames; i++) {
//     c.lerp(e, t);
//   }
//   return c;
// }

// function _TestLerp(t1, t2) {
//   const v1 = _LerpOverFrames(100, t1);
//   const v2 = _LerpOverFrames(50, t2);
//   console.log(v1.x + " | " + v2.x);
// }

// _TestLerp(0.01, 0.01);
// _TestLerp(1.0 / 100.0, 1.0 / 50.0);
// _TestLerp(1.0 - Math.pow(0.3, 1.0 / 100.0), 1.0 - Math.pow(0.3, 1.0 / 50.0));
