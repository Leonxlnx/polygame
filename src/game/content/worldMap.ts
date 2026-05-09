export const WORLD_SIZE = 1440;
export const OPENING_PATH_START_Z = -38.35;

export type BiomeId = "village" | "meadow" | "pineForest" | "highland" | "wetland";

export function terrainHeight(x: number, z: number): number {
  const biome = biomeAt(x, z);
  const base = (fbm(x * 0.06, z * 0.06) - 0.5) * 0.055;
  const broad = (smoothNoise(x * 0.018 + 9.1, z * 0.018 - 4.7) - 0.5) * 0.1;

  if (biome === "highland") {
    return base + broad + 0.06;
  }

  if (biome === "wetland") {
    return base * 0.45 - 0.035;
  }

  return base + broad * 0.35;
}

export function pathCenterX(z: number): number {
  return -z * 0.08 + Math.sin(z * 0.043) * 8.4 + Math.sin(z * 0.103 + 1.6) * 2.4 + Math.sin(z * 0.017 - 0.4) * 3.2;
}

export function pathWidthAt(z: number): number {
  return 5.35 + (smoothNoise(z * 0.044, 12.7) - 0.5) * 1.15 + (smoothNoise(z * 0.16, -4.8) - 0.5) * 0.42;
}

export function biomeAt(x: number, z: number): BiomeId {
  const distanceFromStart = Math.hypot(x + 5, z - 2);
  const pathDistance = Math.abs(x - pathCenterX(z));

  if (distanceFromStart < 23 || (z > -18 && z < 26 && pathDistance < pathWidthAt(z) + 13)) {
    return "village";
  }

  if (z < -46 && x < 46) {
    return "pineForest";
  }

  if (x > 44 || z > 92) {
    return "highland";
  }

  if (x < -40 && z > 28) {
    return "wetland";
  }

  return "meadow";
}

export function biomeLabel(biome: BiomeId): string {
  switch (biome) {
    case "village":
      return "First Camp";
    case "meadow":
      return "Greenmeadow";
    case "pineForest":
      return "Pinewood";
    case "highland":
      return "Stone Rise";
    case "wetland":
      return "Reedfen";
  }
}

export function fbm(x: number, z: number): number {
  return (
    smoothNoise(x, z) * 0.55 +
    smoothNoise(x * 2.07 + 18.3, z * 2.07 - 6.2) * 0.3 +
    smoothNoise(x * 4.13 - 24.1, z * 4.13 + 10.6) * 0.15
  );
}

export function smoothNoise(x: number, z: number): number {
  const x0 = Math.floor(x);
  const z0 = Math.floor(z);
  const tx = fade(x - x0);
  const tz = fade(z - z0);
  const a = valueNoise(x0, z0);
  const b = valueNoise(x0 + 1, z0);
  const c = valueNoise(x0, z0 + 1);
  const d = valueNoise(x0 + 1, z0 + 1);
  return lerp(lerp(a, b, tx), lerp(c, d, tx), tz);
}

export function valueNoise(x: number, z: number): number {
  let seed = Math.imul(x, 374761393) ^ Math.imul(z, 668265263) ^ 0x9e3779b9;
  seed = Math.imul(seed ^ (seed >>> 13), 1274126177);
  return ((seed ^ (seed >>> 16)) >>> 0) / 4294967295;
}

function fade(value: number): number {
  return value * value * (3 - 2 * value);
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}
