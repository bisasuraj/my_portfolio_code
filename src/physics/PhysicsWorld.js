import * as CANNON from 'cannon-es';
import * as THREE from 'three';

export class PhysicsWorld {
  constructor() {
    // Create physics world with gravity
    this.world = new CANNON.World({
      gravity: new CANNON.Vec3(0, -9.82, 0)
    });

    // Improve performance
    this.world.broadphase = new CANNON.SAPBroadphase(this.world);
    this.world.allowSleep = true;

    // Store bodies and their corresponding Three.js meshes
    this.bodies = [];
    this.meshes = [];

    // Create ground plane
    this._createGround();
  }

  _createGround() {
    const groundBody = new CANNON.Body({
      type: CANNON.Body.STATIC,
      shape: new CANNON.Plane()
    });

    // Rotate to match Three.js ground plane
    groundBody.quaternion.setFromEuler(-Math.PI / 2, 0, 0);
    this.world.addBody(groundBody);
  }

  // Add a physics box with corresponding Three.js mesh
  addBox(position, size, mass = 1, scene, text = null) {
    // Create Three.js mesh
    const geometry = new THREE.BoxGeometry(size.x, size.y, size.z);
    const material = new THREE.MeshStandardMaterial({
      color: 0x8b4513,
      roughness: 0.7,
      metalness: 0.1
    });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.position.copy(position);
    scene.add(mesh);

    // Add text label if provided
    if (text) {
      this._addTextToBox(mesh, text, scene);
    }

    // Create Cannon.js body
    const shape = new CANNON.Box(new CANNON.Vec3(size.x / 2, size.y / 2, size.z / 2));
    const body = new CANNON.Body({
      mass: mass,
      shape: shape,
      position: new CANNON.Vec3(position.x, position.y, position.z)
    });

    // Add friction and restitution for realistic interaction
    body.material = new CANNON.Material({
      friction: 0.5,
      restitution: 0.3
    });

    this.world.addBody(body);

    // Store references
    this.bodies.push(body);
    this.meshes.push(mesh);

    return { body, mesh };
  }

  _addTextToBox(box, text, scene) {
    // Create canvas for text texture
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');

    // Draw background
    ctx.fillStyle = '#8b4513';
    ctx.fillRect(0, 0, 512, 512);

    // Draw text
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 40px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // Split text into lines
    const lines = text.split('\n');
    const lineHeight = 50;
    const startY = 256 - ((lines.length - 1) * lineHeight) / 2;

    lines.forEach((line, i) => {
      ctx.fillText(line, 256, startY + i * lineHeight);
    });

    // Create texture and material
    const texture = new THREE.CanvasTexture(canvas);
    const textMaterial = new THREE.MeshBasicMaterial({
      map: texture,
      transparent: true
    });

    // Create plane for each face of the box
    const planeGeometry = new THREE.PlaneGeometry(box.geometry.parameters.width * 0.98, box.geometry.parameters.height * 0.98);

    // Front face
    const frontPlane = new THREE.Mesh(planeGeometry, textMaterial);
    frontPlane.position.z = box.geometry.parameters.depth / 2 + 0.01;
    box.add(frontPlane);

    // Back face
    const backPlane = new THREE.Mesh(planeGeometry, textMaterial);
    backPlane.position.z = -box.geometry.parameters.depth / 2 - 0.01;
    backPlane.rotation.y = Math.PI;
    box.add(backPlane);

    // Side faces with rotated text
    const sidePlane1 = new THREE.Mesh(planeGeometry, textMaterial);
    sidePlane1.position.x = box.geometry.parameters.width / 2 + 0.01;
    sidePlane1.rotation.y = Math.PI / 2;
    box.add(sidePlane1);

    const sidePlane2 = new THREE.Mesh(planeGeometry, textMaterial);
    sidePlane2.position.x = -box.geometry.parameters.width / 2 - 0.01;
    sidePlane2.rotation.y = -Math.PI / 2;
    box.add(sidePlane2);
  }

  // Add a physics sphere for character collision
  addCharacterCollider(character, radius = 1.2) {
    const shape = new CANNON.Sphere(radius);
    const body = new CANNON.Body({
      mass: 0, // Make it kinematic
      type: CANNON.Body.KINEMATIC,
      shape: shape,
      position: new CANNON.Vec3(
        character._position.x,
        character._position.y + radius,
        character._position.z
      ),
      collisionResponse: true
    });

    body.material = new CANNON.Material({
      friction: 0.3,
      restitution: 0.0
    });

    this.world.addBody(body);

    return body;
  }

  // Update physics simulation
  update(deltaTime) {
    // Step the physics world with fixed timestep
    const fixedTimeStep = 1.0 / 60.0;
    this.world.step(fixedTimeStep, deltaTime, 3);

    // Sync Three.js meshes with Cannon.js bodies
    for (let i = 0; i < this.bodies.length; i++) {
      this.meshes[i].position.copy(this.bodies[i].position);
      this.meshes[i].quaternion.copy(this.bodies[i].quaternion);
    }
  }

  // Sync character physics body with character position
  syncCharacterBody(body, character) {
    if (character._target) {
      // Store previous position
      if (!body.previousPosition) {
        body.previousPosition = body.position.clone();
      }

      const oldPos = body.previousPosition.clone();

      // Update position - match the radius (1.2)
      body.position.x = character._target.position.x;
      body.position.z = character._target.position.z;
      body.position.y = character._target.position.y + 1.2;

      // Calculate velocity for kinematic body
      const dt = 1.0 / 60.0;
      body.velocity.x = (body.position.x - oldPos.x) / dt;
      body.velocity.z = (body.position.z - oldPos.z) / dt;
      body.velocity.y = 0;

      // Update previous position
      body.previousPosition.copy(body.position);
    }
  }

  // Get interactable physics objects (for mouse interaction)
  getInteractableObjects() {
    return this.meshes;
  }

  // Apply force to a body (for dragging)
  applyForceToBody(body, force) {
    body.applyForce(new CANNON.Vec3(force.x, force.y, force.z), body.position);
  }

  // Get body from mesh
  getBodyFromMesh(mesh) {
    const index = this.meshes.indexOf(mesh);
    return index !== -1 ? this.bodies[index] : null;
  }
}
