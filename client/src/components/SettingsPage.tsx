import React, { useEffect, useState, useRef } from 'react';
import { dataService } from '../services';
import { useGameStore } from '../store/gameStore';
import { useI18n, type Locale } from '../i18n';

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
  const { locale, setLocale, t } = useI18n();

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
      setStatusMsg('settings.exported');
    } catch {
      setStatusMsg('settings.exportFailed');
    }
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      await dataService.importSave(text);
      await loadFromDB();
      setStatusMsg('settings.imported');
    } catch {
      setStatusMsg('settings.importFailed');
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleReset = async () => {
    try {
      await dataService.resetGame();
      await loadFromDB();
      setShowResetConfirm(false);
      setStatusMsg('settings.resetOk');
    } catch {
      setStatusMsg('settings.resetFailed');
    }
  };

  return (
    <div className="mx-auto max-w-lg text-gray-100">
      <h1 className="display mb-4 text-2xl text-amber-50">{t('settings.title')}</h1>

      <section className="mb-4 rounded-2xl border border-white/10 bg-white/5 p-4">
        <h2 className="mb-1 text-base font-semibold">{t('settings.language')}</h2>
        <p className="mb-3 text-xs text-violet-200/70">{t('settings.languageHint')}</p>
        <div className="flex gap-2">
          {(['zh-Hant', 'en'] as Locale[]).map((code) => (
            <button
              key={code}
              type="button"
              onClick={() => setLocale(code)}
              className={`rounded-full px-4 py-2 text-sm font-semibold ${locale === code ? 'bg-amber-100 text-violet-950' : 'border border-white/15 text-violet-100'}`}
            >
              {code === 'zh-Hant' ? '繁體中文' : 'English'}
            </button>
          ))}
        </div>
      </section>

      <section className="mb-4 rounded-2xl border border-white/10 bg-white/5 p-4">
        <h2 className="mb-3 text-base font-semibold">{t('settings.volume')}</h2>
        <label className="block mb-4">
          <span className="text-sm text-gray-300">{t('settings.sfx', { n: sfxVolume })}</span>
          <input
            type="range" min={0} max={100} value={sfxVolume}
            onChange={(e) => handleSfxChange(Number(e.target.value))}
            className="w-full mt-1 accent-game-accent"
          />
        </label>
        <label className="block">
          <span className="text-sm text-gray-300">{t('settings.bgm', { n: bgmVolume })}</span>
          <input
            type="range" min={0} max={100} value={bgmVolume}
            onChange={(e) => handleBgmChange(Number(e.target.value))}
            className="w-full mt-1 accent-game-accent"
          />
        </label>
      </section>

      {/* Graphics */}
      <section className="mb-4 rounded-2xl border border-white/10 bg-white/5 p-4">
        <h2 className="mb-3 text-base font-semibold">{t('settings.graphics')}</h2>
        <div className="flex gap-4">
          {(['high', 'medium', 'low'] as GraphicsQuality[]).map((q) => (
            <label key={q} className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio" name="graphics" value={q}
                checked={graphicsQuality === q}
                onChange={() => handleGraphicsChange(q)}
                className="accent-game-accent"
              />
              <span className="text-sm">{t(`settings.quality.${q}`)}</span>
            </label>
          ))}
        </div>
      </section>

      {/* Save Management */}
      <section className="mb-4 rounded-2xl border border-white/10 bg-white/5 p-4">
        <h2 className="mb-3 text-base font-semibold">{t('settings.save')}</h2>
        <div className="flex flex-col gap-3">
          <button
            onClick={handleExport}
            className="bg-blue-600 hover:bg-blue-500 text-white py-2 px-4 rounded-lg transition-colors"
          >
            {t('settings.export')}
          </button>
          <button
            onClick={() => fileInputRef.current?.click()}
            className="bg-green-700 hover:bg-green-600 text-white py-2 px-4 rounded-lg transition-colors"
          >
            {t('settings.import')}
          </button>
          <input
            ref={fileInputRef} type="file" accept=".json"
            onChange={handleImport} className="hidden"
          />
          <button
            onClick={() => setShowResetConfirm(true)}
            className="bg-red-700 hover:bg-red-600 text-white py-2 px-4 rounded-lg transition-colors"
          >
            {t('settings.reset')}
          </button>
        </div>
      </section>

      {/* Dev Tools */}
      <section className="bg-yellow-900/40 border border-yellow-600/40 rounded-xl p-5 mb-5">
        <h2 className="mb-1 text-base font-semibold text-amber-200">{t('settings.dev')}</h2>
        <p className="mb-3 text-xs text-gray-400">{t('settings.devHint')}</p>
        <button
          onClick={async () => {
            await seedTestData();
            setStatusMsg('settings.seeded');
          }}
          className="bg-yellow-600 hover:bg-yellow-500 text-white py-2 px-4 rounded-lg transition-colors w-full"
        >
          {t('settings.seed')}
        </button>
      </section>

      {/* Status message */}
      {statusMsg && (
        <p className="mt-2 text-center text-sm text-amber-200">{t(statusMsg)}</p>
      )}

      {/* Reset confirmation dialog */}
      {showResetConfirm && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-xl p-6 max-w-sm w-full mx-4 text-center">
            <p className="mb-2 text-lg font-semibold">{t('settings.resetAsk')}</p>
            <p className="mb-6 text-sm text-gray-400">{t('settings.resetWarn')}</p>
            <div className="flex gap-3 justify-center">
              <button
                onClick={handleReset}
                className="bg-red-700 hover:bg-red-600 text-white py-2 px-5 rounded-lg transition-colors"
              >
                {t('settings.yesReset')}
              </button>
              <button
                onClick={() => setShowResetConfirm(false)}
                className="bg-gray-600 hover:bg-gray-500 text-white py-2 px-5 rounded-lg transition-colors"
              >
                {t('settings.cancel')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
