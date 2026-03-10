/* ============================================
   THREE.JS SCENES — scenes.js
   Requires: three.js (via CDN in index.html)
   ============================================ */

/* ---------- HERO SCENE (Spline-style Glass Cubes) ---------- */
function initHeroScene() {
  const container = document.getElementById('hero-canvas');
  if (!container) return;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(45, container.clientWidth / container.clientHeight, 0.1, 100);
  camera.position.set(0, 0, 14);

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setSize(container.clientWidth, container.clientHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setClearColor(0x000000, 0);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.2;
  container.appendChild(renderer.domElement);

  // === LIGHTING ===
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.15);
  scene.add(ambientLight);

  const dirLight1 = new THREE.DirectionalLight(0x03bcca, 0.9);
  dirLight1.position.set(6, 6, 6);
  scene.add(dirLight1);

  const dirLight2 = new THREE.DirectionalLight(0x5de8d0, 0.4);
  dirLight2.position.set(-5, 4, 3);
  scene.add(dirLight2);

  const pointLight1 = new THREE.PointLight(0x03bcca, 0.6, 25);
  pointLight1.position.set(3, 0, 5);
  scene.add(pointLight1);

  const pointLight2 = new THREE.PointLight(0x5de8d0, 0.3, 20);
  pointLight2.position.set(-4, -2, 3);
  scene.add(pointLight2);

  // === LARGE GLASS SPHERE ===
  const sphereGeo = new THREE.SphereGeometry(2.5, 64, 64);
  const sphereMat = new THREE.MeshStandardMaterial({
    color: 0x03bcca,
    roughness: 0.02,
    metalness: 0.1,
    transparent: true,
    opacity: 0.18,
    emissive: 0x03bcca,
    emissiveIntensity: 0.06,
    side: THREE.FrontSide,
  });
  const sphere = new THREE.Mesh(sphereGeo, sphereMat);
  sphere.position.set(3.5, 0.5, -3);
  scene.add(sphere);

  // Inner glow layer
  const innerGlowGeo = new THREE.SphereGeometry(2.3, 32, 32);
  const innerGlowMat = new THREE.MeshStandardMaterial({
    color: 0x5de8d0,
    transparent: true,
    opacity: 0.06,
    emissive: 0x03bcca,
    emissiveIntensity: 0.12,
    side: THREE.BackSide,
  });
  sphere.add(new THREE.Mesh(innerGlowGeo, innerGlowMat));

  // Sphere edge ring for depth
  const sphereEdges = new THREE.EdgesGeometry(new THREE.SphereGeometry(2.52, 24, 24));
  const sphereEdgeMat = new THREE.LineBasicMaterial({ color: 0x03bcca, transparent: true, opacity: 0.08 });
  sphere.add(new THREE.LineSegments(sphereEdges, sphereEdgeMat));

  // === FLOATING GLASS CUBES GRID ===
  const cubeGroup = new THREE.Group();
  const cubes = [];
  const ROWS = 8;
  const COLS = 15;
  const SPACING = 1.05;
  const CUBE_SIZE = 0.55;

  const cubeBaseGeo = new THREE.BoxGeometry(CUBE_SIZE, CUBE_SIZE, CUBE_SIZE);
  const cubeEdgeGeo = new THREE.EdgesGeometry(cubeBaseGeo);

  for (let row = 0; row < ROWS; row++) {
    for (let col = 0; col < COLS; col++) {
      const idx = row * COLS + col;
      const distCenter = Math.sqrt(
        Math.pow((col - COLS / 2) / (COLS / 2), 2) +
        Math.pow((row - ROWS / 2) / (ROWS / 2), 2)
      );

      // Vary opacity based on position (brighter toward center)
      const baseOpacity = 0.08 + (1 - Math.min(distCenter, 1)) * 0.18;
      const emissiveStr = 0.03 + (1 - Math.min(distCenter, 1)) * 0.12;

      const cubeMat = new THREE.MeshStandardMaterial({
        color: 0x03bcca,
        roughness: 0.08,
        metalness: 0.85,
        transparent: true,
        opacity: baseOpacity,
        emissive: 0x03bcca,
        emissiveIntensity: emissiveStr,
      });

      const cube = new THREE.Mesh(cubeBaseGeo, cubeMat);

      // Edge wireframe (outline effect like Spline)
      const edgeMat = new THREE.LineBasicMaterial({
        color: 0x03bcca,
        transparent: true,
        opacity: baseOpacity * 1.8,
      });
      cube.add(new THREE.LineSegments(cubeEdgeGeo, edgeMat));

      // Position in flowing grid
      const x = (col - COLS / 2) * SPACING;
      const y = (row - ROWS / 2) * SPACING;
      // Curved z-depth: slight bowl shape
      const z = -distCenter * 1.5 + (Math.random() - 0.5) * 0.5;

      cube.position.set(x, y, z);
      cube.rotation.set(
        Math.random() * 0.3,
        Math.random() * 0.3,
        Math.random() * 0.3
      );

      // Animation data
      cube._basePos = cube.position.clone();
      cube._baseRot = cube.rotation.clone();
      cube._offset = Math.random() * Math.PI * 2;
      cube._speed = 0.25 + Math.random() * 0.35;
      cube._rotSpeed = (Math.random() - 0.5) * 0.008;
      cube._hoverScale = 1;

      cubes.push(cube);
      cubeGroup.add(cube);
    }
  }

  cubeGroup.position.set(0, 0, -5);
  scene.add(cubeGroup);

  // === ELLIPSE DECOR (flat ring) ===
  const ellipseGeo = new THREE.RingGeometry(3.5, 3.8, 64);
  const ellipseMat = new THREE.MeshStandardMaterial({
    color: 0x03bcca,
    transparent: true,
    opacity: 0.06,
    emissive: 0x03bcca,
    emissiveIntensity: 0.08,
    side: THREE.DoubleSide,
  });
  const ellipse = new THREE.Mesh(ellipseGeo, ellipseMat);
  ellipse.position.set(-2, -1, -6);
  ellipse.rotation.set(0.4, 0.3, 0.1);
  scene.add(ellipse);

  // === GRADIENT LIGHT PANEL ===
  const panelGeo = new THREE.PlaneGeometry(6, 4);
  const panelCanvas = document.createElement('canvas');
  panelCanvas.width = 256;
  panelCanvas.height = 128;
  const panelCtx = panelCanvas.getContext('2d');
  const grad = panelCtx.createLinearGradient(0, 0, 256, 128);
  grad.addColorStop(0, 'rgba(3, 188, 202, 0.5)');
  grad.addColorStop(0.5, 'rgba(93, 232, 208, 0.3)');
  grad.addColorStop(1, 'rgba(3, 188, 202, 0)');
  panelCtx.fillStyle = grad;
  panelCtx.fillRect(0, 0, 256, 128);
  const panelTex = new THREE.CanvasTexture(panelCanvas);
  const panelMat = new THREE.MeshBasicMaterial({
    map: panelTex,
    transparent: true,
    opacity: 0.15,
    side: THREE.DoubleSide,
    blending: THREE.AdditiveBlending,
  });
  const panel = new THREE.Mesh(panelGeo, panelMat);
  panel.position.set(5, 2, -7);
  panel.rotation.set(0.2, -0.5, 0.1);
  scene.add(panel);

  // === GLOW PARTICLES ===
  const sparkCount = 80;
  const sparkGeo = new THREE.BufferGeometry();
  const sparkPos = new Float32Array(sparkCount * 3);
  for (let i = 0; i < sparkCount; i++) {
    sparkPos[i * 3] = (Math.random() - 0.5) * 24;
    sparkPos[i * 3 + 1] = (Math.random() - 0.5) * 16;
    sparkPos[i * 3 + 2] = (Math.random() - 0.5) * 16;
  }
  sparkGeo.setAttribute('position', new THREE.BufferAttribute(sparkPos, 3));
  const sparkMat = new THREE.PointsMaterial({
    color: 0x03bcca,
    size: 0.07,
    transparent: true,
    opacity: 0.5,
    sizeAttenuation: true,
    blending: THREE.AdditiveBlending,
  });
  const sparkles3d = new THREE.Points(sparkGeo, sparkMat);
  scene.add(sparkles3d);

  // === MOUSE TRACKING (Follow effect like Spline) ===
  let mouseX = 0, mouseY = 0;
  let targetX = 0, targetY = 0;

  window.addEventListener('mousemove', (e) => {
    targetX = (e.clientX / window.innerWidth - 0.5) * 2;
    targetY = -(e.clientY / window.innerHeight - 0.5) * 2;
  });

  // === HOVER DETECTION for cubes ===
  const raycaster = new THREE.Raycaster();
  const mouse2D = new THREE.Vector2();

  container.addEventListener('mousemove', (e) => {
    const rect = container.getBoundingClientRect();
    mouse2D.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    mouse2D.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
  });

  // === ANIMATION LOOP ===
  const clock = new THREE.Clock();
  let hoveredCubes = new Set();

  function animate() {
    requestAnimationFrame(animate);
    const t = clock.getElapsedTime();

    // Smooth mouse follow (damping like Spline)
    mouseX += (targetX - mouseX) * 0.04;
    mouseY += (targetY - mouseY) * 0.04;

    // --- Sphere animation ---
    sphere.position.y = 0.5 + Math.sin(t * 0.4) * 0.5;
    sphere.rotation.y += 0.002;
    sphere.rotation.x = Math.sin(t * 0.25) * 0.12;
    sphere.position.x = 3.5 + mouseX * 0.6;

    // --- Cube grid mouse-follow rotation (main parallax) ---
    cubeGroup.rotation.y = mouseX * 0.18;
    cubeGroup.rotation.x = mouseY * 0.1;

    // --- Cube hover detection ---
    raycaster.setFromCamera(mouse2D, camera);
    const intersects = raycaster.intersectObjects(cubes, false);
    const newHovered = new Set();
    intersects.slice(0, 3).forEach(hit => newHovered.add(hit.object));

    // --- Individual cube animation ---
    cubes.forEach(cube => {
      // Float animation
      cube.position.y = cube._basePos.y + Math.sin(t * cube._speed + cube._offset) * 0.12;
      cube.position.x = cube._basePos.x + Math.sin(t * cube._speed * 0.6 + cube._offset + 1) * 0.04;
      cube.rotation.y = cube._baseRot.y + t * cube._rotSpeed;
      cube.rotation.x = cube._baseRot.x + t * cube._rotSpeed * 0.6;

      // Hover scale effect (like Spline state transitions)
      const isHov = newHovered.has(cube);
      const scaleTarget = isHov ? 1.5 : 1;
      cube._hoverScale += (scaleTarget - cube._hoverScale) * 0.1;
      cube.scale.setScalar(cube._hoverScale);

      // Increase opacity on hover
      if (isHov) {
        cube.material.opacity = Math.min(cube.material.opacity + 0.02, 0.5);
        cube.material.emissiveIntensity = Math.min(cube.material.emissiveIntensity + 0.01, 0.3);
      } else {
        const baseOp = 0.08 + (1 - Math.min(
          Math.sqrt(Math.pow(cube._basePos.x / 8, 2) + Math.pow(cube._basePos.y / 4, 2)), 1
        )) * 0.18;
        cube.material.opacity += (baseOp - cube.material.opacity) * 0.05;
        cube.material.emissiveIntensity += (0.06 - cube.material.emissiveIntensity) * 0.05;
      }
    });

    hoveredCubes = newHovered;

    // --- Ellipse subtle rotation ---
    ellipse.rotation.z = 0.1 + Math.sin(t * 0.2) * 0.08;
    ellipse.rotation.x = 0.4 + mouseY * 0.05;

    // --- Gradient panel float ---
    panel.position.y = 2 + Math.sin(t * 0.3) * 0.4;
    panel.rotation.z = 0.1 + Math.sin(t * 0.15) * 0.05;

    // --- Particles drift ---
    sparkles3d.rotation.y = t * 0.01;
    sparkles3d.rotation.x = Math.sin(t * 0.08) * 0.04;

    // --- Camera subtle parallax ---
    camera.position.x = mouseX * 0.4;
    camera.position.y = mouseY * 0.25;
    camera.lookAt(0, 0, -2);

    // --- Point light follows mouse for dynamic highlights ---
    pointLight1.position.x = 3 + mouseX * 3;
    pointLight1.position.y = mouseY * 2;

    renderer.render(scene, camera);
  }

  animate();

  // Resize handler
  function onResize() {
    camera.aspect = container.clientWidth / container.clientHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(container.clientWidth, container.clientHeight);
  }
  window.addEventListener('resize', onResize);
}


/* ---------- DIENSTEN SCENE ---------- */
function initDienstenScene() {
  const container = document.getElementById('diensten-canvas');
  if (!container) return;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(35, container.clientWidth / container.clientHeight, 0.1, 100);
  camera.position.set(4, 4, 4);

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setSize(container.clientWidth, container.clientHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
  renderer.setClearColor(0x000000, 0);
  container.appendChild(renderer.domElement);

  // Lights
  scene.add(new THREE.AmbientLight(0xffffff, 0.4));
  const dLight = new THREE.DirectionalLight(0x03bcca, 0.6);
  dLight.position.set(5, 5, 5);
  scene.add(dLight);

  // Grid of cubes
  const group = new THREE.Group();
  group.rotation.y = Math.PI / 6;
  const cubes = [];

  for (let x = -2; x <= 2; x += 0.6) {
    for (let z = -2; z <= 2; z += 0.6) {
      const geo = new THREE.BoxGeometry(0.4, 1, 0.4);
      const mat = new THREE.MeshStandardMaterial({
        color: 0x03bcca,
        transparent: true,
        opacity: 0.4 + Math.random() * 0.3,
        roughness: 0.3,
        metalness: 0.7,
      });
      const cube = new THREE.Mesh(geo, mat);
      cube.position.set(x, 0, z);
      cube._delay = (Math.abs(x) + Math.abs(z)) * 0.5;
      cubes.push(cube);
      group.add(cube);
    }
  }
  scene.add(group);

  // Sparkle particles
  const spCount = 20;
  const spGeo = new THREE.BufferGeometry();
  const spPos = new Float32Array(spCount * 3);
  for (let i = 0; i < spCount; i++) {
    spPos[i * 3] = (Math.random() - 0.5) * 8;
    spPos[i * 3 + 1] = (Math.random() - 0.5) * 8;
    spPos[i * 3 + 2] = (Math.random() - 0.5) * 8;
  }
  spGeo.setAttribute('position', new THREE.BufferAttribute(spPos, 3));
  const spMat = new THREE.PointsMaterial({
    color: 0x03bcca,
    size: 0.04,
    transparent: true,
    opacity: 0.3,
    sizeAttenuation: true,
  });
  scene.add(new THREE.Points(spGeo, spMat));

  const clock = new THREE.Clock();

  function animate() {
    requestAnimationFrame(animate);
    const t = clock.getElapsedTime();

    cubes.forEach(cube => {
      cube.scale.y = 0.3 + Math.sin(t * 0.7 + cube._delay) * 0.2;
      cube.position.y = cube.scale.y / 2;
    });

    renderer.render(scene, camera);
  }

  animate();

  function onResize() {
    camera.aspect = container.clientWidth / container.clientHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(container.clientWidth, container.clientHeight);
  }
  window.addEventListener('resize', onResize);
}


/* ---------- PRINT SCENE ---------- */
function initPrintScene() {
  const container = document.getElementById('print-canvas');
  if (!container) return;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(40, container.clientWidth / container.clientHeight, 0.1, 100);
  camera.position.set(3, 2, 4);

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setSize(container.clientWidth, container.clientHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
  renderer.setClearColor(0x000000, 0);
  container.appendChild(renderer.domElement);

  // Lights
  scene.add(new THREE.AmbientLight(0xffffff, 0.3));
  const dl1 = new THREE.DirectionalLight(0x03bcca, 0.7);
  dl1.position.set(5, 5, 5);
  scene.add(dl1);
  const dl2 = new THREE.DirectionalLight(0x5de8d0, 0.3);
  dl2.position.set(-3, 3, 2);
  scene.add(dl2);
  const pl = new THREE.PointLight(0x03bcca, 0.4);
  pl.position.set(0, 2, 0);
  scene.add(pl);

  const mainGroup = new THREE.Group();
  scene.add(mainGroup);

  // Print layers
  const layers = [];
  for (let i = 0; i < 16; i++) {
    const y = -1 + i * 0.14;
    const layerGeo = new THREE.BoxGeometry(2, 0.12, 2);
    const layerMat = new THREE.MeshStandardMaterial({
      color: 0x03bcca,
      transparent: true,
      opacity: 0.15 + (y + 1.5) * 0.15,
      roughness: 0.3,
      metalness: 0.6,
    });
    const layer = new THREE.Mesh(layerGeo, layerMat);
    layer.position.y = y;
    layer._baseY = y;
    layer._delay = i * 0.3;
    layer._scale = 1 - Math.abs(i - 8) * 0.03;

    // Edge wireframe
    const edges = new THREE.EdgesGeometry(layerGeo);
    const edgeMat = new THREE.LineBasicMaterial({ color: 0x03bcca });
    const edgeLine = new THREE.LineSegments(edges, edgeMat);
    layer.add(edgeLine);

    layers.push(layer);
    mainGroup.add(layer);
  }

  // Dodecahedron (floating object)
  const dodecGeo = new THREE.DodecahedronGeometry(1, 0);
  const dodecMat = new THREE.MeshStandardMaterial({
    color: 0x03bcca,
    roughness: 0.15,
    metalness: 0.9,
  });
  const dodec = new THREE.Mesh(dodecGeo, dodecMat);
  dodec.position.set(0, 0.5, 0);
  dodec.scale.setScalar(0.7);
  mainGroup.add(dodec);

  // Base plate
  const baseGeo = new THREE.PlaneGeometry(3, 3);
  const baseMat = new THREE.MeshStandardMaterial({
    color: 0x1a1d24,
    roughness: 0.8,
    metalness: 0.2,
  });
  const base = new THREE.Mesh(baseGeo, baseMat);
  base.position.set(0, -1.2, 0);
  base.rotation.x = -Math.PI / 2;
  const baseEdges = new THREE.EdgesGeometry(baseGeo);
  const baseEdgeMat = new THREE.LineBasicMaterial({ color: 0x03bcca });
  base.add(new THREE.LineSegments(baseEdges, baseEdgeMat));
  mainGroup.add(base);

  const clock = new THREE.Clock();

  // Auto-rotate + interact
  let isDragging = false;
  let prevX = 0;
  let rotationY = 0;

  container.addEventListener('pointerdown', (e) => {
    isDragging = true;
    prevX = e.clientX;
    container.style.cursor = 'grabbing';
  });

  window.addEventListener('pointermove', (e) => {
    if (!isDragging) return;
    const dx = e.clientX - prevX;
    rotationY += dx * 0.005;
    prevX = e.clientX;
  });

  window.addEventListener('pointerup', () => {
    isDragging = false;
    container.style.cursor = 'grab';
  });

  container.style.cursor = 'grab';

  function animate() {
    requestAnimationFrame(animate);
    const t = clock.getElapsedTime();

    // Auto rotate + manual control
    if (!isDragging) {
      rotationY += 0.004;
    }
    mainGroup.rotation.y = rotationY;

    // Layer animation
    layers.forEach(layer => {
      layer.position.y = layer._baseY + Math.sin(t * 0.8 + layer._delay) * 0.08;
      layer.scale.setScalar(layer._scale + Math.sin(t * 0.5 + layer._delay) * 0.02);
    });

    // Dodecahedron float
    dodec.position.y = 0.5 + Math.sin(t * 0.7) * 0.15;
    dodec.rotation.x += 0.005;
    dodec.rotation.z += 0.003;

    renderer.render(scene, camera);
  }

  animate();

  function onResize() {
    camera.aspect = container.clientWidth / container.clientHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(container.clientWidth, container.clientHeight);
  }
  window.addEventListener('resize', onResize);
}


/* ---------- FLOATING SPARKLES (full page) ---------- */
function initSparkles() {
  const canvas = document.getElementById('sparkles-canvas');
  if (!canvas) return;

  const ctx = canvas.getContext('2d');
  let w, h;
  const particles = [];
  const PARTICLE_COUNT = 50;

  function resize() {
    w = canvas.width = window.innerWidth;
    h = canvas.height = window.innerHeight;
  }

  window.addEventListener('resize', resize);
  resize();

  // Create particles
  for (let i = 0; i < PARTICLE_COUNT; i++) {
    particles.push({
      x: Math.random() * w,
      y: Math.random() * h,
      size: Math.random() * 2.5 + 0.5,
      speedX: (Math.random() - 0.5) * 0.3,
      speedY: (Math.random() - 0.5) * 0.3,
      opacity: Math.random() * 0.4 + 0.1,
      pulse: Math.random() * Math.PI * 2,
      pulseSpeed: Math.random() * 0.02 + 0.005,
    });
  }

  function draw() {
    ctx.clearRect(0, 0, w, h);

    particles.forEach(p => {
      p.x += p.speedX;
      p.y += p.speedY;
      p.pulse += p.pulseSpeed;

      // Wrap around
      if (p.x < 0) p.x = w;
      if (p.x > w) p.x = 0;
      if (p.y < 0) p.y = h;
      if (p.y > h) p.y = 0;

      const currentOpacity = p.opacity * (0.5 + 0.5 * Math.sin(p.pulse));
      const currentSize = p.size * (0.8 + 0.2 * Math.sin(p.pulse));

      // Glow
      ctx.beginPath();
      const gradient = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, currentSize * 4);
      gradient.addColorStop(0, `rgba(3, 188, 202, ${currentOpacity})`);
      gradient.addColorStop(0.5, `rgba(3, 188, 202, ${currentOpacity * 0.3})`);
      gradient.addColorStop(1, 'rgba(3, 188, 202, 0)');
      ctx.fillStyle = gradient;
      ctx.arc(p.x, p.y, currentSize * 4, 0, Math.PI * 2);
      ctx.fill();

      // Core dot
      ctx.beginPath();
      ctx.fillStyle = `rgba(3, 188, 202, ${currentOpacity * 1.5})`;
      ctx.arc(p.x, p.y, currentSize, 0, Math.PI * 2);
      ctx.fill();
    });

    requestAnimationFrame(draw);
  }

  draw();
}


/* ---------- INIT ALL ---------- */
document.addEventListener('DOMContentLoaded', () => {
  // Always init sparkles (uses 2D canvas, no Three.js needed)
  initSparkles();

  // Only init Three.js scenes if the library loaded successfully
  if (typeof THREE !== 'undefined') {
    try {
      initHeroScene();
      initDienstenScene();
      // Print scene replaced by iframe preview
      if (document.getElementById('print-canvas')) initPrintScene();
    } catch (e) {
      console.warn('Three.js scene init failed:', e);
    }
  } else {
    console.warn('Three.js not loaded — 3D scenes disabled');
  }
});
