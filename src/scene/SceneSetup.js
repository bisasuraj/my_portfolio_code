import * as THREE from "three";

export class SceneSetup {
  static createRenderer() {
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    
    renderer.outputEncoding = THREE.sRGBEncoding;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(window.innerWidth, window.innerHeight);

    document.body.appendChild(renderer.domElement);

    return renderer;
  }

  static createCamera() {
    // Increase FOV on mobile to show more of the scene vertically
    const isMobile = window.innerWidth <= 768 || ('ontouchstart' in window);
    const fov = isMobile ? 70 : 60;
    const aspect = window.innerWidth / window.innerHeight;
    const near = 1.0;
    const far = 1000.0;

    const camera = new THREE.PerspectiveCamera(fov, aspect, near, far);
    camera.position.set(25, 10, 10);

    return camera;
  }

  static createScene() {
    const scene = new THREE.Scene();

    // Main directional light
    let light = new THREE.DirectionalLight(0xffffff, 0.2);
    light.position.set(20, 100, 10);
    light.target.position.set(0, 0, 0);
    
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
    scene.add(light);

    // Ambient light
    light = new THREE.AmbientLight(0xffffff, 1);
    scene.add(light);

    return scene;
  }

  static createGround(scene) {
    const plane = new THREE.Mesh(
      new THREE.PlaneGeometry(300, 300, 1, 1),
      new THREE.MeshStandardMaterial({
        color: new THREE.Color(0xae9273)
      })
    );

    plane.castShadow = false;
    plane.receiveShadow = true;
    plane.rotation.x = -Math.PI / 2;
    scene.add(plane);
  }
}