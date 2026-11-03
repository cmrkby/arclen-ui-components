/** Original volumetric gradient field. The moving third coordinate changes local
 * extrema continuously instead of crossfading two fixed sets of islands. */
export function createVolumeNoise(seed: number): (x: number, y: number, z: number) => number {
  let state = (Math.floor(seed) + 0x9e3779b9) >>> 0;
  const random = () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let mixed = state;
    mixed = Math.imul(mixed ^ (mixed >>> 16), 0x21f0aaad);
    mixed = Math.imul(mixed ^ (mixed >>> 15), 0x735a2d97);
    return ((mixed ^ (mixed >>> 15)) >>> 0) / 4294967296;
  };
  const permutation = new Uint16Array(512), gx = new Float32Array(256), gy = new Float32Array(256), gz = new Float32Array(256);
  for (let i = 0; i < 256; i++) {
    permutation[i] = i;
    const z = random() * 2 - 1, angle = random() * Math.PI * 2, radius = Math.sqrt(1 - z * z);
    gx[i] = radius * Math.cos(angle); gy[i] = radius * Math.sin(angle); gz[i] = z;
  }
  for (let i = 255; i > 0; i--) {const j = Math.floor(random() * (i + 1)), value = permutation[i]; permutation[i] = permutation[j]; permutation[j] = value;}
  for (let i = 0; i < 256; i++) permutation[i + 256] = permutation[i];
  const fade = (v: number) => v * v * v * (v * (v * 6 - 15) + 10);
  const dot = (hash: number, x: number, y: number, z: number) => gx[hash] * x + gy[hash] * y + gz[hash] * z;
  return (x, y, z) => {
    const ix = Math.floor(x), iy = Math.floor(y), iz = Math.floor(z);
    const fx = x - ix, fy = y - iy, fz = z - iz;
    const u = fade(fx), v = fade(fy), w = fade(fz);
    const pz = permutation[iz & 255], qz = permutation[(iz + 1) & 255];
    const a = permutation[(iy & 255) + pz], b = permutation[((iy + 1) & 255) + pz];
    const c = permutation[(iy & 255) + qz], d = permutation[((iy + 1) & 255) + qz];
    const px = ix & 255, qx = (ix + 1) & 255;
    const a0 = dot(permutation[px + a], fx, fy, fz), a1 = dot(permutation[qx + a], fx - 1, fy, fz);
    const b0 = dot(permutation[px + b], fx, fy - 1, fz), b1 = dot(permutation[qx + b], fx - 1, fy - 1, fz);
    const c0 = dot(permutation[px + c], fx, fy, fz - 1), c1 = dot(permutation[qx + c], fx - 1, fy, fz - 1);
    const d0 = dot(permutation[px + d], fx, fy - 1, fz - 1), d1 = dot(permutation[qx + d], fx - 1, fy - 1, fz - 1);
    const front = a0 + (a1 - a0) * u + (b0 + (b1 - b0) * u - a0 - (a1 - a0) * u) * v;
    const back = c0 + (c1 - c0) * u + (d0 + (d1 - d0) * u - c0 - (c1 - c0) * u) * v;
    return (front + (back - front) * w) * 1.8;
  };
}

export function createBasinField(seed: number, seconds: number, warp: (x: number, y: number) => number): (x: number, y: number) => number {
  const noise = createVolumeNoise(seed), time = seconds * 0.12;
  return (x, y) => {
    const wx = warp(x * 0.61 + 23 + seconds * 0.035, y * 0.61 - 11);
    const wy = warp(x * 0.64 - 19, y * 0.64 + 31 - seconds * 0.028);
    const px = x + wx * 0.22, py = y + wy * 0.22;
    return noise(px * 0.8 - py * 0.6 + 11.8, px * 0.6 + py * 0.8 + 7.3, 19.3 + time) * 0.79
      + noise(px * 1.83 + py * 0.86 - 7.8, -px * 0.86 + py * 1.83 + 4.1, -7.7 + time * 1.7) * 0.17
      + noise(px * 3.21 - py * 2.40 + 5.4, px * 2.40 + py * 3.21 - 2.6, 3.4 - time * 2.3) * 0.04;
  };
}
