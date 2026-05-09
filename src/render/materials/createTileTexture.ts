import * as THREE from "three";

export function createTileTexture(base: string, accent: string): THREE.CanvasTexture {
  const size = 128;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;

  const context = canvas.getContext("2d");
  if (!context) {
    throw new Error("Canvas 2D context is unavailable.");
  }

  context.fillStyle = base;
  context.fillRect(0, 0, size, size);

  context.globalAlpha = 0.16;
  context.fillStyle = accent;
  let seed = hashString(`${base}:${accent}`);
  for (let i = 0; i < 32; i += 1) {
    seed = nextSeed(seed);
    const x = (seed % size) + 0.5;
    seed = nextSeed(seed);
    const y = (seed % size) + 0.5;
    seed = nextSeed(seed);
    const length = 2 + (seed % 5);
    context.fillRect(x, y, length, 1);
  }

  context.globalAlpha = 0.18;
  context.strokeStyle = "#fff6d0";
  context.lineWidth = 2;
  context.strokeRect(2, 2, size - 4, size - 4);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.generateMipmaps = true;
  texture.anisotropy = 2;
  return texture;
}

function hashString(value: string): number {
  let hash = 2166136261;
  for (let i = 0; i < value.length; i += 1) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function nextSeed(seed: number): number {
  return (Math.imul(seed, 1664525) + 1013904223) >>> 0;
}
