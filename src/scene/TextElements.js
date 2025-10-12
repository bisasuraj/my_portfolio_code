import * as THREE from "three";
import { FontLoader } from "three/examples/jsm/loaders/FontLoader.js";
import { TextGeometry } from "three/examples/jsm/geometries/TextGeometry";

export class TextElements {
  static linkedInIcon = null;
  static linkedInText = null;

  static loadAndCreateText(scene) {
    const loader = new FontLoader();

    loader.load("resources/font/optimer_bold.typeface.json", (font3d) => {
      loader.load("resources/font/helvetiker_regular.typeface.json", (font) => {
        TextElements._createWelcomeText(scene, font);
        TextElements._createInstructionText(scene, font);
        TextElements._create3DNameText(scene, font3d);
        TextElements._createLinkedInSection(scene, font);
      });
    });
  }

  static _createWelcomeText(scene, font) {
    const material = new THREE.MeshBasicMaterial({
      color: 0x67ACA2,
      transparent: true,
      opacity: 0.8,
      side: THREE.DoubleSide,
    });
const message = "Welcome I’m thrilled to have you here! \n\n" +
                "I’m a full-stack software engineer with hands-on experience building scalable, user-focused solutions. \n\n" +
                "Currently at KAL, I work on complex C# systems for global ATM software, where I’ve streamlined debugging, improved testing, and delivered efficient solutions to recurring client issues. \n\n" +
                "Beyond my professional work, I enjoy swimming, cooking, and really enjoyed working on this project. \n\n";  


    const shapes = font.generateShapes(message, 6);
    const geometry = new THREE.ShapeGeometry(shapes);
    const text = new THREE.Mesh(geometry, material);

    text.rotateY(110);
    text.position.set(380, 150, 360);
    scene.add(text);
  }

  static _createInstructionText(scene, font) {
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

    text.rotateY(110);
    text.position.set(-40, 18, 70);
    scene.add(text);
  }

  static _create3DNameText(scene, font3d) {
    const textGeometry = new TextGeometry("B.Suraj\n   Software Developer", {
      font: font3d,
      size: 4,
      height: 0.2,
      curveSegments: 10,
      bevelEnabled: true,
      bevelThickness: 0.26,
      bevelSize: 0.26,
      bevelOffset: 0,
      bevelSegments: 5,
    });
    
    const material = new THREE.MeshPhongMaterial({
      color: 0x504685,
      opacity: 0.84,
      transparent: true,
    });

    const nameText = new THREE.Mesh(textGeometry, material);

    nameText.rotateY(110);
    nameText.position.set(15, 17, 20);
    scene.add(nameText);
  }

static _createLinkedInSection(scene, font) {
  // Create "Check out my LinkedIn here" text
  const textMaterial = new THREE.MeshBasicMaterial({
    color: 0x67ACA2,
    transparent: true,
    opacity: 0.85,
    side: THREE.DoubleSide,
  });

  const message = "Check out my LinkedIn here:";
  const shapes = font.generateShapes(message, 2.5);
  const textGeometry = new THREE.ShapeGeometry(shapes);
  const linkedInText = new THREE.Mesh(textGeometry, textMaterial);

  linkedInText.rotateY(30);
  linkedInText.position.set(115, 30,50);
  scene.add(linkedInText);

  // Store reference for interaction
  TextElements.linkedInText = linkedInText;

  // Create glow texture programmatically
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');

  // Create radial gradient for glow effect
  const gradient = ctx.createRadialGradient(128, 128, 0, 128, 128, 128);
  gradient.addColorStop(0, 'rgba(0, 160, 220, 0.8)');
  gradient.addColorStop(0.5, 'rgba(0, 160, 220, 0.4)');
  gradient.addColorStop(1, 'rgba(0, 160, 220, 0)');

  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 256, 256);

  const glowTexture = new THREE.CanvasTexture(canvas);

  // ✅ LinkedIn icon
  const textureLoader = new THREE.TextureLoader();
  const linkedInTexture = textureLoader.load("resources/linkedin.png");

  const iconMaterial = new THREE.MeshBasicMaterial({
    map: linkedInTexture,
    transparent: true,
    side: THREE.DoubleSide
  });

  const iconGeometry = new THREE.PlaneGeometry(10, 10);
  const iconMesh = new THREE.Mesh(iconGeometry, iconMaterial);

  iconMesh.rotateY(30);
  iconMesh.position.set(115, 30,100);

  // ✅ Glow plane with programmatic texture
  const glowMaterial = new THREE.MeshBasicMaterial({
    map: glowTexture,
    transparent: true,
    opacity: 0,
    side: THREE.DoubleSide,
    depthWrite: false,
    blending: THREE.AdditiveBlending
  });

  const glowGeometry = new THREE.PlaneGeometry(16, 16);
  const glowMesh = new THREE.Mesh(glowGeometry, glowMaterial);
  glowMesh.position.z = -0.2;

  iconMesh.add(glowMesh);
  scene.add(iconMesh);

  // Store references for interaction
  TextElements.linkedInIcon = iconMesh;
  iconMesh.userData.isLinkedInIcon = true;
  iconMesh.userData.url = "https://www.linkedin.com/in/suraj-bisa-b95b2a18a/";
  iconMesh.userData.glow = glowMesh;
  iconMesh.userData.glowMaterial = glowMaterial;
}



  static getInteractableObjects() {
    return TextElements.linkedInIcon ? [TextElements.linkedInIcon] : [];
  }
}