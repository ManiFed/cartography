const canvas = document.getElementById("grid-canvas");
const context = canvas.getContext("2d");
const pointer = { x: 0, y: 0 };

const blobs = [];
const contourFields = [];
const routes = [];
const markers = [];

const animationDuration = 15000;
const basePadding = 56;

let startTime = performance.now();

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function smoothstep(edge0, edge1, x) {
  const t = clamp((x - edge0) / (edge1 - edge0), 0, 1);
  return t * t * (3 - 2 * t);
}

function randomRange(min, max) {
  return min + Math.random() * (max - min);
}

function resize() {
  canvas.width = window.innerWidth * window.devicePixelRatio;
  canvas.height = window.innerHeight * window.devicePixelRatio;
  canvas.style.width = `${window.innerWidth}px`;
  canvas.style.height = `${window.innerHeight}px`;
  context.setTransform(window.devicePixelRatio, 0, 0, window.devicePixelRatio, 0, 0);
  buildMapGeometry();
}

function buildMapGeometry() {
  blobs.length = 0;
  contourFields.length = 0;
  routes.length = 0;
  markers.length = 0;

  const w = window.innerWidth;
  const h = window.innerHeight;

  const blobCount = 6;
  for (let i = 0; i < blobCount; i += 1) {
    const cx = randomRange(basePadding, w - basePadding);
    const cy = randomRange(basePadding, h - basePadding);
    const pointCount = 10;
    const radiusBase = randomRange(120, Math.min(w, h) * 0.24);
    const points = [];

    for (let p = 0; p < pointCount; p += 1) {
      const angle = (p / pointCount) * Math.PI * 2;
      const radius = radiusBase * randomRange(0.72, 1.12);
      points.push({
        x: cx + Math.cos(angle) * radius,
        y: cy + Math.sin(angle) * radius,
      });
    }

    const palette = [
      { fill: "hsla(26, 72%, 62%, 0.21)", edge: "rgba(120,90,57,0.26)" },
      { fill: "hsla(193, 32%, 56%, 0.19)", edge: "rgba(59,95,99,0.24)" },
      { fill: "hsla(42, 58%, 64%, 0.20)", edge: "rgba(124,109,73,0.24)" },
      { fill: "hsla(18, 68%, 63%, 0.18)", edge: "rgba(126,74,49,0.23)" },
    ][i % 4];

    blobs.push({
      points,
      fill: palette.fill,
      edge: palette.edge,
      delay: i * 0.1,
      seed: Math.random() * 1000,
    });
  }

  const contourCount = 5;
  for (let i = 0; i < contourCount; i += 1) {
    contourFields.push({
      x: randomRange(w * 0.16, w * 0.84),
      y: randomRange(h * 0.16, h * 0.84),
      rx: randomRange(58, 96),
      ry: randomRange(42, 78),
      turns: 5,
      rotation: randomRange(-0.8, 0.8),
      delay: 0.25 + i * 0.08,
    });
  }

  const routeCount = 12;
  for (let i = 0; i < routeCount; i += 1) {
    routes.push({
      sx: randomRange(0, w),
      sy: randomRange(0, h),
      c1x: randomRange(w * 0.1, w * 0.9),
      c1y: randomRange(h * 0.1, h * 0.9),
      c2x: randomRange(w * 0.1, w * 0.9),
      c2y: randomRange(h * 0.1, h * 0.9),
      ex: randomRange(0, w),
      ey: randomRange(0, h),
      delay: 0.35 + i * 0.03,
    });
  }

  const markerCount = 6;
  for (let i = 0; i < markerCount; i += 1) {
    markers.push({
      x: randomRange(basePadding, w - basePadding),
      y: randomRange(basePadding, h - basePadding),
      radius: randomRange(10, 20),
      phase: Math.random() * Math.PI * 2,
      delay: 0.6 + i * 0.05,
    });
  }
}

function drawPaperBackground() {
  const w = window.innerWidth;
  const h = window.innerHeight;

  const bg = context.createLinearGradient(0, 0, w, h);
  bg.addColorStop(0, "#f8f3e5");
  bg.addColorStop(0.5, "#efe7d4");
  bg.addColorStop(1, "#e7dbc2");
  context.fillStyle = bg;
  context.fillRect(0, 0, w, h);

  const vignette = context.createRadialGradient(
    w * 0.5,
    h * 0.45,
    Math.min(w, h) * 0.12,
    w * 0.5,
    h * 0.5,
    Math.max(w, h) * 0.74,
  );
  vignette.addColorStop(0, "rgba(255,255,245,0)");
  vignette.addColorStop(1, "rgba(126,95,58,0.19)");
  context.fillStyle = vignette;
  context.fillRect(0, 0, w, h);

  for (let i = 0; i < 120; i += 1) {
    const x = (i * 77.13) % w;
    const y = (i * 121.91) % h;
    context.fillStyle = `rgba(90,64,40,${0.015 + (i % 8) * 0.003})`;
    context.fillRect(x, y, 1, 1);
  }
}

function drawSmoothBlob(points, jitter) {
  const adjusted = points.map((point, i) => ({
    x: point.x + Math.sin(jitter + i * 0.7) * 1.25,
    y: point.y + Math.cos(jitter + i * 0.8) * 1.25,
  }));

  context.beginPath();
  const first = adjusted[0];
  const second = adjusted[1];
  const startX = (first.x + second.x) / 2;
  const startY = (first.y + second.y) / 2;
  context.moveTo(startX, startY);

  for (let i = 1; i <= adjusted.length; i += 1) {
    const curr = adjusted[i % adjusted.length];
    const next = adjusted[(i + 1) % adjusted.length];
    const midX = (curr.x + next.x) / 2;
    const midY = (curr.y + next.y) / 2;
    context.quadraticCurveTo(curr.x, curr.y, midX, midY);
  }

  context.closePath();
}

function draw(timestamp) {
  const w = window.innerWidth;
  const h = window.innerHeight;
  const rawProgress = (timestamp - startTime) / animationDuration;
  const progress = clamp(rawProgress, 0, 1);

  context.clearRect(0, 0, w, h);

  const parallaxX = (pointer.x - w / 2) * 0.006;
  const parallaxY = (pointer.y - h / 2) * 0.006;

  drawPaperBackground();

  context.save();
  context.translate(parallaxX, parallaxY);

  for (const blob of blobs) {
    const reveal = smoothstep(blob.delay, blob.delay + 0.32, progress);
    if (reveal <= 0) continue;

    context.save();
    context.globalAlpha = reveal;
    drawSmoothBlob(blob.points, blob.seed + timestamp * 0.00012);
    context.fillStyle = blob.fill;
    context.fill();
    context.lineWidth = 0.9;
    context.strokeStyle = blob.edge;
    context.stroke();
    context.restore();
  }

  for (const field of contourFields) {
    const reveal = smoothstep(field.delay, field.delay + 0.2, progress);
    if (reveal <= 0) continue;

    context.save();
    context.globalAlpha = reveal * 0.62;
    context.strokeStyle = "rgba(82, 106, 108, 0.46)";

    for (let i = 0; i < field.turns; i += 1) {
      context.beginPath();
      context.lineWidth = 0.85;
      context.ellipse(
        field.x,
        field.y,
        field.rx + i * 10,
        field.ry + i * 8,
        field.rotation,
        0,
        Math.PI * 2,
      );
      context.stroke();
    }

    context.restore();
  }

  for (const route of routes) {
    const reveal = smoothstep(route.delay, route.delay + 0.18, progress);
    if (reveal <= 0) continue;

    context.save();
    context.globalAlpha = reveal * 0.6;
    context.strokeStyle = "rgba(73, 97, 113, 0.48)";
    context.lineWidth = 1;
    context.setLineDash([6, 6]);
    context.beginPath();
    context.moveTo(route.sx, route.sy);
    context.bezierCurveTo(route.c1x, route.c1y, route.c2x, route.c2y, route.ex, route.ey);
    context.stroke();
    context.restore();
  }

  for (const marker of markers) {
    const reveal = smoothstep(marker.delay, marker.delay + 0.13, progress);
    if (reveal <= 0) continue;

    const pulse = 1 + Math.sin(timestamp * 0.0014 + marker.phase) * 0.05;
    const radius = marker.radius * pulse;

    context.save();
    context.globalAlpha = reveal * 0.9;
    const g = context.createRadialGradient(
      marker.x - radius * 0.35,
      marker.y - radius * 0.35,
      radius * 0.2,
      marker.x,
      marker.y,
      radius,
    );
    g.addColorStop(0, "rgba(255,210,126,0.95)");
    g.addColorStop(0.7, "rgba(236,138,60,0.84)");
    g.addColorStop(1, "rgba(175,66,38,0.5)");

    context.fillStyle = g;
    context.beginPath();
    context.arc(marker.x, marker.y, radius, 0, Math.PI * 2);
    context.fill();
    context.restore();
  }

  context.restore();

  requestAnimationFrame(draw);
}

window.addEventListener("resize", resize);
window.addEventListener("pointermove", (event) => {
  pointer.x = event.clientX;
  pointer.y = event.clientY;
});

document.getElementById("year").textContent = new Date().getFullYear();
pointer.x = window.innerWidth / 2;
pointer.y = window.innerHeight / 2;
resize();
requestAnimationFrame(draw);
