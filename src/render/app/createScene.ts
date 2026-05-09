import * as THREE from "three";

export function createScene(): THREE.Scene {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color("#668548");
  scene.fog = new THREE.Fog("#668548", 78, 158);

  const ambientLight = new THREE.HemisphereLight("#fff0c8", "#2b4c34", 1.62);
  scene.add(ambientLight);

  const sun = new THREE.DirectionalLight("#ffe2a3", 3.45);
  sun.position.set(8.5, 14, 5.5);
  sun.castShadow = true;
  sun.shadow.mapSize.set(4096, 4096);
  sun.shadow.camera.near = 1;
  sun.shadow.camera.far = 42;
  sun.shadow.camera.left = -24;
  sun.shadow.camera.right = 24;
  sun.shadow.camera.top = 24;
  sun.shadow.camera.bottom = -24;
  sun.shadow.bias = -0.00018;
  sun.shadow.normalBias = 0.018;
  scene.add(sun);

  const coolFill = new THREE.DirectionalLight("#9fc9ff", 0.42);
  coolFill.position.set(-8, 8, -6);
  scene.add(coolFill);

  const warmRim = new THREE.DirectionalLight("#f5c477", 0.58);
  warmRim.position.set(-3, 5, 9);
  scene.add(warmRim);

  return scene;
}
