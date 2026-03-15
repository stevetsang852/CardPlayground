import React, { useEffect, useState, useRef } from 'react';
import { dataService } from '../services';
import { useGameStore } from '../store/gameStore';

type GraphicsQuality = 'high' | 'medium' | 'low';

export function SettingsPage() {
  const loadFromDB = useGameStore((s) => s.loadFromDB);
  const seedTestData = useGameStore((s) => s.seedTestData);
  const [sfxVolume, setSfxVolume] = useState(80);
  const [bgmVolume, setBgmVolume] = useState(60);
  const [graphicsQuality, setGraphicsQuality] = useState<GraphicsQuality>('high');
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [statusMsg, setStatusMsg] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    (async () => {
      const sfx = await dataService.getSetting('sfxVolume');
      const bgm = await dataService.getSetting('bgmVolume');
      const gfx = await dataService.getSetting('graphicsQuality');
      if (sfx !== undefined) setSfxVolume(Number(sfx));
      if (bgm !== undefined) setBgmVolume(Number(bgm));
      if (gfx !== undefined) setGraphicsQuality(gfx as GraphicsQuality);
    })();
  }, []);

  const handleSfxChange = async (val: number) => {
    setSfxVolume(val);
    await dataService.saveSetting('sfxVolume', String(val));
  };

  const handleBgmChange = async (val: number) => {
    setBgmVolume(val);
    await dataService.saveSetting('bgmVolume', String(val));
  };

  const handleGraphicsChange = async (val: GraphicsQuality) => {
    setGraphicsQuality(val);
    await dataService.saveSetting('graphicsQuality', val);
  };

  const handleExport = async () => {
    try {
      const json = await dataService.exportSave();
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'save.json';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      setStatusMsg('Save exported successfully.');
    } catch {
      setStatusMsg('Export failed.');
    }
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      await dataService.importSave(text);
      await loadFromDB();
      setStatusMsg('Save imported successfully.');
    } catch {
      setStatusMsg('Import failed. Invalid save file.');
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleReset = async () => {
    try {
      await dataService.resetGame();
      await loadFromDB();
      setShowResetConfirm(false);
      setStatusMsg('Game reset successfully.');
    } catch {
      setStatusMsg('Reset failed.');
    }
  };

  return (
    <div className="max-w-lg mx-auto py-8 px-4 text-gray-100">
      <h1 className="text-2xl font-bold mb-6 text-game-accent">⚙️ Settings</h1>

      {/* Volume */}
      <section className="bg-gray-800 rounded-xl p-5 mb-5">
        <h2 className="text-lg font-semibold mb-4">Volume</h2>
        <label className="block mb-4">
          <span className="text-sm text-gray-300">SFX Volume: {sfxVolume}</span>
          <input
            type="range" min={0} max={100} value={sfxVolume}
            onChange={(e) => handleSfxChange(Number(e.target.value))}
            className="w-full mt-1 accent-game-accent"
          />
        </label>
        <label className="block">
          <span className="text-sm text-gray-300">BGM Volume: {bgmVolume}</span>
          <input
            type="range" min={0} max={100} value={bgmVolume}
            onChange={(e) => handleBgmChange(Number(e.target.value))}
            className="w-full mt-1 accent-game-accent"
          />
        </label>
      </section>

      {/* Graphics */}
      <section className="bg-gray-800 rounded-xl p-5 mb-5">
        <h2 className="text-lg font-semibold mb-4">Graphics Quality</h2>
        <div className="flex gap-4">
          {(['high', 'medium', 'low'] as GraphicsQuality[]).map((q) => (
            <label key={q} className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio" name="graphics" value={q}
                checked={graphicsQuality === q}
                onChange={() => handleGraphicsChange(q)}
                className="accent-game-accent"
              />
              <span className="capitalize text-sm">{q}</span>
            </label>
          ))}
        </div>
      </section>

      {/* Save Management */}
      <section className="bg-gray-800 rounded-xl p-5 mb-5">
        <h2 className="text-lg font-semibold mb-4">Save Management</h2>
        <div className="flex flex-col gap-3">
          <button
            onClick={handleExport}
            className="bg-blue-600 hover:bg-blue-500 text-white py-2 px-4 rounded-lg transition-colors"
          >
            Export Save
          </button>
          <button
            onClick={() => fileInputRef.current?.click()}
            className="bg-green-700 hover:bg-green-600 text-white py-2 px-4 rounded-lg transition-colors"
          >
            Import Save
          </button>
          <input
            ref={fileInputRef} type="file" accept=".json"
            onChange={handleImport} className="hidden"
          />
          <button
            onClick={() => setShowResetConfirm(true)}
            className="bg-red-700 hover:bg-red-600 text-white py-2 px-4 rounded-lg transition-colors"
          >
            Reset Game
          </button>
        </div>
      </section>

      {/* Dev Tools */}
      <section className="bg-yellow-900/40 border border-yellow-600/40 rounded-xl p-5 mb-5">
        <h2 className="text-lg font-semibold mb-1 text-yellow-400">🧪 Dev Tools</h2>
        <p className="text-xs text-gray-400 mb-4">Testing only — injects large amounts of resources and cards.</p>
        <button
          onClick={async () => {
            await seedTestData();
            setStatusMsg('Test data seeded: 999,999 coins, 9,999 gems, all rarities added.');
          }}
          className="bg-yellow-600 hover:bg-yellow-500 text-white py-2 px-4 rounded-lg transition-colors w-full"
        >
          Seed Test Resources
        </button>
      </section>

      {/* Status message */}
      {statusMsg && (
        <p className="text-sm text-center text-yellow-400 mt-2">{statusMsg}</p>
      )}

      {/* Reset confirmation dialog */}
      {showResetConfirm && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-xl p-6 max-w-sm w-full mx-4 text-center">
            <p className="text-lg font-semibold mb-2">Reset Game?</p>
            <p className="text-sm text-gray-400 mb-6">
              This will permanently delete all your progress. This cannot be undone.
            </p>
            <div className="flex gap-3 justify-center">
              <button
                onClick={handleReset}
                className="bg-red-700 hover:bg-red-600 text-white py-2 px-5 rounded-lg transition-colors"
              >
                Yes, Reset
              </button>
              <button
                onClick={() => setShowResetConfirm(false)}
                className="bg-gray-600 hover:bg-gray-500 text-white py-2 px-5 rounded-lg transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
