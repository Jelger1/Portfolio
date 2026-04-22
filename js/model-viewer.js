/* ============================================
   3D MODEL VIEWER — model-viewer.js
   Particle system with glow, color gradient,
   entrance animation, mouse interaction & click explosion
   ============================================ */

document.addEventListener('DOMContentLoaded', () => {
  initModelViewer();
});

function initModelViewer() {
  const container = document.getElementById('model-viewer');
  if (!container || typeof THREE === 'undefined') return;

  /* ---------- Scene ---------- */
  const scene = new THREE.Scene();

  /* ---------- Camera ---------- */
  const camera = new THREE.PerspectiveCamera(
    35,
    container.clientWidth / container.clientHeight,
    0.1,
    100
  );
  camera.position.set(0, 0, 3);

  /* ---------- Renderer ---------- */
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setSize(container.clientWidth, container.clientHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setClearColor(0x000000, 0);
  container.appendChild(renderer.domElement);

  /* ---------- Mouse tracking ---------- */
  const mouse = { x: 0, y: 0 };
  const smoothMouse = { x: 0, y: 0 };
  const localMouse = new THREE.Vector2(9999, 9999);
  const raycaster = new THREE.Raycaster();
  const intersectPlane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);
  const mouseWorld = new THREE.Vector3();

  window.addEventListener('mousemove', (e) => {
    mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;
    const rect = container.getBoundingClientRect();
    localMouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    localMouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
  });

  container.addEventListener('mouseleave', () => {
    localMouse.set(9999, 9999);
  });

  /* ---------- Custom shaders ---------- */
  const vertexShader = `
    attribute float aSize;
    attribute vec3 aColor;
    uniform float uPixelRatio;
    varying vec3 vColor;
    void main() {
      vColor = aColor;
      vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
      gl_PointSize = aSize * uPixelRatio / (-mvPosition.z);
      gl_Position = projectionMatrix * mvPosition;
    }
  `;

  const fragmentShader = `
    varying vec3 vColor;
    void main() {
      float d = length(gl_PointCoord - vec2(0.5));
      if (d > 0.5) discard;
      float core = 1.0 - smoothstep(0.0, 0.12, d);
      float glow = 1.0 - smoothstep(0.05, 0.5, d);
      vec3  color = vColor + vec3(0.4) * core;
      float alpha = glow * 0.85;
      gl_FragColor = vec4(color, alpha);
    }
  `;

  /* ---------- Color palette ---------- */
  const colorA = new THREE.Color(0x03bcca); // teal (--primary)
  const colorB = new THREE.Color(0x5de8d0); // light cyan (--gradient-end)

  /* ---------- State ---------- */
  let particleGroup = null;
  let positionAttr = null;
  let originalPositions = null;
  let scatteredPositions = null;
  let velocities = null;

  let assembleProgress = 0;
  let assembled = false;
  let isExploding = false;
  let explosionTime = 0;

  const ASSEMBLE_SPEED = 0.003;
  const INTERACTION_RADIUS = 0.35;
  const PUSH_STRENGTH = 0.06;
  const RETURN_SPEED = 0.02;

  /* ---------- Load model & create particles ---------- */
  const loader = new THREE.GLTFLoader();

  loader.load(
    'assets/Jelgerin3d.glb',
    (gltf) => {
      const root = gltf.scene;
      const box = new THREE.Box3().setFromObject(root);
      const center = box.getCenter(new THREE.Vector3());
      const size = box.getSize(new THREE.Vector3());

      root.position.sub(center);
      const maxDim = Math.max(size.x, size.y, size.z);
      root.scale.setScalar(2.2 / maxDim);
      root.updateMatrixWorld(true);

      // Collect vertices
      const verts = [];
      root.traverse((child) => {
        if (child.isMesh && child.geometry) {
          const pos = child.geometry.attributes.position;
          const mtx = child.matrixWorld;
          for (let i = 0; i < pos.count; i++) {
            const v = new THREE.Vector3(pos.getX(i), pos.getY(i), pos.getZ(i)).applyMatrix4(mtx);
            verts.push(v.x, v.y, v.z);
          }
        }
      });

      const count = verts.length / 3;
      originalPositions = new Float32Array(verts);

      // Y bounds for color gradient
      let minY = Infinity, maxY = -Infinity;
      for (let i = 0; i < count; i++) {
        const y = originalPositions[i * 3 + 1];
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
      const yRange = maxY - minY || 1;

      // Per-particle attributes: color gradient + random size
      const colors = new Float32Array(count * 3);
      const sizes = new Float32Array(count);
      const tmp = new THREE.Color();

      for (let i = 0; i < count; i++) {
        const t = (originalPositions[i * 3 + 1] - minY) / yRange;
        tmp.copy(colorA).lerp(colorB, t);
        colors[i * 3]     = tmp.r;
        colors[i * 3 + 1] = tmp.g;
        colors[i * 3 + 2] = tmp.b;

        sizes[i] = 8 + Math.random() * 6;
      }

      // Scattered start positions (for entrance)
      scatteredPositions = new Float32Array(count * 3);
      for (let i = 0; i < count * 3; i++) {
        scatteredPositions[i] = (Math.random() - 0.5) * 8;
      }

      // Velocities for explosion
      velocities = new Float32Array(count * 3);

      // Build geometry (start at scattered positions)
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.Float32BufferAttribute(new Float32Array(scatteredPositions), 3));
      geo.setAttribute('aSize',  new THREE.Float32BufferAttribute(sizes, 1));
      geo.setAttribute('aColor', new THREE.Float32BufferAttribute(colors, 3));
      positionAttr = geo.attributes.position;

      // Shader material
      const mat = new THREE.ShaderMaterial({
        vertexShader,
        fragmentShader,
        uniforms: {
          uPixelRatio: { value: Math.min(window.devicePixelRatio, 2) },
        },
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      });

      const points = new THREE.Points(geo, mat);
      particleGroup = new THREE.Group();
      particleGroup.add(points);
      scene.add(particleGroup);

      container.style.cursor = 'pointer';

      // Start entrance via IntersectionObserver
      const section = container.closest('section') || container;
      const obs = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting && assembleProgress === 0) {
            assembleProgress = 0.001;
            obs.disconnect();
          }
        },
        { threshold: 0.15 }
      );
      obs.observe(section);
    },
    undefined,
    (err) => console.warn('Could not load 3D model:', err)
  );

  /* ---------- Click → explode ---------- */
  container.addEventListener('click', () => {
    if (!assembled || isExploding || !positionAttr) return;

    isExploding = true;
    explosionTime = 0;

    const count = positionAttr.count;
    for (let i = 0; i < count; i++) {
      const i3 = i * 3;
      const ox = originalPositions[i3];
      const oy = originalPositions[i3 + 1];
      const oz = originalPositions[i3 + 2];
      const len = Math.sqrt(ox * ox + oy * oy + oz * oz) || 1;
      const f = 0.015 + Math.random() * 0.025;
      velocities[i3]     = (ox / len) * f + (Math.random() - 0.5) * 0.012;
      velocities[i3 + 1] = (oy / len) * f + (Math.random() - 0.5) * 0.012;
      velocities[i3 + 2] = (oz / len) * f + (Math.random() - 0.5) * 0.012;
    }
  });

  /* ---------- Animation loop ---------- */
  const clock = new THREE.Clock();

  function animate() {
    requestAnimationFrame(animate);
    const t = clock.getElapsedTime();

    smoothMouse.x += (mouse.x - smoothMouse.x) * 0.02;
    smoothMouse.y += (mouse.y - smoothMouse.y) * 0.02;

    if (particleGroup && positionAttr) {
      // Global rotation & float
      particleGroup.rotation.y = -Math.PI / 2 + smoothMouse.x * 0.4;
      particleGroup.rotation.x = -smoothMouse.y * 0.2;
      particleGroup.position.y = -0.5 + Math.sin(t * 0.8) * 0.05;
      particleGroup.position.x = Math.sin(t * 0.5) * 0.03;

      const arr = positionAttr.array;
      const count = positionAttr.count;

      /* ---- Entrance animation ---- */
      if (assembleProgress > 0 && !assembled) {
        assembleProgress = Math.min(1, assembleProgress + ASSEMBLE_SPEED);
        const p = assembleProgress;
        const ease = p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2;

        for (let i = 0; i < count; i++) {
          const i3 = i * 3;
          arr[i3]     = scatteredPositions[i3]     + (originalPositions[i3]     - scatteredPositions[i3])     * ease;
          arr[i3 + 1] = scatteredPositions[i3 + 1] + (originalPositions[i3 + 1] - scatteredPositions[i3 + 1]) * ease;
          arr[i3 + 2] = scatteredPositions[i3 + 2] + (originalPositions[i3 + 2] - scatteredPositions[i3 + 2]) * ease;
        }
        positionAttr.needsUpdate = true;
        if (assembleProgress >= 1) assembled = true;
      }

      /* ---- Explosion ---- */
      else if (isExploding) {
        explosionTime += 0.016;

        if (explosionTime < 1.8) {
          for (let i = 0; i < count; i++) {
            const i3 = i * 3;
            arr[i3]     += velocities[i3];
            arr[i3 + 1] += velocities[i3 + 1];
            arr[i3 + 2] += velocities[i3 + 2];
            velocities[i3]     *= 0.99;
            velocities[i3 + 1] *= 0.99;
            velocities[i3 + 2] *= 0.99;
          }
        } else {
          let done = true;
          for (let i = 0; i < count; i++) {
            const i3 = i * 3;
            arr[i3]     += (originalPositions[i3]     - arr[i3])     * 0.008;
            arr[i3 + 1] += (originalPositions[i3 + 1] - arr[i3 + 1]) * 0.008;
            arr[i3 + 2] += (originalPositions[i3 + 2] - arr[i3 + 2]) * 0.008;
            const dx = originalPositions[i3]     - arr[i3];
            const dy = originalPositions[i3 + 1] - arr[i3 + 1];
            const dz = originalPositions[i3 + 2] - arr[i3 + 2];
            if (dx * dx + dy * dy + dz * dz > 0.00005) done = false;
          }
          if (done) isExploding = false;
        }
        positionAttr.needsUpdate = true;
      }

      /* ---- Mouse push (idle) ---- */
      else if (assembled) {
        raycaster.setFromCamera(localMouse, camera);
        raycaster.ray.intersectPlane(intersectPlane, mouseWorld);
        const inv = new THREE.Matrix4().copy(particleGroup.matrixWorld).invert();
        const lm = mouseWorld.clone().applyMatrix4(inv);
        const rSq = INTERACTION_RADIUS * INTERACTION_RADIUS;

        for (let i = 0; i < count; i++) {
          const i3 = i * 3;
          const ox = originalPositions[i3];
          const oy = originalPositions[i3 + 1];
          const oz = originalPositions[i3 + 2];
          const dx = ox - lm.x;
          const dy = oy - lm.y;
          const dz = oz - lm.z;
          const dSq = dx * dx + dy * dy + dz * dz;

          if (dSq < rSq && dSq > 0.0001) {
            const d = Math.sqrt(dSq);
            const f = (1 - d / INTERACTION_RADIUS) * PUSH_STRENGTH;
            arr[i3]     = ox + (dx / d) * f;
            arr[i3 + 1] = oy + (dy / d) * f;
            arr[i3 + 2] = oz + (dz / d) * f;
          } else {
            arr[i3]     += (ox - arr[i3])     * RETURN_SPEED;
            arr[i3 + 1] += (oy - arr[i3 + 1]) * RETURN_SPEED;
            arr[i3 + 2] += (oz - arr[i3 + 2]) * RETURN_SPEED;
          }
        }
        positionAttr.needsUpdate = true;
      }
    }

    renderer.render(scene, camera);
  }

  animate();

  /* ---------- Resize ---------- */
  function onResize() {
    if (!container.clientWidth || !container.clientHeight) return;
    camera.aspect = container.clientWidth / container.clientHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(container.clientWidth, container.clientHeight);
  }

  window.addEventListener('resize', onResize);
}
