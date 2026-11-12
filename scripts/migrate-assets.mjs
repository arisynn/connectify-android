#!/usr/bin/env node
/**
 * Deterministic Asset Preservation & APK Packaging Pipeline
 * Owned by @art-director
 *
 * 1. Archives ALL 545 original assets from /connectify-new (READ-ONLY) into
 *    /connectify-android/assets-library/ with LIBRARY_INDEX.json.
 * 2. Packages ONLY Onet, Match 3, Shared UI, Theme, Surface, Effect, Avatar,
 *    and Frame assets into public/art/ and src/assets/backgrounds/, resizing
 *    legacy 512px sprites to 256px WebP and converting legacy PNGs to WebP.
 * 3. Bundles offline .woff2 variable fonts (Fredoka, Outfit, JetBrains Mono)
 *    into public/fonts/ matching index.html @font-face declarations.
 */

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const TARGET_ROOT = path.resolve(__dirname, '..');
const SOURCE_ROOT = path.resolve(TARGET_ROOT, '..', 'connectify-new');

const LIBRARY_ROOT = path.join(TARGET_ROOT, 'assets-library');
const PUBLIC_ART = path.join(TARGET_ROOT, 'public', 'art');
const PUBLIC_FONTS = path.join(TARGET_ROOT, 'public', 'fonts');
const SRC_BACKGROUNDS = path.join(TARGET_ROOT, 'src', 'assets', 'backgrounds');

const IMAGE_EXTS = new Set(['.png', '.webp', '.jpg', '.jpeg', '.svg']);

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function sha256File(filePath) {
  const hash = crypto.createHash('sha256');
  hash.update(fs.readFileSync(filePath));
  return hash.digest('hex');
}

function walkFiles(dir, baseDir = dir) {
  if (!fs.existsSync(dir)) return [];
  const results = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...walkFiles(full, baseDir));
    } else if (entry.isFile()) {
      const ext = path.extname(entry.name).toLowerCase();
      if (IMAGE_EXTS.has(ext)) {
        results.push(path.relative(baseDir, full).split(path.sep).join('/'));
      }
    }
  }
  return results.sort();
}

function classifySourceAsset(relPath) {
  if (relPath.startsWith('scripts/art-originals/')) return 'art-originals';
  if (
    relPath.startsWith('public/art/infinity/') ||
    relPath.startsWith('public/art/star-patrol/') ||
    relPath.startsWith('public/art/premium/baskets/') ||
    relPath.startsWith('public/art/premium/cards/') ||
    relPath.startsWith('public/art/premium/fruit-merge/')
  ) {
    return 'excluded-modes';
  }
  if (
    relPath.startsWith('public/art/premium/ui/') &&
    ['block.webp', 'memory.webp', 'fruit-merge.webp', 'multiplayer.webp'].includes(
      path.posix.basename(relPath),
    )
  ) {
    return 'excluded-modes';
  }
  if (
    relPath.startsWith('public/art/chests/') ||
    relPath === 'public/art/premium/chests/common.webp' ||
    relPath === 'public/art/premium/chests/rare.webp' ||
    relPath.startsWith('src/assets/vanilla/logo/chest_') ||
    relPath === 'src/assets/vanilla/logo/collection_chest.png'
  ) {
    return 'legacy-chests';
  }
  if (
    relPath === 'public/logo.png' ||
    relPath.startsWith('public/brand/') ||
    relPath.startsWith('public/art/atelier/') ||
    relPath.endsWith('/sheet.webp')
  ) {
    return 'legacy-replaced';
  }
  if (
    relPath.startsWith('src/assets/vanilla/logo/') &&
    !['back.png', 'music_on.png', 'settings.png', 'sound_off.png', 'sound_on.png'].includes(
      path.posix.basename(relPath),
    )
  ) {
    return 'legacy-replaced';
  }
  return 'production-core';
}

function archiveAllSourceAssets() {
  if (!fs.existsSync(SOURCE_ROOT)) {
    throw new Error(`Read-only source repository not found at: ${SOURCE_ROOT}`);
  }

  const scanDirs = ['public', 'src/assets', 'scripts/art-originals'];
  const allRelPaths = [];
  for (const d of scanDirs) {
    const abs = path.join(SOURCE_ROOT, d);
    for (const r of walkFiles(abs, SOURCE_ROOT)) {
      allRelPaths.push(r);
    }
  }
  allRelPaths.sort();

  const indexEntries = [];
  let totalSourceBytes = 0;

  for (const rel of allRelPaths) {
    const srcAbs = path.join(SOURCE_ROOT, rel);
    const category = classifySourceAsset(rel);

    let archiveRel;
    if (category === 'art-originals') {
      archiveRel = rel.replace(/^scripts\//, '');
    } else if (category === 'excluded-modes') {
      archiveRel = path.posix.join('excluded-modes', rel.replace(/^public\/art\/(premium\/)?/, ''));
    } else if (category === 'legacy-chests') {
      archiveRel = path.posix.join('legacy-replaced/chests', rel);
    } else if (category === 'legacy-replaced') {
      archiveRel = path.posix.join('legacy-replaced/other', rel);
    } else {
      archiveRel = path.posix.join('production-originals', rel);
    }

    const destAbs = path.join(LIBRARY_ROOT, archiveRel);
    ensureDir(path.dirname(destAbs));
    fs.copyFileSync(srcAbs, destAbs);

    const stat = fs.statSync(srcAbs);
    totalSourceBytes += stat.size;
    indexEntries.push({
      sourcePath: rel,
      archivePath: archiveRel,
      category,
      bytes: stat.size,
      sha256: sha256File(srcAbs),
    });
  }

  ensureDir(LIBRARY_ROOT);
  const manifest = {
    generatedAt: new Date().toISOString(),
    sourceRepo: SOURCE_ROOT,
    totalFiles: indexEntries.length,
    totalBytes: totalSourceBytes,
    totalKB: Number((totalSourceBytes / 1024).toFixed(1)),
    byCategory: indexEntries.reduce((acc, item) => {
      acc[item.category] = (acc[item.category] || 0) + 1;
      return acc;
    }, {}),
    files: indexEntries,
  };
  fs.writeFileSync(path.join(LIBRARY_ROOT, 'LIBRARY_INDEX.json'), JSON.stringify(manifest, null, 2));
  return manifest;
}

function copyVerbatim(relSrc, destAbs) {
  const srcAbs = path.join(SOURCE_ROOT, relSrc);
  if (!fs.existsSync(srcAbs)) {
    throw new Error(`Missing source asset: ${srcAbs}`);
  }
  ensureDir(path.dirname(destAbs));
  fs.copyFileSync(srcAbs, destAbs);
}

function convertImagesWithPython(jobs) {
  if (jobs.length === 0) return;
  const pyScript = `
import json, os, sys
from PIL import Image

jobs = json.load(sys.stdin)
for job in jobs:
    src = job['src']
    dst = job['dst']
    size = job.get('size')
    quality = job.get('quality', 88)
    os.makedirs(os.path.dirname(dst), exist_ok=True)
    with Image.open(src) as im:
        if im.mode not in ('RGBA', 'RGB'):
            im = im.convert('RGBA')
        if size and (im.width != size or im.height != size):
            im = im.resize((size, size), Image.Resampling.LANCZOS)
        im.save(dst, 'WEBP', quality=quality, method=4)
`;
  execFileSync('python3', ['-c', pyScript], {
    input: JSON.stringify(jobs),
    stdio: ['pipe', 'inherit', 'inherit'],
  });
}

function packageProductionAssets() {
  // Clean existing public/art to guarantee zero stale excluded files
  if (fs.existsSync(PUBLIC_ART)) {
    fs.rmSync(PUBLIC_ART, { recursive: true, force: true });
  }
  ensureDir(PUBLIC_ART);
  ensureDir(SRC_BACKGROUNDS);

  const convertJobs = [];

  // 1. Brand icons -> both public/art/brand/ (index.html) & public/art/premium/brand/ (fallback)
  for (const file of ['mark.webp', 'favicon.png', 'touch-icon.png']) {
    copyVerbatim(`public/art/premium/brand/${file}`, path.join(PUBLIC_ART, 'brand', file));
    copyVerbatim(`public/art/premium/brand/${file}`, path.join(PUBLIC_ART, 'premium', 'brand', file));
  }

  // 2. Backgrounds -> public/art/backgrounds/ & src/assets/backgrounds/
  for (const file of ['global_background.webp', 'popup_background.webp']) {
    copyVerbatim(`src/assets/vanilla/background/${file}`, path.join(PUBLIC_ART, 'backgrounds', file));
    copyVerbatim(`src/assets/vanilla/background/${file}`, path.join(SRC_BACKGROUNDS, file));
  }

  // 3. Active Premium UI icons (13 active) + gift icon (epic chest)
  const activeUi = [
    'onet.webp',
    'triple.webp',
    'hint.webp',
    'shuffle.webp',
    'hammer.webp',
    'bomb.webp',
    'permen.webp',
    'achievements.webp',
    'missions.webp',
    'collection.webp',
    'theme.webp',
    'notifications.webp',
    'leaderboard.webp',
  ];
  for (const file of activeUi) {
    copyVerbatim(`public/art/premium/ui/${file}`, path.join(PUBLIC_ART, 'premium', 'ui', file));
  }
  // Alias match3.webp for clean Match 3 naming alongside triple.webp
  copyVerbatim('public/art/premium/ui/triple.webp', path.join(PUBLIC_ART, 'premium', 'ui', 'match3.webp'));
  copyVerbatim('public/art/premium/chests/epic.webp', path.join(PUBLIC_ART, 'premium', 'chests', 'epic.webp'));

  // 4. Active Vanilla UI control icons (convert 256 PNG -> 128 WebP)
  for (const name of ['back', 'settings', 'music_on', 'sound_on', 'sound_off']) {
    convertJobs.push({
      src: path.join(SOURCE_ROOT, 'src/assets/vanilla/logo', `${name}.png`),
      dst: path.join(PUBLIC_ART, 'ui-controls', `${name}.webp`),
      size: 128,
      quality: 90,
    });
  }

  // 5. Vanilla Default `sweets` tiles (15 PNG -> 256 WebP)
  const vanillaTilesDir = path.join(SOURCE_ROOT, 'src/assets/vanilla/tiles');
  for (const entry of fs.readdirSync(vanillaTilesDir)) {
    if (entry.endsWith('.png')) {
      const stem = entry.replace(/\.png$/i, '');
      convertJobs.push({
        src: path.join(vanillaTilesDir, entry),
        dst: path.join(PUBLIC_ART, 'vanilla', 'tiles', `${stem}.webp`),
        size: 256,
        quality: 90,
      });
    }
  }

  // 6. Classic 4 Themes (candy, forest, ocean, space) — 0..15.webp verbatim (skip sheet.webp)
  for (const theme of ['candy', 'forest', 'ocean', 'space']) {
    for (let i = 0; i < 16; i++) {
      copyVerbatim(`public/art/${theme}/${i}.webp`, path.join(PUBLIC_ART, theme, `${i}.webp`));
    }
  }

  // 7. Atelier 5 + Seasonal 4 Themes under public/art/premium/ — 0..15.webp verbatim
  const premiumThemes = [
    'meadow',
    'sakura',
    'bakery',
    'galaxy',
    'fruit',
    'autumn_harvest',
    'magic_atelier',
    'retro_arcade',
    'alpine_winter',
  ];
  for (const theme of premiumThemes) {
    for (let i = 0; i < 16; i++) {
      copyVerbatim(`public/art/premium/${theme}/${i}.webp`, path.join(PUBLIC_ART, 'premium', theme, `${i}.webp`));
    }
  }

  // 8. Legacy 5 Reward Themes (512 -> 256 normalized WebP)
  for (const theme of ['meadow', 'sakura', 'bakery', 'galaxy', 'fruit']) {
    for (let i = 0; i < 10; i++) {
      convertJobs.push({
        src: path.join(SOURCE_ROOT, 'public/art', theme, `${i}.webp`),
        dst: path.join(PUBLIC_ART, theme, `${i}.webp`),
        size: 256,
        quality: 86,
      });
    }
  }

  // 9. Surfaces (13 verbatim) & Legacy Milestone Skins (9 normalized 512 -> 256 WebP)
  const surfacesDir = path.join(SOURCE_ROOT, 'public/art/premium/surfaces');
  for (const entry of fs.readdirSync(surfacesDir)) {
    if (entry.endsWith('.webp')) {
      copyVerbatim(`public/art/premium/surfaces/${entry}`, path.join(PUBLIC_ART, 'premium', 'surfaces', entry));
    }
  }
  const skinsDir = path.join(SOURCE_ROOT, 'public/art/skins');
  for (const entry of fs.readdirSync(skinsDir)) {
    if (entry.endsWith('.webp')) {
      convertJobs.push({
        src: path.join(skinsDir, entry),
        dst: path.join(PUBLIC_ART, 'skins', entry),
        size: 256,
        quality: 86,
      });
    }
  }

  // 10. Effects (7 verbatim) & Frames (7 verbatim)
  for (const dir of ['effects', 'frames']) {
    const abs = path.join(SOURCE_ROOT, 'public/art/premium', dir);
    for (const entry of fs.readdirSync(abs)) {
      if (entry.endsWith('.webp')) {
        copyVerbatim(`public/art/premium/${dir}/${entry}`, path.join(PUBLIC_ART, 'premium', dir, entry));
      }
    }
  }

  // 11. Avatars (13 premium verbatim + 9 milestone 0..8 verbatim + 3 reward normalized 512 -> 256)
  const premAvatarsDir = path.join(SOURCE_ROOT, 'public/art/premium/avatars');
  for (const entry of fs.readdirSync(premAvatarsDir)) {
    if (entry.endsWith('.webp')) {
      copyVerbatim(`public/art/premium/avatars/${entry}`, path.join(PUBLIC_ART, 'premium', 'avatars', entry));
    }
  }
  for (let i = 0; i < 9; i++) {
    copyVerbatim(`public/art/avatars/${i}.webp`, path.join(PUBLIC_ART, 'avatars', `${i}.webp`));
  }
  for (const rewardAvatar of ['bear.webp', 'cat.webp', 'panda.webp']) {
    convertJobs.push({
      src: path.join(SOURCE_ROOT, 'public/art/avatars', rewardAvatar),
      dst: path.join(PUBLIC_ART, 'avatars', rewardAvatar),
      size: 256,
      quality: 86,
    });
  }

  convertImagesWithPython(convertJobs);
}

function isValidWoff2(filePath) {
  if (!fs.existsSync(filePath)) return false;
  const buf = fs.readFileSync(filePath);
  return buf.length > 4096 && buf.subarray(0, 4).toString('ascii') === 'wOF2';
}

function bundleOfflineFonts() {
  ensureDir(PUBLIC_FONTS);
  const specs = [
    {
      file: 'fredoka-latin-wght.woff2',
      cssUrl: 'https://fonts.googleapis.com/css2?family=Fredoka:wght@400..700&display=swap',
    },
    {
      file: 'outfit-latin-wght.woff2',
      cssUrl: 'https://fonts.googleapis.com/css2?family=Outfit:wght@400..900&display=swap',
    },
    {
      file: 'jetbrains-mono-latin.woff2',
      cssUrl: 'https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@500..700&display=swap',
    },
  ];

  for (const spec of specs) {
    const dest = path.join(PUBLIC_FONTS, spec.file);
    if (isValidWoff2(dest)) continue;

    const css = execFileSync(
      'curl',
      [
        '-fsSL',
        '-A',
        'Mozilla/5.0 (Linux; Android 14) Chrome/124.0.0.0 Mobile Safari/537.36',
        spec.cssUrl,
      ],
      { encoding: 'utf8' },
    );

    // Pick the latin unicode-range block's woff2 URL (last block in Google Fonts CSS2)
    const blocks = css.split('/* latin */');
    const targetBlock = blocks.length > 1 ? blocks[blocks.length - 1] : css;
    const urls = [...targetBlock.matchAll(/url\((https:\/\/fonts\.gstatic\.com\/[^)]+\.woff2)\)/g)].map(
      (m) => m[1],
    );
    const fontUrl = urls[urls.length - 1];
    if (!fontUrl) {
      throw new Error(`Could not resolve latin .woff2 URL from ${spec.cssUrl}`);
    }
    execFileSync('curl', ['-fsSL', fontUrl, '-o', dest]);
    if (!isValidWoff2(dest)) {
      throw new Error(`Downloaded font failed WOFF2 magic header check: ${dest}`);
    }
  }
}

function runVerificationChecks() {
  const forbiddenSubstrings = [
    '/infinity/',
    '/star-patrol/',
    '/baskets/',
    '/cards/',
    '/fruit-merge/',
    '/atelier/',
    '/chests/common',
    '/chests/rare',
    'sheet.webp',
    'block.webp',
    'memory.webp',
    'multiplayer.webp',
  ];

  const packagedArt = walkFiles(PUBLIC_ART, PUBLIC_ART);
  let totalBytes = 0;
  for (const rel of packagedArt) {
    const checkPath = `/${rel}`;
    for (const bad of forbiddenSubstrings) {
      if (checkPath.includes(bad)) {
        throw new Error(`Forbidden legacy asset leaked into public/art: ${rel}`);
      }
    }
    totalBytes += fs.statSync(path.join(PUBLIC_ART, rel)).size;
  }

  const fontFiles = fs.readdirSync(PUBLIC_FONTS).filter((f) => f.endsWith('.woff2'));
  let fontBytes = 0;
  for (const f of fontFiles) {
    const abs = path.join(PUBLIC_FONTS, f);
    if (!isValidWoff2(abs)) throw new Error(`Invalid woff2 font: ${f}`);
    fontBytes += fs.statSync(abs).size;
  }

  return {
    packagedArtCount: packagedArt.length,
    packagedArtKB: Number((totalBytes / 1024).toFixed(1)),
    fontCount: fontFiles.length,
    fontKB: Number((fontBytes / 1024).toFixed(1)),
  };
}

function main() {
  const archiveSummary = archiveAllSourceAssets();
  packageProductionAssets();
  bundleOfflineFonts();
  const prodSummary = runVerificationChecks();

  console.log(
    JSON.stringify(
      {
        status: 'OK',
        archivedLibrary: {
          totalFiles: archiveSummary.totalFiles,
          totalKB: archiveSummary.totalKB,
          byCategory: archiveSummary.byCategory,
        },
        productionAPK: prodSummary,
      },
      null,
      2,
    ),
  );
}

main();
