import { execFileSync, spawnSync } from 'node:child_process';

if (process.env.NX_DRY_RUN === 'true') {
  process.exit(0);
}

const branch = execFileSync('git', ['branch', '--show-current'], { encoding: 'utf8' }).trim();
if (branch !== 'main') {
  console.error('请在 main 分支执行正式发布。');
  process.exit(1);
}

const status = execFileSync('git', ['status', '--porcelain=v1', '--untracked-files=normal'], {
  encoding: 'utf8',
});
if (status) {
  console.error('正式发布要求工作区和暂存区干净，请先处理以下改动：');
  console.error(status.trimEnd());
  process.exit(1);
}

const checks = spawnSync('pnpm format:check && pnpm lint && pnpm test && pnpm build', {
  shell: true,
  stdio: 'inherit',
});
if (checks.error) throw checks.error;
process.exitCode = checks.status ?? 1;
