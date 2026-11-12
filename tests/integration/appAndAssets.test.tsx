import fs from 'node:fs';
import path from 'node:path';
import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { APP_CONFIG, GAME_IDS, GAME_METADATA } from '@/config/app.config';
import App from '@/app/App';

const PROJECT_ROOT = path.resolve(__dirname, '../..');
const PUBLIC_DIR = path.join(PROJECT_ROOT, 'public');
const DIST_DIR = path.join(PROJECT_ROOT, 'dist');

function walkFiles(dir: string): string[] {
  if (!fs.existsSync(dir)) return [];
  const results: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...walkFiles(full));
    } else if (entry.isFile()) {
      results.push(full);
    }
  }
  return results;
}

describe('App Integration, Game Registry Scope & Offline Asset/Bundle Audit (INT-01..04)', () => {
  let mountNode: HTMLDivElement | null = null;
  let root: Root | null = null;

  beforeEach(() => {
    // Provide matchMedia stub for JSDOM if absent
    if (typeof window.matchMedia !== 'function') {
      Object.defineProperty(window, 'matchMedia', {
        writable: true,
        configurable: true,
        value: (query: string) => ({
          matches: false,
          media: query,
          onchange: null,
          addListener: () => {},
          removeListener: () => {},
          addEventListener: () => {},
          removeEventListener: () => {},
          dispatchEvent: () => false,
        }),
      });
    }
    (globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  });

  afterEach(async () => {
    if (root) {
      await act(async () => {
        root!.unmount();
      });
      root = null;
    }
    mountNode?.remove();
    mountNode = null;
    document.getElementById('static-loader')?.remove();
  });

  it('INT-01: enforces strict Onet + Match 3 only scope in APP_CONFIG, GAME_IDS & GAME_METADATA', () => {
    expect(GAME_IDS).toEqual(['onet', 'match3']);
    expect(APP_CONFIG.supportedGames).toEqual(['onet', 'match3']);
    expect(Object.keys(GAME_METADATA).sort()).toEqual(['match3', 'onet']);

    const serialized = JSON.stringify({ APP_CONFIG, GAME_IDS, GAME_METADATA }).toLowerCase();
    for (const forbidden of ['block_puzzle', 'memory_flip', 'star_patrol', 'infinity']) {
      expect(serialized).not.toContain(forbidden);
    }

    // Check config asset paths exist under public/
    const assetPaths = [
      APP_CONFIG.currencyIconAsset,
      GAME_METADATA.onet.iconAsset,
      ...GAME_METADATA.onet.coverSprites,
      GAME_METADATA.match3.iconAsset,
      ...GAME_METADATA.match3.coverSprites,
    ];
    for (const rel of assetPaths) {
      const normalized = rel.replace(/^\//, '');
      expect(fs.existsSync(path.join(PUBLIC_DIR, normalized))).toBe(true);
    }
  });

  it('INT-02: boots <App /> cleanly completely offline in JSDOM without uncaught errors', async () => {
    Object.defineProperty(window.navigator, 'onLine', {
      configurable: true,
      get: () => false,
    });

    const loader = document.createElement('div');
    loader.id = 'static-loader';
    document.body.appendChild(loader);

    mountNode = document.createElement('div');
    mountNode.id = 'root';
    document.body.appendChild(mountNode);

    await act(async () => {
      root = createRoot(mountNode!);
      root.render(React.createElement(App));
      await new Promise((resolve) => setTimeout(resolve, 120));
    });

    expect((window as unknown as { _loaderReady?: boolean })._loaderReady).toBe(true);
    expect(mountNode.innerHTML.length).toBeGreaterThan(0);
    expect(mountNode.textContent).not.toContain('Ups, Ada Kendala');
  });

  it('INT-03: verifies production dist/ assets resolve locally with zero broken /art/ or /fonts/ refs', () => {
    expect(fs.existsSync(path.join(DIST_DIR, 'index.html'))).toBe(true);
    const distFiles = walkFiles(DIST_DIR);
    const bundleFiles = distFiles.filter((f) => /\.(html|js|css)$/i.test(f));
    expect(bundleFiles.length).toBeGreaterThanOrEqual(3);

    const concreteAssetRefRegex = /(?:\.?\/)(art|fonts)\/[A-Za-z0-9_./-]+\.(?:webp|png|svg|woff2|ogg|mp3)/g;
    const checkedRefs = new Set<string>();

    for (const file of bundleFiles) {
      const text = fs.readFileSync(file, 'utf8');
      // No external CDN dependencies in shipped app bundles
      expect(text).not.toMatch(/fonts\.googleapis\.com|cdn\.jsdelivr\.net|unpkg\.com/i);

      const matches = text.match(concreteAssetRefRegex) ?? [];
      for (const rawRef of matches) {
        const cleanRel = rawRef.replace(/^\.\//, '').replace(/^\//, '');
        checkedRefs.add(cleanRel);
        expect(fs.existsSync(path.join(DIST_DIR, cleanRel))).toBe(true);
      }
    }

    expect(checkedRefs.size).toBeGreaterThan(0);
    // Bundled woff2 fonts present in dist/fonts/
    for (const fontName of [
      'fredoka-latin-wght.woff2',
      'outfit-latin-wght.woff2',
      'jetbrains-mono-latin.woff2',
    ]) {
      expect(fs.existsSync(path.join(DIST_DIR, 'fonts', fontName))).toBe(true);
    }
  });

  it('INT-04: confirms zero phaser, matter-js, or supabase code remains in production dist/ bundle', () => {
    const distJsFiles = walkFiles(path.join(DIST_DIR, 'assets')).filter((f) => f.endsWith('.js'));
    const indexHtml = fs.readFileSync(path.join(DIST_DIR, 'index.html'), 'utf8');
    expect(distJsFiles.length).toBeGreaterThan(0);

    for (const file of [path.join(DIST_DIR, 'index.html'), ...distJsFiles]) {
      const content = file.endsWith('.html') ? indexHtml : fs.readFileSync(file, 'utf8');
      expect(content).not.toMatch(/\bphaser\b/i);
      expect(content).not.toMatch(/matter-js/i);
      expect(content).not.toMatch(/supabase/i);
    }
  });
});
