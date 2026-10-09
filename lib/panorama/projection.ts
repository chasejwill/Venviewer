/**
 * Equirectangular lookup for a camera ray.
 * The WebGL fragment shader in `components/viewer/webgl-panorama.ts` must use
 * this same yaw, pitch, and field-of-view convention.
 * Yaw and pitch are radians. Field of view is vertical degrees.
 * ndcX and ndcY are -1..1 with positive ndcY upward.
 */
export function projectEquirectangular(
  yaw: number,
  pitch: number,
  fovDegrees: number,
  aspect: number,
  ndcX: number,
  ndcY: number,
) {
  const tanHalf = Math.tan(((fovDegrees * Math.PI) / 180) * 0.5);
  const x = ndcX * tanHalf * aspect;
  const y = ndcY * tanHalf;
  const z = -1;
  const length = Math.hypot(x, y, z) || 1;
  const rayX = x / length;
  const rayY = y / length;
  const rayZ = z / length;
  const cp = Math.cos(pitch);
  const sp = Math.sin(pitch);
  const pitchedX = rayX;
  const pitchedY = rayY * cp - rayZ * sp;
  const pitchedZ = rayY * sp + rayZ * cp;
  const cy = Math.cos(yaw);
  const sy = Math.sin(yaw);
  const worldX = pitchedX * cy - pitchedZ * sy;
  const worldY = pitchedY;
  const worldZ = pitchedX * sy + pitchedZ * cy;
  const lon = Math.atan2(worldX, -worldZ);
  const lat = Math.asin(Math.min(1, Math.max(-1, worldY)));
  let u = lon / (Math.PI * 2) + 0.5;
  u = ((u % 1) + 1) % 1;
  return {
    u,
    v: lat / Math.PI + 0.5,
  };
}
