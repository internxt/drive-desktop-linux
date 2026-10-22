#!/usr/bin/env node
const { execFileSync } = require('node:child_process');
const { createHash } = require('node:crypto');
const {
  chmodSync,
  copyFileSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  lstatSync,
} = require('node:fs');
const { tmpdir } = require('node:os');
const { join, resolve, isAbsolute } = require('node:path');

/**
 * @param {{ releaseTag?: string, repository?: string, destinationDirectory?: string }} [options]
 * @returns {void}
 */
function installMailBridge({
  releaseTag,
  repository = 'internxt/mail-bridge-desktop',
  destinationDirectory = resolve(__dirname, '../.mail-bridge'),
} = {}) {
  if (!releaseTag) {
    const constants = readFileSync(
      resolve(__dirname, '../packages/core/src/backend/features/mail-bridge/constants.ts'),
      'utf8',
    );
    releaseTag = constants.match(/export const mailBridgeReleaseTag = '([^']+)';/)?.[1];
    if (!releaseTag) throw new Error('Could not read the Mail Bridge release pin from packages/core.');
  }
  if (process.platform !== 'linux' || process.arch !== 'x64')
    throw new Error('Mail Bridge Linux releases currently require x64.');
  const archiveName = `mail-bridge_${releaseTag.replace(/^v/, '')}_linux_amd64.tar.gz`;
  const stagingDirectory = mkdtempSync(join(tmpdir(), 'mail-bridge-download-'));
  try {
    /** @type {{ assets: Array<{ name: string, digest?: string | null }> }} */
    const release = JSON.parse(
      execFileSync('gh', ['api', `repos/${repository}/releases/tags/${releaseTag}`], { encoding: 'utf8' }),
    );
    const assets = release.assets.filter((asset) => asset.name === archiveName);
    const checksum = assets[0]?.digest?.replace(/^sha256:/, '');
    if (assets.length !== 1 || typeof checksum !== 'string' || !/^[a-fA-F0-9]{64}$/.test(checksum))
      throw new Error(`Release ${releaseTag} must provide a SHA-256 digest for ${archiveName}.`);
    execFileSync(
      'gh',
      ['release', 'download', releaseTag, '--repo', repository, '--pattern', archiveName, '--dir', stagingDirectory],
      { stdio: 'inherit' },
    );
    const archivePath = join(stagingDirectory, archiveName);
    const actualChecksum = createHash('sha256').update(readFileSync(archivePath)).digest('hex');
    if (actualChecksum !== checksum.toLowerCase()) throw new Error(`Checksum mismatch for ${archiveName}.`);

    const extractedDirectory = join(stagingDirectory, 'extracted');
    extractArchive(archivePath, extractedDirectory);
    let executables = findFiles(extractedDirectory).filter((file) => file.endsWith('/mail-bridge'));
    // Match Desktop's support for older releases wrapping the binary in a second archive.
    if (!executables.length) {
      const nestedArchives = findFiles(extractedDirectory).filter((file) => /mail-bridge.*\.(tar\.gz|tgz)$/.test(file));
      if (nestedArchives.length !== 1)
        throw new Error(`${archiveName} must contain exactly one nested Mail Bridge archive.`);
      const nestedDirectory = join(stagingDirectory, 'nested');
      extractArchive(nestedArchives[0], nestedDirectory);
      executables = findFiles(nestedDirectory).filter((file) => file.endsWith('/mail-bridge'));
    }
    if (executables.length !== 1) throw new Error(`${archiveName} must contain exactly one mail-bridge executable.`);
    mkdirSync(destinationDirectory, { recursive: true });
    const destination = join(destinationDirectory, 'mail-bridge');
    copyFileSync(executables[0], destination);
    chmodSync(destination, 0o755);
    console.log(`Mail Bridge ${releaseTag} is ready at ${destinationDirectory}.`);
  } finally {
    rmSync(stagingDirectory, { recursive: true, force: true });
  }
}

/**
 * @param {string} archivePath
 * @param {string} directory
 * @returns {void}
 */
function extractArchive(archivePath, directory) {
  const entries = execFileSync('tar', ['-tzf', archivePath], { encoding: 'utf8' }).split('\n').filter(Boolean);
  if (entries.some((entry) => isAbsolute(entry) || entry.split('/').includes('..')))
    throw new Error('Mail Bridge archive contains an invalid path.');
  // Only regular files and directories are allowed; reject links before extracting.
  const listing = execFileSync('tar', ['-tvzf', archivePath], { encoding: 'utf8' }).split('\n').filter(Boolean);
  if (listing.some((entry) => !['-', 'd'].includes(entry[0])))
    throw new Error('Mail Bridge archive contains unsupported entries.');
  mkdirSync(directory);
  execFileSync('tar', ['-xzf', archivePath, '--no-same-owner', '--no-same-permissions', '-C', directory]);
}

/**
 * @param {string} directory
 * @returns {string[]}
 */
function findFiles(directory) {
  return readdirSync(directory).flatMap((name) => {
    const path = join(directory, name);
    return lstatSync(path).isDirectory() ? findFiles(path) : [path];
  });
}

if (require.main === module) {
  try {
    installMailBridge({
      releaseTag: process.argv[2] || undefined,
      repository: process.argv[3] || undefined,
      destinationDirectory: process.argv[4] || undefined,
    });
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}
module.exports = { installMailBridge };
