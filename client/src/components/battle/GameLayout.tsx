// GameLayout.tsx — Three-zone layout: EnemyPath (35%) + BottomArea (65%)
// BottomArea splits into PlayerBoard (flex:7) and ControlPanel (flex:3)
import type { ReactNode } from 'react';
import './GameLayout.css';

interface GameLayoutProps {
  enemyPath: ReactNode;
  playerBoard: ReactNode;
  controlPanel: ReactNode;
}

export function GameLayout({ enemyPath, playerBoard, controlPanel }: GameLayoutProps) {
  return (
    <div className="game-layout">
      <div className="enemy-path">{enemyPath}</div>
      <div className="bottom-area">
        <div className="player-board">{playerBoard}</div>
        <div className="control-panel">{controlPanel}</div>
      </div>
    </div>
  );
}
