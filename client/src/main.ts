// Card Mystery Realm — offline single-player entry point
// All game logic lives in ui.ts (loaded directly by index.html).
// This module exposes the animation/scene utilities for use by ui.ts if needed.

import * as THREE from 'three';
import { CardScene, CardAnimations, SynthesisAnimations, EventAnimations } from './animations';
import type { EventType } from './animations';

export type { EventType };

export interface DrawnCard {
  id: string;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  name: string;
}

export interface DrawResponse {
  cards: DrawnCard[];
  legendaryCards?: DrawnCard[];
  nearMissCards?: DrawnCard[];
}

export interface SynthesisResponse {
  success: boolean;
  outputCard?: DrawnCard;
}

export interface EventResponse {
  eventType: EventType;
}

/** Thin wrapper around the Three.js animation modules. */
export class GameAnimations {
  private container: HTMLElement;

  constructor(container: HTMLElement) {
    this.container = container;
  }

  handleDrawResponse(response: DrawResponse): void {
    const cardScene = new CardScene(this.container);
    const cardAnimations = new CardAnimations(cardScene);
    const cardMeshes = response.cards.map(() => this._cardMesh());
    cardAnimations.createRevealTimeline(cardMeshes);

    for (const _card of response.legendaryCards ?? []) {
      cardAnimations.createLegendaryParticles(new THREE.Vector3(0, 0, 0));
    }

    for (let i = 0; i < (response.nearMissCards?.length ?? 0); i++) {
      cardAnimations.playNearMissFlash(this._cardMesh(), this._cardMesh());
    }
  }

  handleSynthesisResponse(response: SynthesisResponse): void {
    const cardScene = new CardScene(this.container);
    const synthesisAnimations = new SynthesisAnimations(cardScene);
    if (response.success) {
      synthesisAnimations.playSuccessAnimation(new THREE.Vector3(0, 0, 0));
    } else {
      synthesisAnimations.playFailureAnimation(this._cardMesh());
    }
  }

  handleEventResponse(response: EventResponse): void {
    const cardScene = new CardScene(this.container);
    const eventAnimations = new EventAnimations(cardScene);
    eventAnimations.playEventAnimation(response.eventType);
  }

  private _cardMesh(): THREE.Mesh {
    return new THREE.Mesh(
      new THREE.PlaneGeometry(1.0, 1.4),
      new THREE.MeshStandardMaterial({ color: 0x4444aa }),
    );
  }
}
