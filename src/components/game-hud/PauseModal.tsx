/**
 * PauseModal — In-Game Pause Dialog with Quick Audio/Haptics Toggles
 * Owned by @ui-eng
 */

import React from 'react';
import {
  Home,
  Music,
  Play,
  RotateCcw,
  Settings,
  Smartphone,
  Volume2,
  VolumeX,
} from 'lucide-react';
import type { GameId } from '@/types/game.types';
import { KineticButton, KineticModal } from '@/components/common';
import { useAudio } from '@/services/audio/AudioContext';
import { usePersistence } from '@/services/persistence/PersistenceContext';

export interface PauseModalProps {
  open: boolean;
  game: GameId;
  level: number;
  score: number;
  onResume: () => void;
  onRestart: () => void;
  onOpenSettings?: () => void;
  onQuitToMap: () => void;
}

export const PauseModal: React.FC<PauseModalProps> = ({
  open,
  game,
  level,
  score,
  onResume,
  onRestart,
  onOpenSettings,
  onQuitToMap,
}) => {
  const { settings, updateSettings: updateAudioSettings, playUiClick } = useAudio();
  const { updateSettings: updatePersistenceSettings } = usePersistence();

  const toggleMusic = () => {
    playUiClick();
    const nextMuted = !settings.muteMusic;
    updateAudioSettings({ muteMusic: nextMuted });
    updatePersistenceSettings({ audio: { muteMusic: nextMuted } });
  };

  const toggleSfx = () => {
    playUiClick();
    const nextMuted = !settings.muteSfx;
    updateAudioSettings({ muteSfx: nextMuted });
    updatePersistenceSettings({ audio: { muteSfx: nextMuted } });
  };

  const toggleHaptics = () => {
    playUiClick();
    const nextHaptics = !settings.hapticsEnabled;
    updateAudioSettings({ hapticsEnabled: nextHaptics });
    updatePersistenceSettings({ haptics: { enabled: nextHaptics } });
  };

  return (
    <KineticModal
      open={open}
      onClose={onResume}
      title="Permainan Dijeda"
      subtitle={`${game === 'onet' ? 'Onet Connect' : 'Match 3'} · Level ${level}`}
      testId="pause-modal"
    >
      <div className="flex flex-col gap-4">
        {/* Current Score Snapshot */}
        <div
          className="rounded-2xl border-2 px-4 py-3 flex items-center justify-between"
          style={{
            backgroundColor: 'var(--g-soft)',
            borderColor: 'var(--club-border-ink)',
          }}
        >
          <span className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--club-muted)' }}>
            Skor Saat Ini
          </span>
          <span className="font-tabular text-xl font-extrabold">
            {Math.max(0, Math.floor(score)).toLocaleString('id-ID')}
          </span>
        </div>

        {/* Quick Audio & Haptic Switches */}
        <div className="grid grid-cols-3 gap-2">
          <button
            type="button"
            onClick={toggleMusic}
            className="touch-target min-h-[56px] rounded-2xl border-2 p-2 flex flex-col items-center justify-center gap-1 cursor-pointer"
            style={{
              backgroundColor: !settings.muteMusic ? 'var(--club-card)' : 'var(--club-paper-2)',
              borderColor: 'var(--club-border-ink)',
              opacity: !settings.muteMusic ? 1 : 0.65,
            }}
          >
            <Music size={18} strokeWidth={2.4} />
            <span className="text-[11px] font-bold">
              {settings.muteMusic ? 'Musik Off' : 'Musik On'}
            </span>
          </button>

          <button
            type="button"
            onClick={toggleSfx}
            className="touch-target min-h-[56px] rounded-2xl border-2 p-2 flex flex-col items-center justify-center gap-1 cursor-pointer"
            style={{
              backgroundColor: !settings.muteSfx ? 'var(--club-card)' : 'var(--club-paper-2)',
              borderColor: 'var(--club-border-ink)',
              opacity: !settings.muteSfx ? 1 : 0.65,
            }}
          >
            {settings.muteSfx ? <VolumeX size={18} strokeWidth={2.4} /> : <Volume2 size={18} strokeWidth={2.4} />}
            <span className="text-[11px] font-bold">
              {settings.muteSfx ? 'SFX Off' : 'SFX On'}
            </span>
          </button>

          <button
            type="button"
            onClick={toggleHaptics}
            className="touch-target min-h-[56px] rounded-2xl border-2 p-2 flex flex-col items-center justify-center gap-1 cursor-pointer"
            style={{
              backgroundColor: settings.hapticsEnabled ? 'var(--club-card)' : 'var(--club-paper-2)',
              borderColor: 'var(--club-border-ink)',
              opacity: settings.hapticsEnabled ? 1 : 0.65,
            }}
          >
            <Smartphone size={18} strokeWidth={2.4} />
            <span className="text-[11px] font-bold">
              {settings.hapticsEnabled ? 'Getar On' : 'Getar Off'}
            </span>
          </button>
        </div>

        {/* Action Stack */}
        <div className="flex flex-col gap-2.5 pt-1">
          <KineticButton
            variant="primary"
            size="lg"
            fullWidth
            data-testid="pause-resume-btn"
            icon={<Play size={18} strokeWidth={2.6} />}
            onClick={onResume}
          >
            Lanjutkan Main
          </KineticButton>

          <div className="grid grid-cols-2 gap-2.5">
            <KineticButton
              variant="secondary"
              size="md"
              data-testid="pause-restart-btn"
              icon={<RotateCcw size={16} strokeWidth={2.4} />}
              onClick={onRestart}
            >
              Ulangi Level
            </KineticButton>

            {onOpenSettings ? (
              <KineticButton
                variant="secondary"
                size="md"
                data-testid="pause-settings-btn"
                icon={<Settings size={16} strokeWidth={2.4} />}
                onClick={onOpenSettings}
              >
                Pengaturan
              </KineticButton>
            ) : (
              <KineticButton
                variant="secondary"
                size="md"
                data-testid="pause-quit-btn"
                icon={<Home size={16} strokeWidth={2.4} />}
                onClick={onQuitToMap}
              >
                Peta Level
              </KineticButton>
            )}
          </div>

          {onOpenSettings && (
            <KineticButton
              variant="ghost"
              size="md"
              fullWidth
              data-testid="pause-quit-btn"
              icon={<Home size={16} strokeWidth={2.4} />}
              onClick={onQuitToMap}
            >
              Keluar ke Peta Level
            </KineticButton>
          )}
        </div>
      </div>
    </KineticModal>
  );
};
