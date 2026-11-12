#!/usr/bin/env node
/**
 * Cross-platform Android APK build script for Connectify Android.
 * Supports x86_64 CI runners and aarch64 Termux/Linux hosts (with automatic
 * native ARM64 aapt2 override detection).
 * Owned by @android-eng.
 */

import { spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync } from 'node:fs';
import { access, copyFile, mkdir, readdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const androidDir = join(root, 'android');
const args = new Set(process.argv.slice(2));
const isDebug = args.has('--debug');
const skipQa = args.has('--skip-qa');
const skipSync = args.has('--skip-sync');

const versionFile = join(root, 'app-version.json');
const version = existsSync(versionFile)
  ? JSON.parse(await readFile(versionFile, 'utf8'))
  : { version: '1.0.0', versionCode: 1 };

if (
  !/^\d+\.\d+\.\d+(?:-[A-Za-z0-9.-]+)?$/.test(version.version) ||
  !Number.isSafeInteger(version.versionCode) ||
  version.versionCode < 1
) {
  throw new Error('Invalid app-version.json');
}

const outputDir = resolve(process.env.CONNECTIFY_OUTPUT_DIR || join(root, 'artifacts'));
const env = { ...process.env };

const run = (command, commandArgs, cwd = root, overrides = {}) =>
  new Promise((resolveRun, rejectRun) => {
    const child = spawn(command, commandArgs, {
      cwd,
      env: { ...env, ...overrides },
      stdio: 'inherit',
    });
    child.on('error', rejectRun);
    child.on('exit', (code) => {
      if (code === 0) resolveRun();
      else rejectRun(new Error(`${command} ${commandArgs.join(' ')} failed (${code})`));
    });
  });

// Resolve Android SDK
let sdkRoot = env.ANDROID_HOME || env.ANDROID_SDK_ROOT || '';
if (!sdkRoot && existsSync(join(androidDir, 'local.properties'))) {
  const localProps = await readFile(join(androidDir, 'local.properties'), 'utf8');
  sdkRoot = localProps.match(/^sdk\.dir=(.+)$/m)?.[1]?.trim() || '';
}
if (!sdkRoot) {
  for (const candidate of ['/root/android-sdk', '/opt/android-sdk', '/usr/local/lib/android/sdk']) {
    if (existsSync(candidate)) {
      sdkRoot = candidate;
      break;
    }
  }
}
if (!sdkRoot || !existsSync(sdkRoot)) {
  throw new Error(
    'Android SDK not found. Set ANDROID_HOME / ANDROID_SDK_ROOT or android/local.properties (sdk.dir=...).'
  );
}
env.ANDROID_HOME = sdkRoot;
env.ANDROID_SDK_ROOT = sdkRoot;

// Resolve Java 21
if (!env.JAVA_HOME) {
  for (const jdkCandidate of [
    '/data/data/com.termux/files/usr/lib/jvm/java-21-openjdk',
    '/usr/lib/jvm/java-21-openjdk-arm64',
    '/usr/lib/jvm/java-21-openjdk-amd64',
  ]) {
    if (existsSync(join(jdkCandidate, 'bin/java'))) {
      env.JAVA_HOME = jdkCandidate;
      break;
    }
  }
}

// Forward HTTP/HTTPS proxy to Gradle JVM cleanly without disabling TLS
if (env.HTTPS_PROXY || env.https_proxy) {
  const proxy = new URL(env.HTTPS_PROXY || env.https_proxy);
  const proxyOpts = [
    `-Dhttps.proxyHost=${proxy.hostname}`,
    `-Dhttps.proxyPort=${proxy.port || 443}`,
    `-Dhttp.proxyHost=${proxy.hostname}`,
    `-Dhttp.proxyPort=${proxy.port || 80}`,
    '-Dhttp.nonProxyHosts=localhost|127.*',
  ];
  env.GRADLE_OPTS = [env.GRADLE_OPTS, ...proxyOpts].filter(Boolean).join(' ');
}

let signing;
if (!isDebug && env.CONNECTIFY_SIGNING_DIR) {
  const folder = resolve(env.CONNECTIFY_SIGNING_DIR);
  signing = JSON.parse(await readFile(join(folder, 'signing.json'), 'utf8'));
  signing.path = resolve(folder, signing.storeFile);
  await access(signing.path);
}

if (!skipSync) {
  await run('npm', ['run', 'build']);
  await run('npx', ['cap', 'sync', 'android']);
}

if (!existsSync(join(androidDir, 'gradlew'))) {
  throw new Error('android/gradlew not found. Initialize Capacitor Android project first.');
}

const gradleArgs = ['--no-daemon', '--max-workers=2'];

// Google Maven aapt2 is x86_64-only; override on arm64/aarch64 hosts
if (process.arch === 'arm64') {
  const localAapt2 = [
    env.CONNECTIFY_AAPT2_PATH,
    '/data/data/com.termux/files/usr/bin/aapt2',
    '/usr/bin/aapt2',
  ].find((p) => p && existsSync(p));
  if (!localAapt2) {
    throw new Error(
      'arm64 host detected but no native aapt2 found. Install aapt2 (`pkg install aapt2` in Termux) or set CONNECTIFY_AAPT2_PATH.'
    );
  }
  gradleArgs.push(`-Pandroid.aapt2FromMavenOverride=${localAapt2}`);
}

const tasks = isDebug
  ? ['assembleDebug']
  : skipQa
    ? ['assembleRelease']
    : ['testReleaseUnitTest', 'assembleRelease', 'lintRelease'];

await run('./gradlew', [...gradleArgs, ...tasks], androidDir);

await mkdir(outputDir, { recursive: true });

const findApk = async (dir) => {
  const files = await readdir(dir);
  const apk = files.find((f) => f.endsWith('.apk'));
  if (!apk) throw new Error(`No APK found in ${dir}`);
  return join(dir, apk);
};

if (isDebug) {
  const srcApk = await findApk(join(androidDir, 'app/build/outputs/apk/debug'));
  const fileName = `Connectify-${version.version}-debug.apk`;
  const destApk = join(outputDir, fileName);
  await copyFile(srcApk, destApk);
  const bytes = await readFile(destApk);
  const sha = createHash('sha256').update(bytes).digest('hex');
  await writeFile(`${destApk}.sha256`, `${sha}  ${fileName}\n`);
  console.log(`Debug APK: ${destApk} (${bytes.length} bytes, sha256=${sha})`);
} else {
  const srcApk = await findApk(join(androidDir, 'app/build/outputs/apk/release'));
  const buildToolsDir = join(
    sdkRoot,
    'build-tools',
    (await readdir(join(sdkRoot, 'build-tools')))
      .filter((v) => /^\d+\.\d+\.\d+$/.test(v))
      .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }))
      .at(-1) || '36.0.0'
  );
  const zipalign = join(buildToolsDir, 'zipalign');
  const apksigner = join(buildToolsDir, 'apksigner');
  const aligned = join(androidDir, 'app/build/outputs/apk/release/connectify-aligned.apk');
  await run(zipalign, ['-P', '16', '-f', '4', srcApk, aligned]);

  if (signing) {
    const fileName = `Connectify-${version.version}-release.apk`;
    const destApk = join(outputDir, fileName);
    await run(
      apksigner,
      [
        'sign',
        '--ks',
        signing.path,
        '--ks-key-alias',
        signing.alias,
        '--ks-pass',
        'env:CONNECTIFY_KS_PASS',
        '--key-pass',
        'env:CONNECTIFY_KEY_PASS',
        '--v1-signing-enabled',
        'true',
        '--v2-signing-enabled',
        'true',
        '--v3-signing-enabled',
        'true',
        '--out',
        destApk,
        aligned,
      ],
      root,
      {
        CONNECTIFY_KS_PASS: signing.storePassword,
        CONNECTIFY_KEY_PASS: signing.keyPassword || signing.storePassword,
      }
    );
    await run(apksigner, ['verify', '--verbose', '--print-certs', destApk]);
    await run(zipalign, ['-c', '-P', '16', '4', destApk]);
    const bytes = await readFile(destApk);
    const sha = createHash('sha256').update(bytes).digest('hex');
    await writeFile(`${destApk}.sha256`, `${sha}  ${fileName}\n`);
    await writeFile(
      join(outputDir, 'Connectify-release-info.json'),
      `${JSON.stringify(
        {
          schemaVersion: 1,
          applicationId: 'com.connectify.android',
          version: version.version,
          versionCode: version.versionCode,
          releaseTag: `v${version.version}`,
          releaseStatus: version.version.includes('-') ? 'prerelease' : 'stable',
          signedApk: { file: fileName, bytes: bytes.length, sha256: sha },
        },
        null,
        2
      )}\n`
    );
    console.log(`Signed Release APK: ${destApk} (${bytes.length} bytes)`);
  } else {
    const fileName = `Connectify-${version.version}-release-unsigned.apk`;
    const destApk = join(outputDir, fileName);
    await copyFile(aligned, destApk);
    const bytes = await readFile(destApk);
    const sha = createHash('sha256').update(bytes).digest('hex');
    await writeFile(`${destApk}.sha256`, `${sha}  ${fileName}\n`);
    console.log(`Unsigned Release APK: ${destApk} (${bytes.length} bytes)`);
  }
}
