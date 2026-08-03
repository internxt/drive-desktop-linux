const Module = require('node:module');
const os = require('node:os');
const path = require('node:path');

const originalLoad = Module._load;

function getPath(name) {
  if (name === 'home') {
    return os.homedir();
  }

  if (name === 'appData') {
    return path.join(os.homedir(), '.config');
  }

  if (name === 'temp') {
    return process.env.TMPDIR || '/tmp';
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
