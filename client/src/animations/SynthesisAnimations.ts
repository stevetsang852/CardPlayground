import * as THREE from 'three';
import { gsap } from 'gsap';
import { CardScene } from './CardScene';

function playTone(
  frequency: number,
  duration: number,
  pitchVariance = 0.1,
  type: OscillatorType = 'sine'
): void {
  try {
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.type = type;
    osc.frequency.value = frequency * (1 + (Math.random() - 0.5) * pitchVariance);

    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);

    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + duration);

    osc.onended = () => ctx.close();
  } catch {
    // AudioContext not available (e.g., test environment)
  }
}

export class SynthesisAnimations {
  constructor(private scene: CardScene) {}

  /**
   * Task 26.6: Success animation — fire and lightning particles + sound
   */
  playSuccessAnimation(position: THREE.Vector3, onComplete?: () => void): void {
    // Fire particles (orange/red)
    const fireParticles = this.createFireParticles(position);
    // Lightning particles (white/blue)
    const lightningParticles = this.createLightningParticles(position);

    this.scene.scene.add(fireParticles);
    this.scene.scene.add(lightningParticles);

    // Play success sound — ascending tones with randomized pitch
    playTone(440, 0.3, 0.05, 'sine');
    setTimeout(() => playTone(550, 0.3, 0.05, 'sine'), 150);
    setTimeout(() => playTone(660, 0.5, 0.05, 'triangle'), 300);

    // Clean up after animation
    setTimeout(() => {
      this.scene.scene.remove(fireParticles);
      this.scene.scene.remove(lightningParticles);
      onComplete?.();
    }, 2000);
  }

  private createFireParticles(position: THREE.Vector3): THREE.Points {
    const count = 150;
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(count * 3);

    for (let i = 0; i < count; i++) {
      positions[i * 3] = position.x + (Math.random() - 0.5) * 0.5;
      positions[i * 3 + 1] = position.y;
      positions[i * 3 + 2] = position.z + (Math.random() - 0.5) * 0.5;
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    const material = new THREE.PointsMaterial({
      color: 0xff4400,
      size: 0.12,
      transparent: true,
      opacity: 0.9,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    const particles = new THREE.Points(geometry, material);

    // Animate upward
    gsap.to(particles.position, { y: position.y + 2, duration: 1.5, ease: 'power1.out' });
    gsap.to(material, { opacity: 0, duration: 1.5, delay: 0.5 });

    return particles;
  }

  private createLightningParticles(position: THREE.Vector3): THREE.Points {
    const count = 80;
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(count * 3);

    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const radius = Math.random() * 1.5;
      positions[i * 3] = position.x + Math.cos(angle) * radius;
      positions[i * 3 + 1] = position.y + (Math.random() - 0.5) * 2;
      positions[i * 3 + 2] = position.z + Math.sin(angle) * radius;
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    const material = new THREE.PointsMaterial({
      color: 0x88aaff,
      size: 0.06,
      transparent: true,
      opacity: 1.0,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    const particles = new THREE.Points(geometry, material);

    // Flash in and out
    gsap.fromTo(material, { opacity: 0 }, { opacity: 1, duration: 0.1, yoyo: true, repeat: 5 });

    return particles;
  }

  /**
   * Task 26.8: Failure animation — card breaking with physics-like dispersion + sound
   */
  playFailureAnimation(cardMesh: THREE.Mesh, onComplete?: () => void): void {
    const fragments = this.createCardFragments(cardMesh);
    cardMesh.visible = false;

    fragments.forEach((frag) => this.scene.scene.add(frag));

    // Animate fragments dispersing outward
    fragments.forEach((frag) => {
      const dir = new THREE.Vector3(
        (Math.random() - 0.5) * 4,
        (Math.random() - 0.5) * 4,
        (Math.random() - 0.5) * 2
      );

      gsap.to(frag.position, {
        x: frag.position.x + dir.x,
        y: frag.position.y + dir.y,
        z: frag.position.z + dir.z,
        duration: 0.8,
        ease: 'power2.out',
      });

      gsap.to(frag.rotation, {
        x: Math.random() * Math.PI * 2,
        y: Math.random() * Math.PI * 2,
        z: Math.random() * Math.PI * 2,
        duration: 0.8,
        ease: 'power1.out',
      });

      gsap.to((frag.material as THREE.MeshStandardMaterial), {
        opacity: 0,
        duration: 0.8,
        delay: 0.2,
      });
    });

    // Play failure sound — descending dissonant tones
    playTone(300, 0.4, 0.15, 'sawtooth');
    setTimeout(() => playTone(220, 0.5, 0.15, 'sawtooth'), 200);
    setTimeout(() => playTone(150, 0.6, 0.1, 'square'), 400);

    setTimeout(() => {
      fragments.forEach((frag) => {
        this.scene.scene.remove(frag);
        (frag.geometry as THREE.BufferGeometry).dispose();
        (frag.material as THREE.Material).dispose();
      });
      cardMesh.visible = true;
      onComplete?.();
    }, 1200);
  }

  private createCardFragments(cardMesh: THREE.Mesh): THREE.Mesh[] {
    const fragments: THREE.Mesh[] = [];
    const rows = 3;
    const cols = 4;

    const cardWidth = 1.0;
    const cardHeight = 1.4;
    const fragW = cardWidth / cols;
    const fragH = cardHeight / rows;

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const geo = new THREE.PlaneGeometry(fragW * 0.9, fragH * 0.9);
        const mat = new THREE.MeshStandardMaterial({
          color: (cardMesh.material as THREE.MeshStandardMaterial).color ?? 0x888888,
          transparent: true,
          opacity: 1.0,
          side: THREE.DoubleSide,
        });

        const frag = new THREE.Mesh(geo, mat);
        frag.position.set(
          cardMesh.position.x + (c - cols / 2 + 0.5) * fragW,
          cardMesh.position.y + (r - rows / 2 + 0.5) * fragH,
          cardMesh.position.z
        );

        fragments.push(frag);
      }
    }

    return fragments;
  }
}
