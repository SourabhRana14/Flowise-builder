const { spawn } = require('child_process');
const path = require('path');

const ng = path.join(__dirname, '..', 'node_modules', '@angular', 'cli', 'bin', 'ng.js');
const args = [
  ng,
  'serve',
  'agentchain-ui-full',
  '--host=0.0.0.0',
  '--port=4200',
  '--poll=2000',
  '--force-esbuild'
];

const child = spawn(process.execPath, args, {
  cwd: path.join(__dirname, '..'),
  stdio: 'inherit',
  shell: false
});

child.on('exit', code => process.exit(code ?? 0));
