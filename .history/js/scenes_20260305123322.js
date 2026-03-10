/* ============================================
   THREE.JS SCENES — scenes.js
   Requires: three.js (via CDN in index.html)
   ============================================ */

/* ---------- HERO SCENE ---------- */
function initHeroScene() {
  const container = document.getElementById('hero-canvas');
  if (!container) return;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(45, container.clientWidth / container.clientHeight, 0.1, 100);
  camera.position.set(0, 0, 8);

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setSize(container.clientWidth, container.clientHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
  renderer.setClearColor(0x000000, 0);
  container.appendChild(renderer.domElement);

  // Lights
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.3);
  scene.add(ambientLight);

  const dirLight1 = new THREE.DirectionalLight(0x03bcca, 0.8);
  dirLight1.position.set(5, 5, 5);
  scene.add(dirLight1);

  const dirLight2 = new THREE.DirectionalLight(0x5de8d0, 0.4);
  dirLight2.position.set(-3, 3, 2);
  scene.add(dirLight2);

  const pointLight = new THREE.PointLight(0x03bcca, 0.5);
  pointLight.position.set(0, 0, 4);
  scene.add(pointLight);

  // Torus
  const torusGeo = new THREE.TorusGeometry(1, 0.4, 32, 64);
  const torusMat = new THREE.MeshStandardMaterial({
    color: 0x03bcca,
    roughness: 0.2,
    metalness: 0.8,
  });
  const torus = new THREE.Mesh(torusGeo, torusMat);
  torus.position.set(3.5, 1, -2);
  scene.add(torus);

  // Glass sphere (glassy look)
  const sphereGeo = new THREE.SphereGeometry(0.8, 64, 64);
  const sphereMat = new THREE.MeshStandardMaterial({
    color: 0x03bcca,
    roughness: 0.05,
    metalness: 0.3,
    transparent: true,
    opacity: 0.4,
    emissive: 0x03bcca,
    emissiveIntensity: 0.15,
  });
  const sphere = new THREE.Mesh(sphereGeo, sphereMat);
  sphere.position.set(4, -1.5, 0);
  scene.add(sphere);

  // Icosahedron wireframe
  const icoGeo = new THREE.IcosahedronGeometry(1, 1);
  const icoMat = new THREE.MeshStandardMaterial({
    color: 0x03bcca,
    wireframe: true,
    emissive: 0x03bcca,
    emissiveIntensity: 0.3,
  });
  const ico = new THREE.Mesh(icoGeo, icoMat);
  ico.position.set(2.5, -0.5, 1);
  ico.scale.setScalar(0.6);
  scene.add(ico);

  // Sparkle particles
  const sparkleCount = 40;
  const sparkleGeo = new THREE.BufferGeometry();
  const positions = new Float32Array(sparkleCount * 3);
  for (let i = 0; i < sparkleCount; i++) {
    positions[i * 3] = (Math.random() - 0.5) * 12;
    positions[i * 3 + 1] = (Math.random() - 0.5) * 12;
    positions[i * 3 + 2] = (Math.random() - 0.5) * 12;
  }
  sparkleGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  const sparkleMat = new THREE.PointsMaterial({
    color: 0x03bcca,
    size: 0.06,
    transparent: true,
    opacity: 0.5,
    sizeAttenuation: true,
  });
  const sparkles = new THREE.Points(sparkleGeo, sparkleMat);
  scene.add(sparkles);

  // --- Mouse interaction ---
  const mouse = { x: 0, y: 0 };
  const smoothMouse = { x: 0, y: 0 };
  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();
  const interactiveObjects = [torus, sphere, ico];
  let hoveredObject = null;

  // Store original scales & emissive intensities
  const originalScales = new Map();
  const originalEmissive = new Map();
  interactiveObjects.forEach(obj => {
    originalScales.set(obj, obj.scale.clone());
    originalEmissive.set(obj, obj.material.emissiveIntensity || 0);
  });

  container.addEventListener('mousemove', (e) => {
    const rect = container.getBoundingClientRect();
    mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
    pointer.x = mouse.x;
    pointer.y = mouse.y;
  });

  container.addEventListener('mouseleave', () => {
    mouse.x = 0;
    mouse.y = 0;
  });

  container.style.cursor = 'default';

  // Animation
  const clock = new THREE.Clock();

  function animate() {
    requestAnimationFrame(animate);
    const t = clock.getElapsedTime();

    // Smooth mouse follow (lerp)
    smoothMouse.x += (mouse.x - smoothMouse.x) * 0.05;
    smoothMouse.y += (mouse.y - smoothMouse.y) * 0.05;

    // Raycasting for hover
    raycaster.setFromCamera(pointer, camera);
    const intersects = raycaster.intersectObjects(interactiveObjects);
    const newHover = intersects.length > 0 ? intersects[0].object : null;

    if (newHover !== hoveredObject) {
      hoveredObject = newHover;
      container.style.cursor = hoveredObject ? 'pointer' : 'default';
    }

    // Apply hover glow + scale
    interactiveObjects.forEach(obj => {
      const origScale = originalScales.get(obj);
      const origEmissive = originalEmissive.get(obj);
      const isHovered = obj === hoveredObject;
      const targetScale = isHovered ? 1.2 : 1.0;
      const targetEmissive = isHovered ? origEmissive + 0.6 : origEmissive;

      // Lerp scale
      obj.scale.x += (origScale.x * targetScale - obj.scale.x) * 0.1;
      obj.scale.y += (origScale.y * targetScale - obj.scale.y) * 0.1;
      obj.scale.z += (origScale.z * targetScale - obj.scale.z) * 0.1;

      // Lerp emissive
      obj.material.emissiveIntensity += (targetEmissive - obj.material.emissiveIntensity) * 0.1;
    });

    // Mouse parallax offset for objects
    const parallaxX = smoothMouse.x * 0.4;
    const parallaxY = smoothMouse.y * 0.3;

    // Torus animation + parallax
    torus.rotation.x = Math.sin(t * 0.24) * 0.4 + parallaxY * 0.2;
    torus.rotation.y += 0.004;
    torus.position.y = 1 + Math.sin(t * 0.8) * 0.3;
    torus.position.x = 3.5 + parallaxX * 0.5;
    torus.position.z = -2 + parallaxY * 0.3;

    // Sphere float + parallax
    sphere.position.y = -1.5 + Math.sin(t * 0.5) * 0.3;
    sphere.position.x = 4 + parallaxX * 0.3;
    sphere.position.z = 0 + parallaxY * 0.2;

    // Ico rotation + parallax
    ico.rotation.x += 0.003;
    ico.rotation.z += 0.005;
    ico.position.y = -0.5 + Math.sin(t * 1.2) * 0.2;
    ico.position.x = 2.5 + parallaxX * 0.6;
    ico.position.z = 1 + parallaxY * 0.4;

    // Sparkles gentle movement
    sparkles.rotation.y = t * 0.02;
    sparkles.rotation.x = Math.sin(t * 0.1) * 0.1;

    renderer.render(scene, camera);
  }

  animate();

  // Resize
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
        emissive: 0x03bcca,
        emissiveIntensity: 0,
      });
      const cube = new THREE.Mesh(geo, mat);
      cube.position.set(x, 0, z);
      cube._baseX = x;
      cube._baseZ = z;
      cube._delay = (Math.abs(x) + Math.abs(z)) * 0.5;
      cube._baseOpacity = mat.opacity;
      cubes.push(cube);
      group.add(cube);
    }
  }
  scene.add(group);

  // --- Mouse interaction ---
  const dMouseNDC = { x: 0, y: 0 };
  const dRaycaster = new THREE.Raycaster();
  const dPointer = new THREE.Vector2();
  const dPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
  const dIntersectPoint = new THREE.Vector3();
  let dMouseWorld = new THREE.Vector3(999, 0, 999); // start far away

  container.addEventListener('mousemove', (e) => {
    const rect = container.getBoundingClientRect();
    dMouseNDC.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    dMouseNDC.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
    dPointer.set(dMouseNDC.x, dMouseNDC.y);

    // Project mouse onto the horizontal plane at y=0
    dRaycaster.setFromCamera(dPointer, camera);
    if (dRaycaster.ray.intersectPlane(dPlane, dIntersectPoint)) {
      dMouseWorld = dIntersectPoint.clone();
    }
  });

  container.addEventListener('mouseleave', () => {
    dMouseWorld = new THREE.Vector3(999, 0, 999);
  });

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
      // World position of cube base (accounting for group rotation)
      const worldPos = new THREE.Vector3(cube._baseX, 0, cube._baseZ);
      worldPos.applyMatrix4(group.matrixWorld);

      // Distance from mouse to cube in xz plane
      const dx = worldPos.x - dMouseWorld.x;
      const dz = worldPos.z - dMouseWorld.z;
      const dist = Math.sqrt(dx * dx + dz * dz);

      // Proximity effect: cubes within radius rise up and glow
      const radius = 2.5;
      const influence = Math.max(0, 1 - dist / radius);
      const easedInfluence = influence * influence; // ease-in-out

      const baseScale = 0.3 + Math.sin(t * 0.7 + cube._delay) * 0.2;
      cube.scale.y = baseScale + easedInfluence * 1.2;
      cube.position.y = cube.scale.y / 2;

      // Glow & opacity on proximity
      cube.material.emissiveIntensity += (easedInfluence * 0.5 - cube.material.emissiveIntensity) * 0.15;
      cube.material.opacity += ((cube._baseOpacity + easedInfluence * 0.4) - cube.material.opacity) * 0.15;
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

  // Mouse hover - raycasting
  const pRaycaster = new THREE.Raycaster();
  const pPointer = new THREE.Vector2();
  let pHoveredDodec = false;
  let dodecTargetScale = 0.7;
  let dodecCurrentGlow = 0;

  container.addEventListener('pointerdown', (e) => {
    isDragging = true;
    prevX = e.clientX;
    container.style.cursor = 'grabbing';
  });

  container.addEventListener('pointermove', (e) => {
    const rect = container.getBoundingClientRect();
    pPointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    pPointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

    if (isDragging) {
      const dx = e.clientX - prevX;
      rotationY += dx * 0.005;
      prevX = e.clientX;
    }
  });

  window.addEventListener('pointerup', () => {
    isDragging = false;
    container.style.cursor = 'grab';
  });

  container.addEventListener('mouseleave', () => {
    pPointer.x = 999;
    pPointer.y = 999;
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

    // Raycasting for dodecahedron hover
    pRaycaster.setFromCamera(pPointer, camera);
    const pIntersects = pRaycaster.intersectObject(dodec, true);
    pHoveredDodec = pIntersects.length > 0;

    dodecTargetScale = pHoveredDodec ? 0.85 : 0.7;
    const targetGlow = pHoveredDodec ? 0.5 : 0;

    // Smooth scale
    const currentScale = dodec.scale.x;
    const newScale = currentScale + (dodecTargetScale - currentScale) * 0.08;
    dodec.scale.setScalar(newScale);

    // Smooth glow
    dodecCurrentGlow += (targetGlow - dodecCurrentGlow) * 0.1;
    dodecMat.emissive = new THREE.Color(0x03bcca);
    dodecMat.emissiveIntensity = dodecCurrentGlow;

    // Cursor
    if (!isDragging) {
      container.style.cursor = pHoveredDodec ? 'pointer' : 'grab';
    }

    // Layer animation — mouse proximity effect
    layers.forEach(layer => {
      layer.position.y = layer._baseY + Math.sin(t * 0.8 + layer._delay) * 0.08;
      layer.scale.setScalar(layer._scale + Math.sin(t * 0.5 + layer._delay) * 0.02);
    });

    // Dodecahedron float
    dodec.position.y = 0.5 + Math.sin(t * 0.7) * 0.15;
    dodec.rotation.x += pHoveredDodec ? 0.015 : 0.005;
    dodec.rotation.z += pHoveredDodec ? 0.01 : 0.003;

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
