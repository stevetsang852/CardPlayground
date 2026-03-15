import * as THREE from 'three';
import { gsap } from 'gsap';
import { CardScene } from './CardScene';

export type EventType = 'merchant' | 'storm' | 'lucky' | 'copy';

interface EventConfig {
  color: number;
  particleColor: number;
  tones: number[];
  oscillatorType: OscillatorType;
}

const EVENT_CONFIGS: Record<EventType, EventConfig> = {
  merchant: {
    color: 0xffd700,
    particleColor: 0xffaa00,
    tones: [523, 659, 784],
    oscillatorType: 'sine',
  },
  storm: {
    color: 0x334466,
    particleColor: 0x88aaff,
    tones: [110, 130, 100],
    oscillatorType: 'sawtooth',
  },
  lucky: {
    color: 0x00cc44,
    particleColor: 0x44ff88,
    tones: [660, 880, 1100],
    oscillatorType: 'triangle',
  },
  copy: {
    color: 0xaa44ff,
    particleColor: 0xcc88ff,
    tones: [440, 440, 550],
    oscillatorType: 'sine',
  },
};

function playEventMusic(config: EventConfig): void {
  try {
    const ctx = new AudioContext();
    config.tones.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.type = config.oscillatorType;
      // Randomize pitch slightly for character
      osc.frequency.value = freq * (1 + (Math.random() - 0.5) * 0.04);

      const startTime = ctx.currentTime + i * 0.2;
      gain.gain.setValueAtTime(0, startTime);
      gain.gain.linearRampToValueAtTime(0.25, startTime + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.6);

      osc.start(startTime);
      osc.stop(startTime + 0.6);
    });

    setTimeout(() => ctx.close(), 2000);
  } catch {
    // AudioContext unavailable
  }
}

export class EventAnimations {
  constructor(private scene: CardScene) {}

  /**
   * Task 26.9: Full-screen event animation with distinctive music
   */
  playEventAnimation(eventType: EventType, onComplete?: () => void): void {
    const config = EVENT_CONFIGS[eventType];

    // Full-screen overlay plane
    const overlayGeo = new THREE.PlaneGeometry(20, 20);
    const overlayMat = new THREE.MeshBasicMaterial({
      color: config.color,
      transparent: true,
      opacity: 0,
      depthWrite: false,
    });
    const overlay = new THREE.Mesh(overlayGeo, overlayMat);
    overlay.position.set(0, 0, 2);
    this.scene.scene.add(overlay);

    // Particle burst
    const particles = this.createEventParticles(config.particleColor);
    this.scene.scene.add(particles);

    // Play distinctive event music
    playEventMusic(config);

    // Animation timeline
    const tl = gsap.timeline({
      onComplete: () => {
        this.scene.scene.remove(overlay);
        this.scene.scene.remove(particles);
        overlayGeo.dispose();
        overlayMat.dispose();
        onComplete?.();
      },
    });

    // Flash overlay in and out
    tl.to(overlayMat, { opacity: 0.6, duration: 0.2, ease: 'power2.in' })
      .to(overlayMat, { opacity: 0, duration: 0.4, ease: 'power2.out' })
      .to(overlayMat, { opacity: 0.3, duration: 0.15 })
      .to(overlayMat, { opacity: 0, duration: 0.3 });

    // Scale the particle system for dramatic effect
    tl.from(particles.scale, { x: 0, y: 0, z: 0, duration: 0.3, ease: 'back.out(2)' }, 0);
    tl.to(particles.scale, { x: 2, y: 2, z: 2, duration: 0.8, ease: 'power1.out' }, 0.3);
    tl.to((particles.material as THREE.PointsMaterial), { opacity: 0, duration: 0.5 }, 0.8);
  }

  private createEventParticles(color: number): THREE.Points {
    const count = 300;
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(count * 3);

    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const radius = Math.random() * 3;
      positions[i * 3] = Math.cos(angle) * radius;
      positions[i * 3 + 1] = Math.sin(angle) * radius;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 2;
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    const material = new THREE.PointsMaterial({
      color,
      size: 0.1,
      transparent: true,
      opacity: 1.0,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    return new THREE.Points(geometry, material);
  }
}
