import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

// Nx sets this for the pre-version check only when --dry-run was passed.
delete process.env.NX_DRY_RUN;

const nx = fileURLToPath(import.meta.resolve('nx/bin/nx.js'));
const { error, status } = spawnSync(
  process.execPath,
  [nx, 'release', '--skip-publish', ...process.argv.slice(2)],
  { stdio: 'inherit' },
);
if (error) throw error;
process.exitCode = status ?? 1;
