const canvas = document.getElementById("grid-canvas");
const context = canvas.getContext("2d");
const pointer = { x: 0, y: 0 };

const features = [];
const contourBands = [];
const routes = [];
const oranges = [];

const animationDuration = 18000;
const basePadding = 32;

let startTime = performance.now();

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}


function smoothstep(edge0, edge1, x) {
  const t = clamp((x - edge0) / (edge1 - edge0), 0, 1);
  return t * t * (3 - 2 * t);
}

function resize() {
  canvas.width = window.innerWidth * window.devicePixelRatio;
  canvas.height = window.innerHeight * window.devicePixelRatio;
  canvas.style.width = `${window.innerWidth}px`;
  canvas.style.height = `${window.innerHeight}px`;
  context.setTransform(window.devicePixelRatio, 0, 0, window.devicePixelRatio, 0, 0);
  buildMapGeometry();
}

function randomRange(min, max) {
  return min + Math.random() * (max - min);
}

function buildMapGeometry() {
  features.length = 0;
  contourBands.length = 0;
  routes.length = 0;
  oranges.length = 0;

  const w = window.innerWidth;
  const h = window.innerHeight;

  const featureCount = 11;

  for (let i = 0; i < featureCount; i += 1) {
    const cx = randomRange(basePadding, w - basePadding);
    const cy = randomRange(basePadding, h - basePadding);
    const points = [];
    const radiusBase = randomRange(65, Math.min(w, h) * 0.26);
    const pointCount = 14;

    for (let p = 0; p < pointCount; p += 1) {
      const angle = (p / pointCount) * Math.PI * 2;
      const radius = radiusBase * randomRange(0.55, 1.1);
      points.push({
        x: cx + Math.cos(angle) * radius,
        y: cy + Math.sin(angle) * radius,
      });
    }

    const hueGroup = i % 4;
    const palette = [
      { fill: "hsla(27, 74%, 55%, 0.26)", edge: "rgba(120,88,54,0.46)" },
      { fill: "hsla(13, 70%, 51%, 0.23)", edge: "rgba(125,72,43,0.42)" },
      { fill: "hsla(188, 42%, 43%, 0.22)", edge: "rgba(39,88,93,0.36)" },
      { fill: "hsla(45, 60%, 62%, 0.24)", edge: "rgba(118,103,67,0.38)" },
    ][hueGroup];

    features.push({
      cx,
      cy,
      points,
      fill: palette.fill,
      edge: palette.edge,
      delay: i * 0.06,
      grainSeed: Math.random() * 999,
    });
  }

  const contourCount = 10;
  for (let i = 0; i < contourCount; i += 1) {
    const ringX = randomRange(w * 0.15, w * 0.85);
    const ringY = randomRange(h * 0.15, h * 0.85);
    const rings = [];
    const base = randomRange(45, 110);

    for (let r = 0; r < 6; r += 1) {
      rings.push(base + r * randomRange(8, 16));
    }

    contourBands.push({
      x: ringX,
      y: ringY,
      rings,
      drift: randomRange(-0.7, 0.7),
      delay: 0.18 + i * 0.035,
    });
  }

  const routeCount = 32;
  for (let i = 0; i < routeCount; i += 1) {
    routes.push({
      startX: randomRange(0, w),
      startY: randomRange(0, h),
      cpX: randomRange(w * 0.1, w * 0.9),
      cpY: randomRange(h * 0.1, h * 0.9),
      endX: randomRange(0, w),
      endY: randomRange(0, h),
      delay: 0.3 + i * 0.012,
      width: randomRange(0.7, 1.7),
    });
  }

  const orbCount = 11;
  for (let i = 0; i < orbCount; i += 1) {
    oranges.push({
      x: randomRange(basePadding, w - basePadding),
      y: randomRange(basePadding, h - basePadding),
      radius: randomRange(8, 21),
      pulse: Math.random() * Math.PI * 2,
      delay: 0.52 + i * 0.028,
    });
  }
}

function drawPaperBackground(progress) {
  const w = window.innerWidth;
  const h = window.innerHeight;

  const bg = context.createLinearGradient(0, 0, w, h);
  bg.addColorStop(0, "#f8f4e8");
  bg.addColorStop(0.55, "#efe6d3");
  bg.addColorStop(1, "#e6d9bd");

  context.fillStyle = bg;
  context.fillRect(0, 0, w, h);

  const vignette = context.createRadialGradient(
    w * 0.52,
    h * 0.44,
    Math.min(w, h) * 0.06,
    w * 0.5,
    h * 0.5,
    Math.max(w, h) * 0.72,
  );

  vignette.addColorStop(0, "rgba(255,252,244,0)");
  vignette.addColorStop(1, `rgba(133, 96, 54, ${0.2 + progress * 0.1})`);

  context.fillStyle = vignette;
  context.fillRect(0, 0, w, h);

  for (let i = 0; i < 170; i += 1) {
    const x = (i * 67.31) % w;
    const y = (i * 113.79) % h;
    const speck = 0.02 + ((i * 37) % 12) * 0.0025;

    context.fillStyle = `rgba(90,64,40,${speck})`;
    context.fillRect(x, y, 1.1, 1.1);
  }
}

function drawPolygon(points, jitter) {
  context.beginPath();

  points.forEach((point, index) => {
    const nx = point.x + Math.sin(index * 0.9 + jitter) * 2.1;
    const ny = point.y + Math.cos(index * 1.1 + jitter) * 2.1;

    if (index === 0) {
      context.moveTo(nx, ny);
      return;
    }

    context.lineTo(nx, ny);
  });

  context.closePath();
}

function draw(timestamp) {
  const w = window.innerWidth;
  const h = window.innerHeight;

  const elapsed = (timestamp - startTime) % animationDuration;
  const progress = elapsed / animationDuration;

  context.clearRect(0, 0, w, h);

  const parallaxX = (pointer.x - w / 2) * 0.009;
  const parallaxY = (pointer.y - h / 2) * 0.009;

  drawPaperBackground(progress);

  context.save();
  context.translate(parallaxX, parallaxY);

  for (const feature of features) {
    const featureProgress = smoothstep(feature.delay, feature.delay + 0.28, progress);
    if (featureProgress <= 0) {
      continue;
    }

    context.save();
    context.globalAlpha = featureProgress;

    drawPolygon(feature.points, timestamp * 0.0002 + feature.grainSeed);

    context.fillStyle = feature.fill;
    context.fill();

    context.strokeStyle = feature.edge;
    context.lineWidth = 1.1;
    context.stroke();

    for (let i = 0; i < 5; i += 1) {
      context.globalAlpha = featureProgress * 0.08;
      context.strokeStyle = "rgba(70,56,38,0.6)";
      context.lineWidth = 0.5;
      drawPolygon(feature.points, feature.grainSeed + i * 0.6 + timestamp * 0.00015);
      context.stroke();
    }

    context.restore();
  }

  for (const contour of contourBands) {
    const contourProgress = smoothstep(contour.delay, contour.delay + 0.22, progress);
    if (contourProgress <= 0) {
      continue;
    }

    context.save();
    context.globalAlpha = contourProgress * 0.7;
    context.strokeStyle = "rgba(66, 92, 86, 0.55)";

    for (let i = 0; i < contour.rings.length; i += 1) {
      const radius = contour.rings[i] + Math.sin(timestamp * 0.00035 + contour.drift * i) * 1.5;
      context.lineWidth = i % 3 === 0 ? 1.2 : 0.8;
      context.beginPath();
      context.ellipse(contour.x, contour.y, radius, radius * 0.76, contour.drift * 0.7, 0, Math.PI * 2);
      context.stroke();
    }

    context.restore();
  }

  for (const route of routes) {
    const routeProgress = smoothstep(route.delay, route.delay + 0.17, progress);
    if (routeProgress <= 0) {
      continue;
    }

    context.save();
    context.globalAlpha = routeProgress;
    context.lineWidth = route.width;
    context.setLineDash([9, 5, 3, 6]);
    context.lineDashOffset = -timestamp * 0.02;
    context.strokeStyle = "rgba(59, 83, 99, 0.52)";

    context.beginPath();
    context.moveTo(route.startX, route.startY);
    context.quadraticCurveTo(route.cpX, route.cpY, route.endX, route.endY);
    context.stroke();

    context.restore();
  }

  for (const orb of oranges) {
    const orbProgress = smoothstep(orb.delay, orb.delay + 0.12, progress);
    if (orbProgress <= 0) {
      continue;
    }

    const pulse = 1 + Math.sin(timestamp * 0.0017 + orb.pulse) * 0.08;
    const radius = orb.radius * pulse;

    context.save();
    context.globalAlpha = orbProgress * 0.9;

    const orbGradient = context.createRadialGradient(orb.x - radius * 0.35, orb.y - radius * 0.35, radius * 0.2, orb.x, orb.y, radius);
    orbGradient.addColorStop(0, "rgba(255, 208, 120, 0.95)");
    orbGradient.addColorStop(0.65, "rgba(235, 132, 58, 0.88)");
    orbGradient.addColorStop(1, "rgba(169, 59, 36, 0.56)");

    context.fillStyle = orbGradient;
    context.beginPath();
    context.arc(orb.x, orb.y, radius, 0, Math.PI * 2);
    context.fill();

    context.strokeStyle = "rgba(255, 233, 178, 0.5)";
    context.lineWidth = 0.85;
    context.stroke();

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
