import { World } from './core/World.js';

// ==========================================
// APPLICATION STARTUP
// ==========================================
let _APP = null;

window.addEventListener("DOMContentLoaded", () => {
  console.log("Starting 3D Character Controller Application...");
  _APP = new World();
  console.log("Application started successfully!");
});