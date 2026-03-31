/* ============================================
   3D MODEL VIEWER — model-viewer.js
   Loads Jelgerin3d.glb and follows mouse
   ============================================ */

document.addEventListener('DOMContentLoaded', () => {
  initModelViewer();
});

function initModelViewer() {
  const container = document.getElementById('model-viewer');
  if (!container || typeof THREE === 'undefined') return;

  // Scene
  const scene = new THREE.Scene();

  // Camera
  const camera = new THREE.PerspectiveCamera(
    35,
    container.clientWidth / container.clientHeight,
    0.1,
    100
  );
  camera.position.set(0, 0, 3);

  // Renderer
  const renderer = new THREE.WebGLRenderer({
    antialias: true,
    alpha: true,
  });
  renderer.setSize(container.clientWidth, container.clientHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setClearColor(0x000000, 0);
  renderer.outputEncoding = THREE.sRGBEncoding;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.2;
  container.appendChild(renderer.domElement);

  // Lights
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
  scene.add(ambientLight);

  const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
  dirLight.position.set(3, 4, 5);
  scene.add(dirLight);

  const fillLight = new THREE.DirectionalLight(0x03bcca, 0.4);
  fillLight.position.set(-3, 2, 2);
  scene.add(fillLight);

  const rimLight = new THREE.DirectionalLight(0x5de8d0, 0.3);
  rimLight.position.set(0, -2, -3);
  scene.add(rimLight);

  // Mouse tracking
  const mouse = { x: 0, y: 0 };
  const smoothMouse = { x: 0, y: 0 };

  window.addEventListener('mousemove', (e) => {
    mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;
  });

  // Load GLB model
  let model = null;
  const loader = new THREE.GLTFLoader();

  loader.load(
    'assets/Jelgerin3d.glb',
    (gltf) => {
      model = gltf.scene;

      // Center and scale the model
      const box = new THREE.Box3().setFromObject(model);
      const center = box.getCenter(new THREE.Vector3());
      const size = box.getSize(new THREE.Vector3());

      model.position.sub(center);

      // Scale to fit nicely in the container
      const maxDim = Math.max(size.x, size.y, size.z);
      const scale = 2.2 / maxDim;
      model.scale.setScalar(scale);

      // Apply shiny metallic material matching hero section style
      const shinyMaterial = new THREE.MeshStandardMaterial({
        color: 0x03bcca,
        roughness: 0.15,
        metalness: 0.85,
        emissive: 0x03bcca,
        emissiveIntensity: 0.15,
      });

      model.traverse((child) => {
        if (child.isMesh) {
          child.material = shinyMaterial;
        }
      });

      scene.add(model);
    },
    undefined,
    (error) => {
      console.warn('Could not load 3D model:', error);
    }
  );

  // Animation loop
  const clock = new THREE.Clock();

  function animate() {
    requestAnimationFrame(animate);
    const t = clock.getElapsedTime();

    // Smooth lerp towards mouse
    smoothMouse.x += (mouse.x - smoothMouse.x) * 0.05;
    smoothMouse.y += (mouse.y - smoothMouse.y) * 0.05;

    if (model) {
      // Base rotation 90° left (-π/2) + mouse movement
      model.rotation.y = -Math.PI / 2 + smoothMouse.x * 0.4;
      model.rotation.x = -smoothMouse.y * 0.2;

      // Gentle floating idle animation, shifted 10% down
      model.position.y = -0.5 + Math.sin(t * 0.8) * 0.05;
      model.position.x = Math.sin(t * 0.5) * 0.03;
    }

    renderer.render(scene, camera);
  }

  animate();

  // Resize handler
  function onResize() {
    if (!container.clientWidth || !container.clientHeight) return;
    camera.aspect = container.clientWidth / container.clientHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(container.clientWidth, container.clientHeight);
  }

  window.addEventListener('resize', onResize);
}
