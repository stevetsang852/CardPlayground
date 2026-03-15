import * as THREE from 'three';

export class CardScene {
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  renderer: THREE.WebGLRenderer;
  private animationFrameId: number | null = null;

  constructor(container: HTMLElement) {
    // Scene
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x1a1a2e);

    // Camera
    const aspect = container.clientWidth / container.clientHeight;
    this.camera = new THREE.PerspectiveCamera(60, aspect, 0.1, 1000);
    this.camera.position.set(0, 0, 5);

    // Renderer
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    this.renderer.setSize(container.clientWidth, container.clientHeight);
    this.renderer.setPixelRatio(window.devicePixelRatio);
    container.appendChild(this.renderer.domElement);

    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    this.scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 1.0);
    directionalLight.position.set(5, 5, 5);
    this.scene.add(directionalLight);

    const pointLight = new THREE.PointLight(0x4444ff, 0.8, 20);
    pointLight.position.set(-3, 3, 3);
    this.scene.add(pointLight);

    // Start render loop
    this.startRenderLoop();
  }

  private startRenderLoop(): void {
    const loop = () => {
      this.animationFrameId = requestAnimationFrame(loop);
      this.render();
    };
    loop();
  }

  render(): void {
    this.renderer.render(this.scene, this.camera);
  }

  dispose(): void {
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
    this.renderer.dispose();
    this.renderer.domElement.remove();
    this.scene.clear();
  }
}
