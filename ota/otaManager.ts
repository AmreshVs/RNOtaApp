import RNFS from 'react-native-fs';
import { unzip } from 'react-native-zip-archive';

const GITHUB_API = 'https://api.github.com/repos/AmreshVs/RNOtaAppServer/releases/latest'

const OTA_DIR = `${RNFS.DocumentDirectoryPath}/ota`;
const CURRENT_DIR = `${OTA_DIR}/current`;
const PREVIOUS_DIR = `${OTA_DIR}/previous`;
const META_FILE = `${OTA_DIR}/meta.json`;

export async function ensureOTADirs() {
  await RNFS.mkdir(OTA_DIR).catch(() => {});
  await RNFS.mkdir(CURRENT_DIR).catch(() => {});
  await RNFS.mkdir(PREVIOUS_DIR).catch(() => {});
}

async function ensureDir(path: string) {
  const exists = await RNFS.exists(path);
  if (!exists) await RNFS.mkdir(path);
}

export async function checkForUpdate(currentVersion: string) {
  try {
    const res = await fetch(GITHUB_API, {
      headers: {
        Accept: 'application/vnd.github+json',
      },
    });

    const data = await res.json();

    console.log('GitHub release:', data);

    if (!data?.tag_name) return null;

    const latestVersion = data.tag_name.replace(/^v/, '');

    if (latestVersion === currentVersion) {
      return null;
    }

    // Find ZIP asset
    const asset = data.assets?.find((a: any) =>
      a.name.endsWith('.zip')
    );

    if (!asset) {
      console.log('No OTA zip found in release');
      return null;
    }

    return {
      version: latestVersion,
      bundleUrl: asset.browser_download_url,
    };
  } catch (e) {
    console.log('OTA GitHub fetch failed', e);
    return null;
  }
}

export async function downloadUpdate(url: string) {
  await ensureDir(OTA_DIR);

  const zipPath = `${OTA_DIR}/update.zip`;

  const res = await RNFS.downloadFile({
    fromUrl: url,
    toFile: zipPath,
  }).promise;

  if (res.statusCode !== 200) {
    throw new Error('Download failed');
  }

  return zipPath;
}

export async function applyUpdate(zipPath: string, version: string) {
  await ensureOTADirs();

  const TEMP_DIR = `${OTA_DIR}/temp`;

  // Clean temp
  await RNFS.unlink(TEMP_DIR).catch(() => {});
  await RNFS.mkdir(TEMP_DIR);

  // Extract into temp FIRST (safe)
  await unzip(zipPath, TEMP_DIR);

  const bundlePath = `${TEMP_DIR}/index.bundle`;

  const exists = await RNFS.exists(bundlePath);

  if (!exists) {
    throw new Error('Bundle missing after unzip');
  }

  // Backup current
  if (await RNFS.exists(CURRENT_DIR)) {
    await RNFS.unlink(PREVIOUS_DIR).catch(() => {});
    await RNFS.moveFile(CURRENT_DIR, PREVIOUS_DIR);
  }

  // Move temp → current
  await RNFS.moveFile(TEMP_DIR, CURRENT_DIR);

  await RNFS.writeFile(
    META_FILE,
    JSON.stringify({ version, status: 'pending' }),
    'utf8'
  );
}

export async function markSuccess() {
  const data = JSON.parse(await RNFS.readFile(META_FILE));
  data.status = 'success';

  await RNFS.writeFile(META_FILE, JSON.stringify(data), 'utf8');
}

export async function rollbackIfNeeded() {
  const exists = await RNFS.exists(META_FILE);
  if (!exists) return;

  const data = JSON.parse(await RNFS.readFile(META_FILE));

  if (data.status === 'pending') {
    // rollback
    await RNFS.unlink(CURRENT_DIR).catch(() => {});
    await RNFS.moveFile(PREVIOUS_DIR, CURRENT_DIR);
  }
}

export async function clearOTA() {
  const exists = await RNFS.exists(OTA_DIR);

  if (exists) {
    console.log('Clearing corrupted OTA folder');
    await RNFS.unlink(OTA_DIR);
  }
}

export async function getInstalledVersion(): Promise<string | null> {
  try {
    const exists = await RNFS.exists(META_FILE);
    if (!exists) return null;

    const data = JSON.parse(await RNFS.readFile(META_FILE));
    return data.version || null;
  } catch {
    return null;
  }
}