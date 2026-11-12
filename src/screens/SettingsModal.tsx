/**
 * SettingsModal — Audio, Haptics, Display, Backup/Restore & Save Reset Controls
 * Owned by @ui-eng
 */

import React, { useRef, useState } from 'react';
import {
  Download,
  Eye,
  Moon,
  RotateCcw,
  Smartphone,
  Sun,
  Upload,
  Volume2,
  Zap,
} from 'lucide-react';
import { usePersistence } from '@/services/persistence/PersistenceContext';
import { useTheme } from '@/services/theme/ThemeContext';
import { useAudio } from '@/services/audio/AudioContext';
import { CapacitorBridge } from '@/services/native/CapacitorBridge';
import { KineticButton, KineticModal } from '@/components/common';

export interface SettingsModalProps {
  open: boolean;
  onClose: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ open, onClose }) => {
  const { saveData, updateSettings, exportBackup, importBackup, resetAllData } = usePersistence();
  const { isDarkMode, isReducedMotion, setDarkMode } = useTheme();
  const { settings: audioSettings, updateSettings: updateAudioSettings, playUiClick } = useAudio();

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [confirmReset, setConfirmReset] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ ok: boolean; text: string } | null>(null);

  const handleToggleDarkMode = () => {
    playUiClick();
    const next = !isDarkMode;
    setDarkMode(next);
    void CapacitorBridge.syncStatusBar(next);
  };

  const handleToggleReducedMotion = () => {
    playUiClick();
    updateSettings({ display: { reducedMotion: !isReducedMotion } });
  };

  const handleToggleHighContrast = () => {
    playUiClick();
    updateSettings({
      display: { highContrastTiles: !saveData.settings.display.highContrastTiles },
    });
  };

  const handleExportBackup = () => {
    playUiClick();
    try {
      const json = exportBackup();
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `connectify-backup-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      setStatusMessage({ ok: true, text: 'File cadangan JSON berhasil diunduh.' });
    } catch {
      setStatusMessage({ ok: false, text: 'Gagal membuat file cadangan.' });
    }
  };

  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    try {
      const raw = await file.text();
      const result = importBackup(raw);
      if (result.success) {
        setStatusMessage({ ok: true, text: 'Data cadangan berhasil dipulihkan!' });
      } else {
        setStatusMessage({ ok: false, text: result.error ?? 'Format cadangan tidak valid.' });
      }
    } catch {
      setStatusMessage({ ok: false, text: 'Gagal membaca file cadangan.' });
    }
  };

  const handleResetSave = async () => {
    if (!confirmReset) {
      setConfirmReset(true);
      return;
    }
    await resetAllData();
    setConfirmReset(false);
    setStatusMessage({ ok: true, text: 'Semua data permainan telah direset.' });
  };

  return (
    <KineticModal
      open={open}
      onClose={() => {
        setConfirmReset(false);
        setStatusMessage(null);
        onClose();
      }}
      title="Pengaturan Klub"
      subtitle="Audio, sentuhan, tampilan & cadangan lokal"
      testId="settings-modal"
    >
      <div className="flex flex-col gap-4">
        {statusMessage && (
          <div
            className="rounded-xl border-2 px-3 py-2 text-xs font-bold"
            style={{
              backgroundColor: statusMessage.ok ? '#dcfce7' : '#fee2e2',
              borderColor: statusMessage.ok ? '#16a34a' : '#ef4444',
              color: statusMessage.ok ? '#14532d' : '#991b1b',
            }}
          >
            {statusMessage.text}
          </div>
        )}

        {/* Audio Section */}
        <section className="flex flex-col gap-3 rounded-2xl border-2 p-3.5" style={{ borderColor: 'var(--club-line)' }}>
          <div className="flex items-center gap-2 font-display font-bold text-sm">
            <Volume2 size={17} style={{ color: 'var(--g-accent)' }} />
            <span>Audio</span>
          </div>

          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between text-xs font-bold">
              <span>Volume Musik ({audioSettings.musicVol}%)</span>
              <button
                type="button"
                onClick={() => {
                  const nextMute = !audioSettings.muteMusic;
                  updateAudioSettings({ muteMusic: nextMute });
                  updateSettings({ audio: { muteMusic: nextMute } });
                }}
                className="px-2.5 py-1 rounded-lg border text-[11px] font-bold cursor-pointer"
                style={{
                  backgroundColor: audioSettings.muteMusic ? '#fee2e2' : 'var(--g-soft)',
                  borderColor: 'var(--club-border-ink)',
                  color: audioSettings.muteMusic ? '#991b1b' : 'var(--club-ink)',
                }}
              >
                {audioSettings.muteMusic ? 'Bisukan' : 'Aktif'}
              </button>
            </div>
            <input
              type="range"
              min={0}
              max={100}
              value={audioSettings.musicVol}
              onChange={(e) => {
                const vol = Number(e.target.value);
                updateAudioSettings({ musicVol: vol, muteMusic: vol === 0 });
                updateSettings({ audio: { musicVolume: vol, muteMusic: vol === 0 } });
              }}
              className="w-full accent-[var(--g-accent)]"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between text-xs font-bold">
              <span>Volume Efek Suara ({audioSettings.sfxVol}%)</span>
              <button
                type="button"
                onClick={() => {
                  const nextMute = !audioSettings.muteSfx;
                  updateAudioSettings({ muteSfx: nextMute });
                  updateSettings({ audio: { muteSfx: nextMute } });
                }}
                className="px-2.5 py-1 rounded-lg border text-[11px] font-bold cursor-pointer"
                style={{
                  backgroundColor: audioSettings.muteSfx ? '#fee2e2' : 'var(--g-soft)',
                  borderColor: 'var(--club-border-ink)',
                  color: audioSettings.muteSfx ? '#991b1b' : 'var(--club-ink)',
                }}
              >
                {audioSettings.muteSfx ? 'Bisukan' : 'Aktif'}
              </button>
            </div>
            <input
              type="range"
              min={0}
              max={100}
              value={audioSettings.sfxVol}
              onChange={(e) => {
                const vol = Number(e.target.value);
                updateAudioSettings({ sfxVol: vol, muteSfx: vol === 0 });
                updateSettings({ audio: { sfxVolume: vol, muteSfx: vol === 0 } });
              }}
              className="w-full accent-[var(--g-accent)]"
            />
          </div>
        </section>

        {/* Haptics Section */}
        <section className="flex flex-col gap-2.5 rounded-2xl border-2 p-3.5" style={{ borderColor: 'var(--club-line)' }}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 font-display font-bold text-sm">
              <Smartphone size={17} style={{ color: 'var(--g-accent)' }} />
              <span>Getaran Haptik</span>
            </div>
            <button
              type="button"
              onClick={() => {
                const next = !audioSettings.hapticsEnabled;
                updateAudioSettings({ hapticsEnabled: next });
                updateSettings({ haptics: { enabled: next } });
              }}
              className="min-h-[36px] px-3 rounded-xl border-2 text-xs font-bold cursor-pointer"
              style={{
                backgroundColor: audioSettings.hapticsEnabled ? 'var(--g-soft)' : 'var(--club-paper-2)',
                borderColor: 'var(--club-border-ink)',
              }}
            >
              {audioSettings.hapticsEnabled ? 'Aktif' : 'Nonaktif'}
            </button>
          </div>

          {audioSettings.hapticsEnabled && (
            <div className="grid grid-cols-3 gap-1.5">
              {(
                [
                  { id: 'light', label: 'Halus' },
                  { id: 'medium', label: 'Sedang' },
                  { id: 'strong', label: 'Kuat' },
                ] as const
              ).map((lvl) => {
                const active = audioSettings.hapticsIntensity === lvl.id;
                return (
                  <button
                    key={lvl.id}
                    type="button"
                    onClick={() => {
                      updateAudioSettings({ hapticsIntensity: lvl.id });
                      updateSettings({ haptics: { intensity: lvl.id } });
                    }}
                    className="min-h-[38px] rounded-xl border text-xs font-bold cursor-pointer"
                    style={{
                      backgroundColor: active ? 'var(--g-accent)' : 'var(--club-paper)',
                      color: active ? '#fff' : 'var(--club-ink)',
                      borderColor: 'var(--club-border-ink)',
                    }}
                  >
                    {lvl.label}
                  </button>
                );
              })}
            </div>
          )}
        </section>

        {/* Display & Accessibility */}
        <section className="flex flex-col gap-2 rounded-2xl border-2 p-3.5" style={{ borderColor: 'var(--club-line)' }}>
          <div className="flex items-center gap-2 font-display font-bold text-sm mb-1">
            <Eye size={17} style={{ color: 'var(--g-accent)' }} />
            <span>Tampilan & Aksesibilitas</span>
          </div>

          <button
            type="button"
            data-testid="settings-darkmode-btn"
            onClick={handleToggleDarkMode}
            className="touch-target rounded-xl border px-3 py-2 flex items-center justify-between text-xs font-bold cursor-pointer"
            style={{ backgroundColor: 'var(--club-paper)', borderColor: 'var(--club-line)' }}
          >
            <span className="flex items-center gap-2">
              {isDarkMode ? <Moon size={15} /> : <Sun size={15} />}
              Mode Gelap
            </span>
            <span>{isDarkMode ? 'Aktif' : 'Terang'}</span>
          </button>

          <button
            type="button"
            onClick={handleToggleReducedMotion}
            className="touch-target rounded-xl border px-3 py-2 flex items-center justify-between text-xs font-bold cursor-pointer"
            style={{ backgroundColor: 'var(--club-paper)', borderColor: 'var(--club-line)' }}
          >
            <span className="flex items-center gap-2">
              <Zap size={15} />
              Kurangi Animasi
            </span>
            <span>{isReducedMotion ? 'Aktif' : 'Normal'}</span>
          </button>

          <button
            type="button"
            onClick={handleToggleHighContrast}
            className="touch-target rounded-xl border px-3 py-2 flex items-center justify-between text-xs font-bold cursor-pointer"
            style={{ backgroundColor: 'var(--club-paper)', borderColor: 'var(--club-line)' }}
          >
            <span>Tile Kontras Tinggi</span>
            <span>{saveData.settings.display.highContrastTiles ? 'Aktif' : 'Standar'}</span>
          </button>
        </section>

        {/* Local Backup & Reset */}
        <section className="flex flex-col gap-2">
          <div className="grid grid-cols-2 gap-2">
            <KineticButton
              variant="secondary"
              size="sm"
              data-testid="settings-export-btn"
              icon={<Download size={15} />}
              onClick={handleExportBackup}
            >
              Ekspor Data
            </KineticButton>
            <KineticButton
              variant="secondary"
              size="sm"
              data-testid="settings-import-btn"
              icon={<Upload size={15} />}
              onClick={() => fileInputRef.current?.click()}
            >
              Pulihkan
            </KineticButton>
            <input
              ref={fileInputRef}
              type="file"
              accept="application/json,.json"
              onChange={handleImportFile}
              className="hidden"
            />
          </div>

          <KineticButton
            variant="danger"
            size="sm"
            fullWidth
            data-testid="settings-reset-btn"
            icon={<RotateCcw size={15} />}
            onClick={() => void handleResetSave()}
          >
            {confirmReset ? 'Ketuk Sekali Lagi untuk Reset Permanen' : 'Reset Semua Progres Lokal'}
          </KineticButton>
        </section>
      </div>
    </KineticModal>
  );
};
