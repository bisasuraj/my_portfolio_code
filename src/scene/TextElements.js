import * as THREE from "three";
import { FontLoader } from "three/examples/jsm/loaders/FontLoader.js";
import { TextGeometry } from "three/examples/jsm/geometries/TextGeometry";

export class TextElements {
  static loadAndCreateText(scene) {
    const loader = new FontLoader();
    
    loader.load("resources/font/optimer_bold.typeface.json", (font3d) => {
      loader.load("resources/font/helvetiker_regular.typeface.json", (font) => {
        TextElements._createWelcomeText(scene, font);
        TextElements._createInstructionText(scene, font);
        TextElements._create3DNameText(scene, font3d);
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

    const message = "Thrilled to have you here. \n\n" +
                   "I'm a full-stack software developer with a love for crafting user-focused software that scales effortlessly. \n" +
                   "With a wide range of skills and experience, I'm constantly driving improvements throughout the product lifecycle. \n" +
                   "I can't wait to show you my professional and personal projects. \n" +
                   "Let's dive in!";

    const shapes = font.generateShapes(message, 11);
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
}