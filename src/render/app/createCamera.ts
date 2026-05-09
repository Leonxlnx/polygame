import * as THREE from "three";

export const CAMERA_OFFSET = new THREE.Vector3(13.2, 18.6, 13.8);

export function createCamera(): THREE.OrthographicCamera {
  const camera = new THREE.OrthographicCamera(-8, 8, 5, -5, 0.1, 100);
  camera.position.copy(CAMERA_OFFSET);
  camera.lookAt(0, 0, 0);
  return camera;
}

export function resizeCamera(camera: THREE.OrthographicCamera, width: number, height: number): void {
  const aspect = width / height;
  const viewHeight = 20.8;
  const viewWidth = viewHeight * aspect;

  camera.left = -viewWidth / 2;
  camera.right = viewWidth / 2;
  camera.top = viewHeight / 2;
  camera.bottom = -viewHeight / 2;
  camera.updateProjectionMatrix();
}
