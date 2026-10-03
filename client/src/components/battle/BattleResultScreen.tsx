// BattleResultScreen.tsx — cinematic result screen with Three.js particle burst
import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { gsap } from 'gsap';
import type { BattleReward } from '../../game/battle/BattleTypes';

interface Props {
  victory: boolean; wave: number; highScore: number;
  rewards: BattleReward[]; onPlayAgain: () => void; onHome: () => void;
}

const rewardIcon: Record<BattleReward['type'], string> = { coin: '💰', ticket: '🎫', material: '💎' };

const BattleResultScreen: React.FC<Props> = ({ victory, wave, highScore, rewards, onPlayAgain, onHome }) => {
  const canvasRef = useRef<HTMLDivElement>(null);
  const isNewRecord = wave > highScore;

  useEffect(() => {
    const container = canvasRef.current;
    if (!container) return;

    const scene = new THREE.Scene();
    const w = container.clientWidth || window.innerWidth;
    const h = container.clientHeight || window.innerHeight;
    const camera = new THREE.PerspectiveCamera(60, w / h, 0.1, 100);
    camera.position.set(0, 0, 6);
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(w, h);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x000000, 0);
    container.appendChild(renderer.domElement);

    // Particle burst
    const count = victory ? 400 : 150;
    const color = victory ? 0xffd700 : 0xff4422;
    const geo = new THREE.BufferGeometry();
    const pos = new Float32Array(count * 3);
    const vel: THREE.Vector3[] = [];
    for (let i = 0; i < count; i++) {
      pos[i * 3] = 0; pos[i * 3 + 1] = 0; pos[i * 3 + 2] = 0;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.random() * Math.PI;
      const spd = 0.04 + Math.random() * 0.08;
      vel.push(new THREE.Vector3(Math.sin(phi) * Math.cos(theta) * spd, Math.sin(phi) * Math.sin(theta) * spd, Math.cos(phi) * spd * 0.3));
    }
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const mat = new THREE.PointsMaterial({ color, size: 0.1, transparent: true, opacity: 1, blending: THREE.AdditiveBlending, depthWrite: false });
    const pts = new THREE.Points(geo, mat);
    scene.add(pts);

    // Rings for victory
    const rings: THREE.Mesh[] = [];
    if (victory) {
      for (let i = 0; i < 3; i++) {
        const ring = new THREE.Mesh(new THREE.RingGeometry(0.5 + i * 0.3, 0.6 + i * 0.3, 32),
          new THREE.MeshBasicMaterial({ color: 0xffd700, transparent: true, opacity: 0.6, side: THREE.DoubleSide }));
        ring.scale.set(0, 0, 0);
        scene.add(ring);
        rings.push(ring);
        gsap.to(ring.scale, { x: 4 + i * 2, y: 4 + i * 2, z: 1, duration: 1.2 + i * 0.3, delay: i * 0.2, ease: 'power2.out' });
        gsap.to(ring.material, { opacity: 0, duration: 1.2 + i * 0.3, delay: i * 0.2 });
      }
    }

    let t = 0;
    const posAttr = geo.attributes['position'] as THREE.BufferAttribute;
    let rafId: number;
    const loop = () => {
      rafId = requestAnimationFrame(loop);
      t += 0.016;
      for (let i = 0; i < count; i++) {
        posAttr.setXYZ(i, posAttr.getX(i) + vel[i].x, posAttr.getY(i) + vel[i].y, posAttr.getZ(i) + vel[i].z);
        vel[i].y -= 0.0008;
      }
      posAttr.needsUpdate = true;
      mat.opacity = Math.max(0, 1 - t / 2.5);
      renderer.render(scene, camera);
    };
    loop();

    return () => {
      cancelAnimationFrame(rafId);
      renderer.dispose();
      renderer.domElement.remove();
      scene.clear();
    };
  }, [victory]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'radial-gradient(ellipse at center, rgba(10,5,30,0.97) 0%, rgba(0,0,0,0.99) 100%)' }}>
      {/* Three.js canvas layer */}
      <div ref={canvasRef} className="absolute inset-0 pointer-events-none" />

      {/* UI layer */}
      <div className="relative z-10 flex flex-col items-center gap-5 w-full max-w-sm mx-4 animate-[fadeInUp_0.5s_ease]">
        {/* Title */}
        <div className="text-center">
          <div className="text-6xl mb-2">{victory ? '🏆' : '💀'}</div>
          <h1 className="text-4xl font-bold" style={{ color: victory ? '#fbbf24' : '#ef4444', textShadow: `0 0 30px ${victory ? '#fbbf2488' : '#ef444488'}` }}>
            {victory ? '勝利' : '失敗'}
          </h1>
        </div>

        {/* Stats card */}
        <div className="w-full rounded-2xl p-4 flex flex-col items-center gap-1"
          style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', backdropFilter: 'blur(12px)' }}>
          <div className="text-3xl font-bold text-white">第 {wave} 波</div>
          {isNewRecord && (
            <span className="px-3 py-0.5 rounded-full text-sm font-bold" style={{ background: 'linear-gradient(90deg,#f59e0b,#fbbf24)', color: '#1a1000' }}>
              🎉 新紀錄
            </span>
          )}
          <div className="text-gray-500 text-sm mt-1">最高紀錄：第 {isNewRecord ? wave : highScore} 波</div>
        </div>

        {/* Rewards */}
        {rewards.length > 0 && (
          <div className="w-full rounded-2xl p-4"
            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', backdropFilter: 'blur(12px)' }}>
            <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">獲得獎勵</p>
            <div className="flex flex-col gap-1.5">
              {rewards.map((r, i) => (
                <div key={i} className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2 text-gray-300">{rewardIcon[r.type]} {r.reason}</span>
                  <span className="font-bold text-white">+{r.amount}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Buttons */}
        <div className="flex gap-3 w-full">
          <button onClick={onPlayAgain} className="flex-1 py-3 rounded-xl font-bold text-white transition-all active:scale-95"
            style={{ background: 'linear-gradient(135deg,#2563eb,#3b82f6)', boxShadow: '0 4px 20px rgba(59,130,246,0.4)' }}>
            再來一場
          </button>
          <button onClick={onHome} className="flex-1 py-3 rounded-xl font-bold text-gray-300 transition-all active:scale-95"
            style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)' }}>
            返回主頁
          </button>
        </div>
      </div>
    </div>
  );
};

export default BattleResultScreen;
