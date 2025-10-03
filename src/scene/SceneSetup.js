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

    // Night sky gradient with richer colors
    const skyGeometry = new THREE.SphereGeometry(600, 32, 32);
    const skyMaterial = new THREE.ShaderMaterial({
      uniforms: {
        topColor: { value: new THREE.Color(0x000814) },    // Deep midnight blue
        bottomColor: { value: new THREE.Color(0x1a3a52) }, // Horizon blue
        offset: { value: 33 },
        exponent: { value: 0.6 }
      },
      vertexShader: `
        varying vec3 vWorldPosition;
        void main() {
          vec4 worldPosition = modelMatrix * vec4(position, 1.0);
          vWorldPosition = worldPosition.xyz;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform vec3 topColor;
        uniform vec3 bottomColor;
        uniform float offset;
        uniform float exponent;
        varying vec3 vWorldPosition;
        void main() {
          float h = normalize(vWorldPosition + offset).y;
          gl_FragColor = vec4(mix(bottomColor, topColor, max(pow(max(h, 0.0), exponent), 0.0)), 1.0);
        }
      `,
      side: THREE.BackSide
    });
    const sky = new THREE.Mesh(skyGeometry, skyMaterial);
    scene.add(sky);

    // Create stars with varied brightness
    const starGeometry = new THREE.BufferGeometry();
    const starCount = 1500;
    const positions = new Float32Array(starCount * 3);
    const sizes = new Float32Array(starCount);
    const brightness = new Float32Array(starCount);

    for (let i = 0; i < starCount; i++) {
      // Random position on a sphere
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos((Math.random() * 2) - 1);
      const radius = 400 + Math.random() * 50;

      positions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
      positions[i * 3 + 2] = radius * Math.cos(phi);

      // Varied star sizes - some bigger, some smaller
      sizes[i] = Math.random() * 3 + 1;

      // Varied brightness - most bright, some dimmer for depth
      brightness[i] = 0.5 + Math.random() * 0.5;
    }

    starGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    starGeometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
    starGeometry.setAttribute('brightness', new THREE.BufferAttribute(brightness, 1));

    const starMaterial = new THREE.ShaderMaterial({
      uniforms: {
        color: { value: new THREE.Color(0xffffff) }
      },
      vertexShader: `
        attribute float size;
        attribute float brightness;
        varying float vBrightness;
        void main() {
          vBrightness = brightness;
          vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
          gl_PointSize = size * (300.0 / -mvPosition.z);
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: `
        varying float vBrightness;
        void main() {
          float r = distance(gl_PointCoord, vec2(0.5, 0.5));
          if (r > 0.5) discard;

          // Brighter core with soft glow
          float alpha = 1.0 - smoothstep(0.0, 0.5, r);
          float glow = pow(1.0 - r * 2.0, 3.0);

          vec3 color = vec3(1.0) * (vBrightness + glow * 0.5);
          gl_FragColor = vec4(color, alpha * vBrightness);
        }
      `,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending
    });

    const stars = new THREE.Points(starGeometry, starMaterial);
    scene.add(stars);

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