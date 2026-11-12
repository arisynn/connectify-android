/**
 * LevelSelectScreen — Per-Game Level Grid, Star Mastery, Equipped Theme & Pre-Level Sheet
 * Owned by @ui-eng
 */

import React, { useMemo, useState } from 'react';
import { ArrowLeft, Calendar, Crown, Lock, Palette, Play, Sparkles, Star } from 'lucide-react';
import type { GameId, StarRating } from '@/types/game.types';
import { GAME_METADATA } from '@/config/app.config';
import { getOnetLevelConfig } from '@/config/onet.config';
import { MATCH3_MANUAL_LEVELS } from '@/config/match3.config';
import { usePersistence } from '@/services/persistence/PersistenceContext';
import { useTheme } from '@/services/theme/ThemeContext';
import { useNavigation } from '@/app/NavigationContext';
import { CurrencyPill, DynamicIcon, KineticButton, KineticCard } from '@/components/common';
import { StarRatingBar } from '@/components/game-hud';
import { getTodayKey } from '@/utils/time';

interface ChapterDef {
  id: number;
  title: string;
  start: number;
  end: number;
}

function buildChapters(maxLevel: number): ChapterDef[] {
  const total = Math.max(60, Math.ceil(maxLevel / 10) * 10);
  const chapters: ChapterDef[] = [];
  const names = [
    'Klub Pemula',
    'Jalur Terampil',
    'Arena Taktis',
    'Tantangan Ahli',
    'Master Puzzle',
    'Legenda Klub',
  ];
  for (let start = 1, idx = 0; start <= total; start += 10, idx += 1) {
    chapters.push({
      id: idx + 1,
      title: names[idx] ?? `Babak ${idx + 1}`,
      start,
      end: start + 9,
    });
  }
  return chapters;
}

export const LevelSelectScreen: React.FC = () => {
  const { saveData } = usePersistence();
  const { getThemeForGame, getTilesForGame } = useTheme();
  const {
    selectedGame,
    setSelectedGame,
    navigate,
    startGame,
    openModal,
    goBack,
  } = useNavigation();

  const modeState = saveData.progression[selectedGame];
  const highestUnlocked = Math.max(1, modeState.highestUnlockedLevel);

  const [focusedLevel, setFocusedLevel] = useState<number>(() => highestUnlocked);
  const [selectedChapterIdx, setSelectedChapterIdx] = useState<number>(() =>
    Math.floor((highestUnlocked - 1) / 10),
  );

  const chapters = useMemo(() => buildChapters(highestUnlocked + 10), [highestUnlocked]);
  const safeChapter = chapters[selectedChapterIdx] ?? chapters[0];

  // Ensure focused level tracks game mode switch cleanly
  const effectiveLevel =
    focusedLevel <= highestUnlocked ? focusedLevel : highestUnlocked;

  const activeTheme = getThemeForGame(selectedGame);
  const previewTiles = getTilesForGame(selectedGame, activeTheme.id).slice(0, 4);
  const todayKey = getTodayKey();
  const isDailyCurrent = saveData.dailyChallenges.dailyPuzzle.dateKey === todayKey;
  const isDailyDone =
    isDailyCurrent &&
    (selectedGame === 'onet'
      ? saveData.dailyChallenges.dailyPuzzle.onetCompleted
      : saveData.dailyChallenges.dailyPuzzle.match3Completed);

  const levelPreview = useMemo(() => {
    const record = modeState.levels[effectiveLevel];
    if (selectedGame === 'onet') {
      const cfg = getOnetLevelConfig(effectiveLevel, {
        skillRating: modeState.skillRating,
        consecutiveFailures: record?.consecutiveFailures ?? 0,
      });
      const gravityLabels: Record<string, string> = {
        none: 'Statis',
        down: 'Turun ↓',
        up: 'Naik ↑',
        left: 'Kiri ←',
        right: 'Kanan →',
        inward: 'Pusat ↔',
        split_horizontal: 'Pecah ↔',
        alternating: 'Bergantian ⇅',
      };
      const gravityText = gravityLabels[cfg.gravityMode] ?? cfg.gravityMode;
      return {
        isBoss: cfg.isBoss,
        isBreather: cfg.isBreather,
        badge: cfg.isBoss ? 'Bos' : cfg.isBreather ? 'Santai' : `${cfg.rows}×${cfg.cols}`,
        summary: `${cfg.rows}×${cfg.cols} · ${cfg.timeLimitSec} detik · ${gravityText}`,
        stars: (record?.stars ?? 0) as StarRating,
        highScore: record?.highScore ?? 0,
      };
    }

    const manual = MATCH3_MANUAL_LEVELS[effectiveLevel];
    const isBoss = effectiveLevel >= 10 && effectiveLevel % 10 === 0;
    const isBreather = !isBoss && effectiveLevel > 5 && effectiveLevel % 5 === 1;
    const moves = manual?.maxMoves ?? Math.max(18, 28 - Math.floor(effectiveLevel / 5));
    const goalText = manual?.missions[0]?.description ?? 'Selesaikan target papan';
    return {
      isBoss,
      isBreather,
      badge: isBoss ? 'Bos' : isBreather ? 'Santai' : `${moves} Langkah`,
      summary: `${moves} langkah · ${goalText}`,
      stars: (record?.stars ?? 0) as StarRating,
      highScore: record?.highScore ?? 0,
    };
  }, [effectiveLevel, modeState.levels, modeState.skillRating, selectedGame]);

  const handleSwitchGame = (game: GameId) => {
    setSelectedGame(game);
    const nextHighest = Math.max(1, saveData.progression[game].highestUnlockedLevel);
    setFocusedLevel(nextHighest);
    setSelectedChapterIdx(Math.floor((nextHighest - 1) / 10));
  };

  return (
    <div data-testid="level-select-screen" className="app-screen-scroll flex flex-col gap-3.5 club-enter">
      {/* Top Bar */}
      <header className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <button
            type="button"
            data-testid="level-back-btn"
            aria-label="Kembali ke beranda"
            onClick={() => goBack()}
            className="touch-target w-12 h-12 rounded-2xl border-2 flex items-center justify-center shrink-0 cursor-pointer"
            style={{
              backgroundColor: 'var(--club-card)',
              borderColor: 'var(--club-border-ink)',
              boxShadow: '0 2px 0 var(--club-border-ink)',
            }}
          >
            <ArrowLeft size={20} strokeWidth={2.5} />
          </button>
          <div className="min-w-0">
            <h1 className="font-display font-extrabold text-lg leading-tight truncate">
              {GAME_METADATA[selectedGame].name}
            </h1>
            <p className="text-xs font-semibold flex items-center gap-1" style={{ color: 'var(--club-muted)' }}>
              <Star size={12} fill="#FFB020" color="#172337" />
              {modeState.totalStars} Bintang · Lv. {highestUnlocked} Terbuka
            </p>
          </div>
        </div>

        <CurrencyPill coins={saveData.profile.coins} showAddHint onClick={() => navigate('shop')} />
      </header>

      {/* Mode Switcher */}
      <div className="grid grid-cols-2 gap-2">
        {(['onet', 'match3'] as const).map((g) => {
          const active = g === selectedGame;
          return (
            <button
              key={g}
              type="button"
              data-testid={`level-tab-${g}`}
              onClick={() => handleSwitchGame(g)}
              className="touch-target min-h-[48px] rounded-2xl border-2 px-3 flex items-center justify-center gap-2 font-display font-bold text-sm cursor-pointer transition-all"
              style={{
                backgroundColor: active ? 'var(--g-soft)' : 'var(--club-card)',
                borderColor: active ? 'var(--g-accent)' : 'var(--club-border-ink)',
                boxShadow: active ? '0 3px 0 var(--club-border-ink)' : 'none',
              }}
            >
              <DynamicIcon src={GAME_METADATA[g].iconAsset} kind={g} size={22} />
              <span>{GAME_METADATA[g].name}</span>
            </button>
          );
        })}
      </div>

      {/* Equipped Theme & Daily Sprint Strip */}
      <div className="grid grid-cols-2 gap-2.5">
        <button
          type="button"
          data-testid="level-equipped-theme"
          onClick={() => openModal('quick-theme')}
          className="club-surface-soft min-h-[60px] px-3 py-2 flex items-center justify-between gap-2 text-left cursor-pointer"
        >
          <div className="min-w-0">
            <div className="flex items-center gap-1 text-[10px] font-extrabold uppercase" style={{ color: 'var(--club-muted)' }}>
              <Palette size={11} />
              Tema Aktif
            </div>
            <div className="font-display font-bold text-xs truncate mt-0.5">
              {activeTheme.name}
            </div>
            <div className="flex items-center gap-1 mt-1">
              {previewTiles.map((url, idx) => (
                <img
                  key={idx}
                  src={url}
                  alt=""
                  className="w-4 h-4 rounded object-contain bg-white border border-black/15"
                />
              ))}
            </div>
          </div>
          <span className="text-[11px] font-bold shrink-0" style={{ color: 'var(--g-accent)' }}>
            Ubah
          </span>
        </button>

        <button
          type="button"
          data-testid="level-daily-sprint-btn"
          onClick={() =>
            startGame({
              game: selectedGame,
              level: 1,
              mode: 'daily',
              dailyDateKey: todayKey,
            })
          }
          className="club-surface-soft min-h-[60px] px-3 py-2 flex items-center justify-between gap-2 text-left cursor-pointer"
          style={{
            backgroundColor: isDailyDone ? 'var(--club-card)' : 'var(--g-soft)',
          }}
        >
          <div className="min-w-0">
            <div className="flex items-center gap-1 text-[10px] font-extrabold uppercase" style={{ color: 'var(--g-accent)' }}>
              <Calendar size={11} />
              Mode Harian
            </div>
            <div className="font-display font-bold text-xs truncate mt-0.5">
              {selectedGame === 'onet' ? 'Sprint 90d' : 'Papan Spesial'}
            </div>
            <div className="text-[11px] font-bold mt-0.5" style={{ color: isDailyDone ? 'var(--club-success)' : 'var(--club-ink)' }}>
              {isDailyDone ? 'Selesai Hari Ini' : '+8 Permen Bonus'}
            </div>
          </div>
          <Play size={16} style={{ color: 'var(--g-accent)' }} />
        </button>
      </div>

      {/* Chapter Selector Pills */}
      <div className="flex items-center gap-2 overflow-x-auto club-scroll-hide py-0.5">
        {chapters.map((ch, idx) => {
          const active = idx === selectedChapterIdx;
          return (
            <button
              key={ch.id}
              type="button"
              onClick={() => setSelectedChapterIdx(idx)}
              className="min-h-[40px] px-3.5 rounded-full border-2 text-xs font-display font-bold whitespace-nowrap cursor-pointer shrink-0"
              style={{
                backgroundColor: active ? 'var(--g-accent)' : 'var(--club-card)',
                color: active ? '#fff' : 'var(--club-ink)',
                borderColor: 'var(--club-border-ink)',
                boxShadow: active ? '0 2px 0 var(--club-border-ink)' : 'none',
              }}
            >
              Lv {ch.start}-{ch.end}
            </button>
          );
        })}
      </div>

      {/* 5-Column Level Grid */}
      <KineticCard className="!p-3.5">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-display font-bold text-sm">
            Babak {safeChapter.id} · {safeChapter.title}
          </h2>
          <span className="text-xs font-bold" style={{ color: 'var(--club-muted)' }}>
            Lv. {safeChapter.start}–{safeChapter.end}
          </span>
        </div>

        <div className="grid grid-cols-5 gap-2">
          {Array.from({ length: safeChapter.end - safeChapter.start + 1 }, (_, i) => safeChapter.start + i).map(
            (lvl) => {
              const unlocked = lvl <= highestUnlocked;
              const record = modeState.levels[lvl];
              const stars = (record?.stars ?? 0) as StarRating;
              const isCurrent = lvl === highestUnlocked;
              const isSelected = lvl === effectiveLevel;
              const isBoss = lvl >= 10 && lvl % 10 === 0;

              return (
                <button
                  key={lvl}
                  type="button"
                  data-testid={`level-node-${lvl}`}
                  disabled={!unlocked}
                  onClick={() => setFocusedLevel(lvl)}
                  className="relative touch-target min-h-[58px] rounded-2xl border-2 p-1 flex flex-col items-center justify-center gap-0.5 cursor-pointer disabled:cursor-not-allowed disabled:opacity-45 transition-transform active:translate-y-[2px]"
                  style={{
                    backgroundColor: isSelected
                      ? 'var(--g-accent)'
                      : isCurrent
                        ? 'var(--g-soft)'
                        : unlocked
                          ? 'var(--club-paper)'
                          : 'var(--club-paper-2)',
                    color: isSelected ? '#ffffff' : 'var(--club-ink)',
                    borderColor: isSelected || isCurrent ? 'var(--club-border-ink)' : 'var(--club-line)',
                    boxShadow: isSelected ? '0 3px 0 var(--club-border-ink)' : 'none',
                  }}
                >
                  {isBoss && (
                    <Crown
                      size={11}
                      className="absolute top-1 right-1"
                      style={{ color: isSelected ? '#fef08a' : '#f59e0b' }}
                    />
                  )}
                  <span className="font-tabular font-extrabold text-sm leading-none">
                    {unlocked ? lvl : <Lock size={14} />}
                  </span>
                  {unlocked && <StarRatingBar stars={stars} size="sm" />}
                </button>
              );
            },
          )}
        </div>
      </KineticCard>

      {/* Pre-Level Launch Card */}
      <KineticCard className="flex flex-col gap-3 !p-4">
        <div className="flex items-start justify-between gap-2">
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-display font-extrabold text-base">
                Level {effectiveLevel}
              </span>
              <span
                className="text-[11px] font-bold px-2 py-0.5 rounded-full border"
                style={{
                  backgroundColor: levelPreview.isBoss ? '#fef3c7' : 'var(--g-soft)',
                  color: levelPreview.isBoss ? '#92400e' : 'var(--club-ink)',
                  borderColor: 'var(--club-border-ink)',
                }}
              >
                {levelPreview.badge}
              </span>
            </div>
            <p className="text-xs font-medium mt-1" style={{ color: 'var(--club-muted)' }}>
              {levelPreview.summary}
            </p>
          </div>

          {levelPreview.highScore > 0 && (
            <div className="text-right shrink-0">
              <div className="text-[10px] font-bold uppercase" style={{ color: 'var(--club-muted)' }}>
                Rekor
              </div>
              <div className="font-tabular text-sm font-extrabold">
                {levelPreview.highScore.toLocaleString('id-ID')}
              </div>
            </div>
          )}
        </div>

        <KineticButton
          variant="primary"
          size="lg"
          fullWidth
          data-testid="level-start-btn"
          icon={<Sparkles size={18} strokeWidth={2.5} />}
          onClick={() =>
            startGame({
              game: selectedGame,
              level: effectiveLevel,
              mode: 'normal',
            })
          }
        >
          Main Level {effectiveLevel}
        </KineticButton>
      </KineticCard>
    </div>
  );
};
