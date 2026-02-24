const canvas = document.getElementById("grid-canvas");
const context = canvas.getContext("2d");
const nodes = [];
const pointer = { x: 0, y: 0 };
const grid = { cols: 20, rows: 13 };
const settleDuration = 7000;

let startTime = performance.now();
let pulsePhase = 0;

function resize() {
  canvas.width = window.innerWidth * window.devicePixelRatio;
  canvas.height = window.innerHeight * window.devicePixelRatio;
  canvas.style.width = `${window.innerWidth}px`;
  canvas.style.height = `${window.innerHeight}px`;
  context.setTransform(window.devicePixelRatio, 0, 0, window.devicePixelRatio, 0, 0);
  buildNodes();
}

function buildNodes() {
  nodes.length = 0;
  const margin = 40;
  const width = window.innerWidth - margin * 2;
  const height = window.innerHeight - margin * 2;

  for (let y = 0; y < grid.rows; y += 1) {
    for (let x = 0; x < grid.cols; x += 1) {
      const tx = margin + (x / (grid.cols - 1)) * width;
      const ty = margin + (y / (grid.rows - 1)) * height;
      const noiseScale = 14;

      nodes.push({
        tx,
        ty,
        ox: (Math.random() - 0.5) * noiseScale,
        oy: (Math.random() - 0.5) * noiseScale,
        flicker: Math.random() * Math.PI * 2,
      });
    }
  }
}

function lerp(a, b, t) {
  return a + (b - a) * t;
}

function nodeAt(col, row) {
  return nodes[row * grid.cols + col];
}

function draw(timestamp) {
  context.clearRect(0, 0, window.innerWidth, window.innerHeight);

  const elapsed = timestamp - startTime;
  const loopProgress = (elapsed % settleDuration) / settleDuration;
  const settle = Math.min(loopProgress, 1);
  const stabilize = 1 - Math.pow(1 - settle, 2);

  pulsePhase += 0.012;

  const parallaxX = (pointer.x - window.innerWidth / 2) * 0.01;
  const parallaxY = (pointer.y - window.innerHeight / 2) * 0.01;

  context.lineWidth = 1;

  for (let row = 0; row < grid.rows; row += 1) {
    for (let col = 0; col < grid.cols; col += 1) {
      const node = nodeAt(col, row);
      const wiggle = (1 - stabilize) * 3;
      const nx = lerp(node.tx + node.ox, node.tx, stabilize) + Math.sin(timestamp * 0.001 + node.flicker) * wiggle + parallaxX;
      const ny = lerp(node.ty + node.oy, node.ty, stabilize) + Math.cos(timestamp * 0.0012 + node.flicker) * wiggle + parallaxY;
      node.x = nx;
      node.y = ny;

      if (col < grid.cols - 1) {
        const right = nodeAt(col + 1, row);
        const rx = lerp(right.tx + right.ox, right.tx, stabilize) + Math.sin(timestamp * 0.001 + right.flicker) * wiggle + parallaxX;
        const ry = lerp(right.ty + right.oy, right.ty, stabilize) + Math.cos(timestamp * 0.0012 + right.flicker) * wiggle + parallaxY;

        context.strokeStyle = `rgba(40, 162, 217, ${0.1 + stabilize * 0.2})`;
        context.beginPath();
        context.moveTo(nx, ny);
        context.lineTo(rx, ry);
        context.stroke();
      }

      if (row < grid.rows - 1) {
        const bottom = nodeAt(col, row + 1);
        const bx = lerp(bottom.tx + bottom.ox, bottom.tx, stabilize) + Math.sin(timestamp * 0.001 + bottom.flicker) * wiggle + parallaxX;
        const by = lerp(bottom.ty + bottom.oy, bottom.ty, stabilize) + Math.cos(timestamp * 0.0012 + bottom.flicker) * wiggle + parallaxY;

        context.strokeStyle = `rgba(40, 162, 217, ${0.08 + stabilize * 0.17})`;
        context.beginPath();
        context.moveTo(nx, ny);
        context.lineTo(bx, by);
        context.stroke();
      }

      const pulse = Math.sin(pulsePhase + (col + row) * 0.25);
      const radius = 0.8 + (pulse > 0.95 ? 1.2 : 0) + (1 - stabilize) * 0.5;
      const alpha = 0.22 + (pulse > 0.95 ? 0.5 : 0) + (1 - stabilize) * 0.08;

      context.fillStyle = `rgba(83, 186, 255, ${alpha})`;
      context.beginPath();
      context.arc(nx, ny, radius, 0, Math.PI * 2);
      context.fill();
    }
  }

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
