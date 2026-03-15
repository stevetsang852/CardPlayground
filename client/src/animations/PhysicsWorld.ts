/**
 * Task 26.7: Ammo.js physics world wrapper
 *
 * Ammo.js is a WebAssembly port of Bullet physics. It is loaded as a global
 * script (not an ES module), so we access it via `(window as any).Ammo`.
 * In environments where Ammo is unavailable (e.g., tests, SSR), all methods
 * degrade gracefully.
 */

interface AmmoBody {
  mesh: any;
  body: any;
  transform: any;
}

export class PhysicsWorld {
  private physicsWorld: any = null;
  private bodies: AmmoBody[] = [];
  private ammo: any = null;
  private initialized = false;

  async initialize(): Promise<void> {
    const Ammo = (typeof window !== 'undefined' ? (window as any).Ammo : undefined);

    if (!Ammo) {
      // Ammo.js not loaded — physics will be skipped gracefully
      this.initialized = false;
      return;
    }

    // Ammo may be a factory function that returns a promise
    this.ammo = typeof Ammo === 'function' ? await Ammo() : Ammo;

    const collisionConfig = new this.ammo.btDefaultCollisionConfiguration();
    const dispatcher = new this.ammo.btCollisionDispatcher(collisionConfig);
    const broadphase = new this.ammo.btDbvtBroadphase();
    const solver = new this.ammo.btSequentialImpulseConstraintSolver();

    this.physicsWorld = new this.ammo.btDiscreteDynamicsWorld(
      dispatcher,
      broadphase,
      solver,
      collisionConfig
    );

    this.physicsWorld.setGravity(new this.ammo.btVector3(0, -9.8, 0));
    this.initialized = true;
  }

  /**
   * Add a Three.js mesh as a rigid body in the physics world.
   * @param mesh  Three.js mesh (position used as initial transform)
   * @param mass  0 = static body, >0 = dynamic
   */
  addRigidBody(mesh: any, mass: number): any {
    if (!this.initialized || !this.ammo) return null;

    const transform = new this.ammo.btTransform();
    transform.setIdentity();
    transform.setOrigin(
      new this.ammo.btVector3(
        mesh.position.x,
        mesh.position.y,
        mesh.position.z
      )
    );

    const motionState = new this.ammo.btDefaultMotionState(transform);
    // Use a box shape approximating a card
    const halfExtents = new this.ammo.btVector3(0.5, 0.7, 0.02);
    const shape = new this.ammo.btBoxShape(halfExtents);

    const localInertia = new this.ammo.btVector3(0, 0, 0);
    if (mass > 0) shape.calculateLocalInertia(mass, localInertia);

    const rbInfo = new this.ammo.btRigidBodyConstructionInfo(
      mass,
      motionState,
      shape,
      localInertia
    );
    const body = new this.ammo.btRigidBody(rbInfo);

    this.physicsWorld.addRigidBody(body);
    this.bodies.push({ mesh, body, transform });

    return body;
  }

  /**
   * Step the physics simulation and sync mesh positions.
   */
  step(deltaTime: number): void {
    if (!this.initialized || !this.physicsWorld) return;

    this.physicsWorld.stepSimulation(deltaTime, 10);

    for (const entry of this.bodies) {
      const ms = entry.body.getMotionState();
      if (!ms) continue;

      ms.getWorldTransform(entry.transform);
      const origin = entry.transform.getOrigin();
      const rot = entry.transform.getRotation();

      entry.mesh.position.set(origin.x(), origin.y(), origin.z());
      entry.mesh.quaternion.set(rot.x(), rot.y(), rot.z(), rot.w());
    }
  }

  dispose(): void {
    if (!this.initialized || !this.physicsWorld) return;

    for (const entry of this.bodies) {
      this.physicsWorld.removeRigidBody(entry.body);
      this.ammo.destroy(entry.body);
    }
    this.bodies = [];
    this.ammo.destroy(this.physicsWorld);
    this.physicsWorld = null;
    this.initialized = false;
  }
}
