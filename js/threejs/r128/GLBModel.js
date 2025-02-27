/**
 * GLBModel
 * @autor: funnyzak
 * @email: silenceace@gmail.com
 * @Usage:
  <div id="loading-screen">
    <h3 id="loading-text">Loading...</h3>
    <div id="progress-bar"><div id="progress"></div></div>
  </div>
  <div id="container"></div>

  const config = {
    containerId: 'container',
    loadingScreenId: 'loading-screen',
    modelPath: '../../assets/models/glb/gold_coin.glb',
    autoRotate: true,
    rotationSpeed: 0.002,
    cameraPosition: { x: 0, y: 0, z: 3 },
    modelRotation: { x: 0, y: 0, z: 0 },
    lightIntensity: 0.8,
    ambientLightIntensity: 0.7,
    controls: {
      enableDamping: true,
      dampingFactor: 0.05,
      screenSpacePanning: false,
      minDistance: 1,
      maxDistance: 10,
      maxPolarAngle: Math.PI / 2,
    },
  };

  GLBModel.init(config);
 */
class GLBModel {
  static init(config) {
    this.debug = config.debug || false;
    this.container = document.getElementById(config.containerId);
    this.autoRotate = config.autoRotate;
    this.rotationSpeed = config.rotationSpeed;
    this.cameraPosition = config.cameraPosition;
    this.modelRotation = config.modelRotation || { x: 0, y: 0, z: 0 };
    this.lightIntensity = config.lightIntensity;
    this.ambientLightIntensity = config.ambientLightIntensity;
    this.enableControls = config.enableControls !== undefined ? config.enableControls : true;
    this.controlsConfig = {
      enableDamping: true,
      dampingFactor: 0.05,
      screenSpacePanning: false,
      minDistance: 1,
      maxDistance: 10,
      maxPolarAngle: Math.PI / 2,
      enablePan: true,
      enableZoom: true,
      ...config.controls,
    };
    this.modelPath = config.modelPath;
    this.enabledShadow = config.enabledShadow || false;
    this.shadowAngle = config.shadowAngle || { x: 0, y: 1, z: 0 }; // default light shining from top

    this.initLoadingScreen(config.loadingScreenId);
    this.initScene();
    this.loadModel();
    this.animate();
  }

  static initLoadingScreen(loadingScreenId) {
    this.loadingScreen = document.getElementById(loadingScreenId);
    this.progressBar = this.loadingScreen.querySelector('#progress-bar');
    this.progressElement = this.loadingScreen.querySelector('#progress');
    this.loadingText = this.loadingScreen.querySelector('#loading-text');
  }

  static initScene() {
    this.scene = new THREE.Scene();

    this.camera = new THREE.PerspectiveCamera(
      75,
      window.innerWidth / window.innerHeight,
      0.1,
      1000,
    );
    this.camera.position.set(this.cameraPosition.x, this.cameraPosition.y, this.cameraPosition.z);

    this.renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setClearColor(0x000000, 0);
    this.renderer.outputEncoding = THREE.sRGBEncoding;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1;

    if (this.enabledShadow) {
      this.renderer.shadowMap.enabled = true;
      this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    }
    this.container.appendChild(this.renderer.domElement);

    if (this.enableControls) {
      this.controls = new THREE.OrbitControls(this.camera, this.renderer.domElement);
      Object.assign(this.controls, this.controlsConfig);

      this.controls.enablePan = this.controlsConfig.enablePan;
      this.controls.enableZoom = this.controlsConfig.enableZoom;
    }

    const ambientLight = new THREE.AmbientLight(0xffffff, this.ambientLightIntensity);
    this.scene.add(ambientLight);

    const directionalLight1 = new THREE.DirectionalLight(0xffffff, this.lightIntensity);
    directionalLight1.position.set(1, 1, 1); // light shining from right top
    this.scene.add(directionalLight1);

    const directionalLight2 = new THREE.DirectionalLight(0xffffff, this.lightIntensity);
    directionalLight2.position.set(-1, -1, -1); // light shining from behind
    this.scene.add(directionalLight2);

    this.mainLight = new THREE.DirectionalLight(0xffffff, this.lightIntensity);
    this.mainLight.position.set(this.shadowAngle.x, this.shadowAngle.y, this.shadowAngle.z);

    this.mainLight.castShadow = this.enabledShadow;
    this.scene.add(this.mainLight);

    if (this.enabledShadow) {
      this.mainLight.shadow.mapSize.width = 1024;
      this.mainLight.shadow.mapSize.height = 1024;
      this.mainLight.shadow.camera.near = 1;
      this.mainLight.shadow.camera.far = 10;

      if (this.debug) {
        const helper = new THREE.DirectionalLightHelper(this.mainLight, 5);
        this.scene.add(helper);
      }

      const planeGeometry = new THREE.PlaneGeometry(50, 50); // 增大平面尺寸
      const planeMaterial = new THREE.ShadowMaterial({ opacity: 0.3 });
      this.shadowPlane = new THREE.Mesh(planeGeometry, planeMaterial);
      this.shadowPlane.rotation.x = -Math.PI / 2;
      this.shadowPlane.position.y = -1;
      this.shadowPlane.receiveShadow = true;
      this.scene.add(this.shadowPlane);
    }

    window.addEventListener('resize', this.onWindowResize.bind(this), false);
  }

  static loadModel() {
    const loader = new THREE.GLTFLoader();
    const startTime = Date.now();
    let simulatedProgress = 0;

    loader.load(
      this.modelPath,
      (gltf) => {
        this.model = gltf.scene;

        this.model.rotation.x = this.modelRotation.x;
        this.model.rotation.y = this.modelRotation.y;
        this.model.rotation.z = this.modelRotation.z;

        const box = new THREE.Box3().setFromObject(this.model);
        const center = box.getCenter(new THREE.Vector3());
        const size = box.getSize(new THREE.Vector3());

        const maxDim = Math.max(size.x, size.y, size.z);
        const scale = 2 / maxDim;
        this.model.scale.setScalar(scale);
        this.model.position.sub(center.multiplyScalar(scale));

        this.model.traverse((node) => {
          if (node.isMesh) {
            node.castShadow = this.enabledShadow;
            node.receiveShadow = this.enabledShadow;
          }
        });

        this.scene.add(this.model);
        this.loadingScreen.style.display = 'none';
      },
      (xhr) => {
        let percentComplete;
        if (xhr.total) {
          percentComplete = (xhr.loaded / xhr.total) * 100;
        } else {
          const elapsed = Date.now() - startTime;
          simulatedProgress = Math.min((elapsed / 25000) * 100, 97);
          percentComplete = simulatedProgress;
        }
        this.progressElement.style.width = percentComplete + '%';
        this.loadingText.textContent =
          percentComplete >= 100 ? 'Finalizing...' : 'Loading ' + Math.round(percentComplete) + '%';
      },
      (error) => {
        console.error('An error happened', error);
      },
    );
  }

  static onWindowResize() {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  static animate() {
    requestAnimationFrame(this.animate.bind(this));

    if (this.enableControls) {
      this.controls.update();
    }

    if (this.autoRotate && this.scene.children.length > 0) {
      this.scene.rotation.y += this.rotationSpeed;
    }

    this.renderer.render(this.scene, this.camera);
  }
}
