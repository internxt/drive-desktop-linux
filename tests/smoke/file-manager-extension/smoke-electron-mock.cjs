const Module = require('node:module');
const os = require('node:os');
const path = require('node:path');
const fs = require('node:fs');

const originalLoad = Module._load;
const workspaceTempDir = path.join(process.cwd(), '.tmp', 'file-manager-smoke-temp');

if (!fs.existsSync(workspaceTempDir)) {
  fs.mkdirSync(workspaceTempDir, { recursive: true, mode: 0o700 });
}

function getPath(name) {
  if (name === 'home') {
    return os.homedir();
  }

  if (name === 'appData') {
    return path.join(os.homedir(), '.config');
  }

  if (name === 'temp') {
    return process.env.TMPDIR || workspaceTempDir;
  }

  return process.cwd();
}

Module._load = function patchedLoad(request, parent, isMain) {
  if (request === 'electron') {
    return {
      app: {
        getPath,
        isPackaged: false,
      },
    };
  }

  return originalLoad.call(this, request, parent, isMain);
};
