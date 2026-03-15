import * as THREE from 'three';
import { gsap } from 'gsap';
import { CardScene } from './CardScene';

export class CardAnimations {
  constructor(private scene: CardScene) {}

  /**
   * Task 26.2: 3D card flip animation using Three.js rotation
   */
  flipCard(cardMesh: THREE.Mesh, onComplete?: () => void): void {
    const tl = gsap.timeline({ onComplete });

    // Flip card 180 degrees on Y axis to reveal back → front
    tl.to(cardMesh.rotation, {
      y: Math.PI,
      duration: 0.6,
      ease: 'power2.inOut',
    }).to(cardMesh.rotation, {
      y: Math.PI * 2,
      duration: 0.6,
      ease: 'power2.inOut',
    });

    // Scale pulse during flip
    tl.to(
      cardMesh.scale,
      { x: 1.1, y: 1.1, z: 1.1, duration: 0.3, ease: 'power1.out' },
      0.3
    ).to(
      cardMesh.scale,
      { x: 1, y: 1, z: 1, duration: 0.3, ease: 'power1.in' },
      0.6
    );
  }

  /**
   * Task 26.3: Gold particle system for legendary card reveals
   */
  createLegendaryParticles(position: THREE.Vector3): THREE.Points {
    const count = 200;
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(count * 3);
    const velocities: THREE.Vector3[] = [];

    for (let i = 0; i < count; i++) {
      positions[i * 3] = position.x;
      positions[i * 3 + 1] = position.y;
      positions[i * 3 + 2] = position.z;

      velocities.push(
        new THREE.Vector3(
          (Math.random() - 0.5) * 0.1,
          Math.random() * 0.1 + 0.02,
          (Math.random() - 0.5) * 0.1
        )
      );
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    const material = new THREE.PointsMaterial({
      color: 0xffd700,
      size: 0.08,
      transparent: true,
      opacity: 1.0,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    const particles = new THREE.Points(geometry, material);
    this.scene.scene.add(particles);

    // Animate particles upward and fade out
    let elapsed = 0;
    const duration = 2.0;
    const posAttr = geometry.attributes['position'] as THREE.BufferAttribute;

    const animate = () => {
      elapsed += 0.016;
      if (elapsed > duration) {
        this.scene.scene.remove(particles);
        geometry.dispose();
        material.dispose();
        return;
      }

      for (let i = 0; i < count; i++) {
        posAttr.setXYZ(
          i,
          posAttr.getX(i) + velocities[i].x,
          posAttr.getY(i) + velocities[i].y,
          posAttr.getZ(i) + velocities[i].z
        );
        velocities[i].y -= 0.002; // gravity
      }
      posAttr.needsUpdate = true;
      material.opacity = 1 - elapsed / duration;

      requestAnimationFrame(animate);
    };
    animate();

    return particles;
  }

  /**
   * Task 26.4: Near-miss flash animation — briefly shows rare card then transitions to actual
   */
  playNearMissFlash(
    nearMissCard: THREE.Mesh,
    actualCard: THREE.Mesh,
    onComplete?: () => void
  ): void {
    // Start: show near-miss card, hide actual
    nearMissCard.visible = true;
    actualCard.visible = false;

    const tl = gsap.timeline({
      onComplete: () => {
        nearMissCard.visible = false;
        onComplete?.();
      },
    });

    // Flash the near-miss card with a bright emissive pulse
    const nearMissMat = nearMissCard.material as THREE.MeshStandardMaterial;
    if (nearMissMat && 'emissive' in nearMissMat) {
      tl.to(nearMissMat.emissive, { r: 1, g: 1, b: 1, duration: 0.1 })
        .to(nearMissMat.emissive, { r: 0, g: 0, b: 0, duration: 0.1 })
        .to(nearMissMat.emissive, { r: 1, g: 1, b: 1, duration: 0.1 })
        .to(nearMissMat.emissive, { r: 0, g: 0, b: 0, duration: 0.1 });
    } else {
      // Fallback: scale flash
      tl.to(nearMissCard.scale, { x: 1.2, y: 1.2, duration: 0.15 })
        .to(nearMissCard.scale, { x: 1, y: 1, duration: 0.15 })
        .to(nearMissCard.scale, { x: 1.2, y: 1.2, duration: 0.15 })
        .to(nearMissCard.scale, { x: 1, y: 1, duration: 0.15 });
    }

    // Hold near-miss briefly, then swap to actual card
    tl.to({}, { duration: 0.3 }).call(() => {
      nearMissCard.visible = false;
      actualCard.visible = true;
    });

    // Reveal actual card with a flip
    tl.from(actualCard.rotation, { y: -Math.PI / 2, duration: 0.4, ease: 'back.out(1.7)' });
  }

  /**
   * Task 26.5: GSAP timeline for sequenced card reveal
   */
  createRevealTimeline(cards: THREE.Mesh[]): gsap.core.Timeline {
    const tl = gsap.timeline();

    cards.forEach((card, i) => {
      // Each card flips in with a stagger
      tl.from(
        card.rotation,
        { y: -Math.PI, duration: 0.5, ease: 'power2.out' },
        i * 0.3
      ).from(
        card.position,
        { y: card.position.y - 2, duration: 0.5, ease: 'back.out(1.4)' },
        i * 0.3
      );
    });

    return tl;
  }
}
