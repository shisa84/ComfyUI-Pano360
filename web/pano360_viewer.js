import { app } from "../../scripts/app.js";
import { api } from "../../scripts/api.js";

const VERT = `#version 300 es
in vec2 p; out vec2 v;
void main() { v = p; gl_Position = vec4(p, 0.0, 1.0); }`;

// same convention as the ERPToViews node: yaw 0 = centre of the panorama, positive = further right
const FRAG = `#version 300 es
precision highp float;
in vec2 v; out vec4 o;
uniform sampler2D pano;
uniform vec3 view;   // yaw, pitch (radians), tan(h_fov / 2)
uniform float aspect;
void main() {
  vec3 d = normalize(vec3(v.x * view.z, v.y * view.z / aspect, 1.0));
  float c = cos(view.y), s = sin(view.y);
  d = vec3(d.x, d.y * c + d.z * s, d.z * c - d.y * s);
  float lon = atan(d.x, d.z) + view.x;
  float lat = asin(clamp(d.y, -1.0, 1.0));
  o = texture(pano, vec2(lon / 6.28318530718 + 0.5, 0.5 - lat / 3.14159265359));
}`;

function addViewer(node) {
  const imageWidget = node.widgets.find((w) => w.name === "image");
  const root = document.createElement("div");
  root.style.cssText = "position:relative;width:100%;height:100%;min-height:200px;background:#111;border-radius:6px;overflow:hidden";
  const canvas = document.createElement("canvas");
  canvas.style.cssText = "width:100%;height:100%;display:block;cursor:grab;touch-action:none";
  const label = document.createElement("div");
  label.style.cssText = "position:absolute;left:6px;bottom:4px;font:11px sans-serif;color:#fff;text-shadow:0 0 3px #000;pointer-events:none";
  root.append(canvas, label);

  const gl = canvas.getContext("webgl2");
  const program = gl.createProgram();
  for (const [type, source] of [[gl.VERTEX_SHADER, VERT], [gl.FRAGMENT_SHADER, FRAG]]) {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    gl.attachShader(program, shader);
  }
  gl.linkProgram(program);
  gl.useProgram(program);
  gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
  const loc = gl.getAttribLocation(program, "p");
  gl.enableVertexAttribArray(loc);
  gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
  gl.bindTexture(gl.TEXTURE_2D, gl.createTexture());
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  const uView = gl.getUniformLocation(program, "view");
  const uAspect = gl.getUniformLocation(program, "aspect");

  const state = { yaw: 0, pitch: 0, fov: 90, loaded: false, pending: false };
  const rad = Math.PI / 180;

  function draw() {
    state.pending = false;
    const w = Math.max(1, Math.round(canvas.clientWidth * devicePixelRatio));
    const h = Math.max(1, Math.round(canvas.clientHeight * devicePixelRatio));
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
    }
    gl.viewport(0, 0, w, h);
    gl.clearColor(0.07, 0.07, 0.07, 1);
    gl.clear(gl.COLOR_BUFFER_BIT);
    if (!state.loaded) return;
    gl.uniform3f(uView, state.yaw * rad, state.pitch * rad, Math.tan((state.fov * rad) / 2));
    gl.uniform1f(uAspect, w / h);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    const yaw = ((((state.yaw + 180) % 360) + 360) % 360) - 180;
    label.textContent = `yaw ${Math.round(yaw)}° · pitch ${Math.round(state.pitch)}° · fov ${Math.round(state.fov)}°`;
  }
  function redraw() {
    if (state.pending) return;
    state.pending = true;
    requestAnimationFrame(draw);
  }

  function load(value) {
    state.loaded = false;
    label.textContent = "";
    redraw();
    if (!value) return;
    const cut = value.lastIndexOf("/");
    const params = new URLSearchParams({ filename: value.slice(cut + 1), subfolder: cut < 0 ? "" : value.slice(0, cut), type: "input" });
    const img = new Image();
    img.onload = () => {
      if (imageWidget.value !== value) return;
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
      state.loaded = true;
      redraw();
    };
    img.src = api.apiURL(`/view?${params}`);
  }

  let drag = null;
  canvas.addEventListener("pointerdown", (e) => {
    e.stopPropagation();
    canvas.setPointerCapture(e.pointerId);
    drag = { x: e.clientX, y: e.clientY };
    canvas.style.cursor = "grabbing";
  });
  canvas.addEventListener("pointermove", (e) => {
    if (!drag) return;
    // the canvas may be shown scaled by the graph zoom: turn by the fraction of the view that was dragged
    const box = canvas.getBoundingClientRect();
    state.yaw -= ((e.clientX - drag.x) / box.width) * state.fov;
    state.pitch += ((e.clientY - drag.y) / box.height) * state.fov * (box.height / box.width);
    state.pitch = Math.max(-89, Math.min(89, state.pitch));
    drag = { x: e.clientX, y: e.clientY };
    redraw();
  });
  const release = () => {
    drag = null;
    canvas.style.cursor = "grab";
  };
  canvas.addEventListener("pointerup", release);
  canvas.addEventListener("pointercancel", release);
  canvas.addEventListener("wheel", (e) => {
    e.preventDefault();
    e.stopPropagation();
    state.fov = Math.max(30, Math.min(120, state.fov + Math.sign(e.deltaY) * 5));
    redraw();
  }, { passive: false });
  canvas.addEventListener("dblclick", (e) => {
    e.stopPropagation();
    Object.assign(state, { yaw: 0, pitch: 0, fov: 90 });
    redraw();
  });
  new ResizeObserver(redraw).observe(root);

  const fileInput = document.createElement("input");
  fileInput.type = "file";
  fileInput.accept = "image/*";
  fileInput.onchange = async () => {
    if (!fileInput.files.length) return;
    const body = new FormData();
    body.append("image", fileInput.files[0]);
    const res = await api.fetchApi("/upload/image", { method: "POST", body });
    fileInput.value = "";
    if (res.status !== 200) return;
    const { name, subfolder } = await res.json();
    const value = subfolder ? `${subfolder}/${name}` : name;
    if (!imageWidget.options.values.includes(value)) imageWidget.options.values.push(value);
    imageWidget.value = value;
    load(value);
  };
  const button = node.addWidget("button", "choose 360 image to upload", null, () => fileInput.click());
  button.serialize = false;
  button.options.serialize = false;

  node.addDOMWidget("viewer", "pano360", root, { serialize: false, hideOnZoom: false, getMinHeight: () => 220 });

  const callback = imageWidget.callback;
  imageWidget.callback = function (value) {
    callback?.apply(this, arguments);
    load(value);
  };
  const onConfigure = node.onConfigure;
  node.onConfigure = function () {
    onConfigure?.apply(this, arguments);
    load(imageWidget.value);
  };
  if (node.size[0] < 380 || node.size[1] < 360) node.setSize([Math.max(node.size[0], 380), Math.max(node.size[1], 360)]);
  load(imageWidget.value);
}

app.registerExtension({
  name: "PerspToERP.Load360Image",
  beforeRegisterNodeDef(nodeType, nodeData) {
    if (nodeData.name !== "Load360Image") return;
    const onNodeCreated = nodeType.prototype.onNodeCreated;
    nodeType.prototype.onNodeCreated = function () {
      onNodeCreated?.apply(this, arguments);
      addViewer(this);
    };
  },
});
