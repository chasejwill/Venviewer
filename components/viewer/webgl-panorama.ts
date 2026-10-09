import type { CameraState } from "@/lib/panorama/camera";
import { fetchPanoramaBlob } from "@/lib/panorama/load-image";
import type {
  PanoramaBackend,
  TextureResource,
  ViewportSize,
} from "@/lib/panorama/session";

const VERTEX_SOURCE = `
attribute vec2 aPosition;
varying vec2 vNdc;
void main() {
  vNdc = aPosition;
  gl_Position = vec4(aPosition, 0.0, 1.0);
}
`;

const FRAGMENT_SOURCE = `
precision highp float;
uniform sampler2D uTexture;
uniform vec2 uResolution;
uniform float uYaw;
uniform float uPitch;
uniform float uFov;
varying vec2 vNdc;

void main() {
  float aspect = uResolution.x / max(uResolution.y, 1.0);
  float tanHalf = tan(radians(uFov) * 0.5);
  vec3 ray = normalize(vec3(vNdc.x * tanHalf * aspect, vNdc.y * tanHalf, -1.0));
  float cp = cos(uPitch);
  float sp = sin(uPitch);
  vec3 pitched = vec3(ray.x, ray.y * cp - ray.z * sp, ray.y * sp + ray.z * cp);
  float cy = cos(uYaw);
  float sy = sin(uYaw);
  vec3 world = vec3(
    pitched.x * cy - pitched.z * sy,
    pitched.y,
    pitched.x * sy + pitched.z * cy
  );
  float lon = atan(world.x, -world.z);
  float lat = asin(clamp(world.y, -1.0, 1.0));
  vec2 uv = vec2(lon / 6.283185307179586 + 0.5, lat / 3.141592653589793 + 0.5);
  gl_FragColor = texture2D(uTexture, uv);
}
`;

class WebGlTexture implements TextureResource {
  constructor(
    readonly id: string,
    readonly url: string,
    readonly texture: WebGLTexture,
    private readonly gl: WebGLRenderingContext,
  ) {}

  dispose() {
    this.gl.deleteTexture(this.texture);
  }
}

export class WebGlPanoramaBackend implements PanoramaBackend {
  private gl: WebGLRenderingContext | null = null;
  private program: WebGLProgram | null = null;
  private buffer: WebGLBuffer | null = null;
  private positionLocation = -1;
  private lost = false;

  constructor(
    private readonly canvas: HTMLCanvasElement,
    private readonly reportError: (message: string) => void,
  ) {
    const gl = canvas.getContext("webgl", {
      alpha: false,
      antialias: false,
      depth: false,
      stencil: false,
      powerPreference: "high-performance",
    });
    if (!gl) {
      this.reportError("This browser cannot display the spatial viewer.");
      return;
    }
    this.gl = gl;
    canvas.addEventListener("webglcontextlost", this.onContextLost);
    try {
      this.program = createProgram(gl, VERTEX_SOURCE, FRAGMENT_SOURCE);
    } catch {
      this.reportError("This browser cannot display the spatial viewer.");
      return;
    }
    const buffer = gl.createBuffer();
    if (!buffer) {
      this.reportError("This browser cannot display the spatial viewer.");
      return;
    }
    this.buffer = buffer;
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([-1, -1, 3, -1, -1, 3]),
      gl.STATIC_DRAW,
    );
    this.positionLocation = gl.getAttribLocation(this.program, "aPosition");
  }

  async load(
    url: string,
    onProgress?: (ratio: number | null) => void,
  ): Promise<TextureResource> {
    const gl = this.gl;
    if (!gl || !this.program || this.lost) {
      throw new Error("The viewer is unavailable.");
    }
    const blob = await fetchPanoramaBlob(url, fetch, onProgress);
    let bitmap: ImageBitmap;
    try {
      bitmap = await createImageBitmap(blob);
    } catch {
      throw new Error("This panorama could not be decoded.");
    }
    const maxSize = gl.getParameter(gl.MAX_TEXTURE_SIZE) as number;
    const source = await limitTextureSize(bitmap, maxSize);
    const texture = gl.createTexture();
    if (!texture) {
      bitmap.close();
      throw new Error("Unable to prepare this view.");
    }
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, source);
    if (source !== bitmap) bitmap.close();
    if ("close" in source) source.close();
    return new WebGlTexture(url, url, texture, gl);
  }

  draw(texture: TextureResource, camera: CameraState, size: ViewportSize) {
    const gl = this.gl;
    if (!gl || !this.program || !this.buffer || this.lost) return;
    if (!(texture instanceof WebGlTexture)) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const width = Math.max(1, Math.round(size.width * dpr));
    const height = Math.max(1, Math.round(size.height * dpr));
    if (this.canvas.width !== width || this.canvas.height !== height) {
      this.canvas.width = width;
      this.canvas.height = height;
    }
    gl.viewport(0, 0, width, height);
    gl.useProgram(this.program);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.buffer);
    gl.enableVertexAttribArray(this.positionLocation);
    gl.vertexAttribPointer(this.positionLocation, 2, gl.FLOAT, false, 0, 0);
    gl.uniform2f(
      gl.getUniformLocation(this.program, "uResolution"),
      width,
      height,
    );
    gl.uniform1f(gl.getUniformLocation(this.program, "uYaw"), camera.yaw);
    gl.uniform1f(gl.getUniformLocation(this.program, "uPitch"), camera.pitch);
    gl.uniform1f(gl.getUniformLocation(this.program, "uFov"), camera.fov);
    gl.uniform1i(gl.getUniformLocation(this.program, "uTexture"), 0);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, texture.texture);
    gl.clearColor(0.05, 0.067, 0.082, 1);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }

  dispose() {
    this.canvas.removeEventListener("webglcontextlost", this.onContextLost);
    const gl = this.gl;
    if (!gl) return;
    if (this.buffer) gl.deleteBuffer(this.buffer);
    if (this.program) gl.deleteProgram(this.program);
    this.buffer = null;
    this.program = null;
    this.gl = null;
  }

  private onContextLost = (event: Event) => {
    event.preventDefault();
    this.lost = true;
    this.reportError("The viewer was interrupted. Reload to continue.");
  };
}

async function limitTextureSize(bitmap: ImageBitmap, maxSize: number) {
  if (
    !Number.isFinite(maxSize) ||
    maxSize < 1 ||
    (bitmap.width <= maxSize && bitmap.height <= maxSize)
  ) {
    return bitmap;
  }
  const scale = maxSize / Math.max(bitmap.width, bitmap.height);
  return createImageBitmap(bitmap, {
    resizeWidth: Math.max(1, Math.round(bitmap.width * scale)),
    resizeHeight: Math.max(1, Math.round(bitmap.height * scale)),
    resizeQuality: "medium",
  });
}

function createProgram(
  gl: WebGLRenderingContext,
  vertexSource: string,
  fragmentSource: string,
) {
  const vertex = compileShader(gl, gl.VERTEX_SHADER, vertexSource);
  const fragment = compileShader(gl, gl.FRAGMENT_SHADER, fragmentSource);
  const program = gl.createProgram();
  if (!program) throw new Error("Unable to create the viewer program.");
  gl.attachShader(program, vertex);
  gl.attachShader(program, fragment);
  gl.linkProgram(program);
  gl.deleteShader(vertex);
  gl.deleteShader(fragment);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    const log = gl.getProgramInfoLog(program);
    gl.deleteProgram(program);
    throw new Error(log || "Unable to link the viewer program.");
  }
  return program;
}

function compileShader(
  gl: WebGLRenderingContext,
  type: number,
  source: string,
) {
  const shader = gl.createShader(type);
  if (!shader) throw new Error("Unable to create a viewer shader.");
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    const log = gl.getShaderInfoLog(shader);
    gl.deleteShader(shader);
    throw new Error(log || "Unable to compile a viewer shader.");
  }
  return shader;
}
