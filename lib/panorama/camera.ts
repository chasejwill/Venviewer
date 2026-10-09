const TWO_PI = Math.PI * 2;

export const MIN_FOV = 35;
export const MAX_FOV = 110;
export const MAX_PITCH = (85 * Math.PI) / 180;

const SETTLED_ANGLE = 0.002;
const SETTLED_FOV = 0.15;

export type CameraState = {
  yaw: number;
  pitch: number;
  fov: number;
};

export function normalizeRadians(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return ((((value + Math.PI) % TWO_PI) + TWO_PI) % TWO_PI) - Math.PI;
}

export function shortestAngleDelta(from: number, to: number): number {
  return normalizeRadians(to - from);
}

export function clampPitch(pitch: number): number {
  if (!Number.isFinite(pitch)) return 0;
  return Math.min(MAX_PITCH, Math.max(-MAX_PITCH, pitch));
}

export function clampFov(fov: number): number {
  if (!Number.isFinite(fov)) return 75;
  return Math.min(MAX_FOV, Math.max(MIN_FOV, fov));
}

export function clampCamera(state: CameraState): CameraState {
  return {
    yaw: normalizeRadians(state.yaw),
    pitch: clampPitch(state.pitch),
    fov: clampFov(state.fov),
  };
}

function approach(current: number, delta: number, lambda: number, dt: number) {
  const blend = 1 - Math.exp(-lambda * Math.max(0, dt));
  return current + delta * blend;
}

export function motionLambda(reducedMotion: boolean): number {
  return reducedMotion ? 18 : 6;
}

export function isCameraSettled(current: CameraState, target: CameraState) {
  return (
    Math.abs(shortestAngleDelta(current.yaw, target.yaw)) < SETTLED_ANGLE &&
    Math.abs(current.pitch - target.pitch) < SETTLED_ANGLE &&
    Math.abs(current.fov - target.fov) < SETTLED_FOV
  );
}

/**
 * Camera rig used by the panorama runtime. User input cancels automated
 * movement immediately and keeps the current view.
 */
export class CameraRig {
  state: CameraState;
  private target: CameraState;
  private automated = false;

  constructor(initial: CameraState) {
    this.state = clampCamera(initial);
    this.target = { ...this.state };
  }

  get isAutomated() {
    return this.automated;
  }

  snap(next: CameraState) {
    this.state = clampCamera(next);
    this.target = { ...this.state };
    this.automated = false;
  }

  lookToward(next: Partial<CameraState>, automated = true) {
    this.target = clampCamera({
      yaw: next.yaw ?? this.target.yaw,
      pitch: next.pitch ?? this.target.pitch,
      fov: next.fov ?? this.target.fov,
    });
    this.automated = automated;
  }

  interrupt() {
    this.target = { ...this.state };
    this.automated = false;
  }

  applyUserLook(deltaYaw: number, deltaPitch: number) {
    this.interrupt();
    this.snap({
      yaw: this.state.yaw + deltaYaw,
      pitch: this.state.pitch + deltaPitch,
      fov: this.state.fov,
    });
  }

  applyUserZoom(deltaFov: number) {
    this.interrupt();
    this.snap({ ...this.state, fov: this.state.fov + deltaFov });
  }

  tick(dt: number, reducedMotion: boolean): CameraState {
    const lambda = motionLambda(reducedMotion);
    const next = clampCamera({
      yaw: approach(
        this.state.yaw,
        shortestAngleDelta(this.state.yaw, this.target.yaw),
        lambda,
        dt,
      ),
      pitch: approach(
        this.state.pitch,
        this.target.pitch - this.state.pitch,
        lambda,
        dt,
      ),
      fov: approach(
        this.state.fov,
        this.target.fov - this.state.fov,
        lambda,
        dt,
      ),
    });
    if (isCameraSettled(next, this.target)) {
      this.state = { ...this.target };
      this.automated = false;
    } else {
      this.state = next;
    }
    return this.state;
  }
}

/** Dragging the panorama follows the pointer: the image moves with the hand. */
export function lookDeltaFromDrag(
  dxPx: number,
  dyPx: number,
  fovDegrees: number,
  viewportHeightPx: number,
) {
  const radiansPerPixel =
    (clampFov(fovDegrees) * Math.PI) / 180 / Math.max(1, viewportHeightPx);
  return {
    yaw: -dxPx * radiansPerPixel,
    pitch: -dyPx * radiansPerPixel,
  };
}

export function fovDeltaFromWheel(deltaY: number): number {
  const clamped = Math.max(-120, Math.min(120, deltaY));
  return clamped * 0.02;
}

export function keyboardLookStep(fovDegrees: number): number {
  return ((clampFov(fovDegrees) * Math.PI) / 180) * 0.08;
}

export function fovDeltaFromPinch(
  previousDistance: number,
  nextDistance: number,
): number {
  if (
    !Number.isFinite(previousDistance) ||
    !Number.isFinite(nextDistance) ||
    previousDistance <= 0 ||
    nextDistance <= 0
  ) {
    return 0;
  }
  return (previousDistance / nextDistance - 1) * 40;
}
