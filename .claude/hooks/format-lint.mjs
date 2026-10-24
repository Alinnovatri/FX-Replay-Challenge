#!/usr/bin/env node
// PostToolUse hook for Edit and Write: formats and lints the edited file.
// Written in Stage 1, registered in .claude/settings.json in Stage 2 once the tooling exists.
// Fails loudly (exit 2) when the tooling is missing instead of skipping silently.
import { readFileSync, existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { join, extname } from 'node:path';

const root = process.env.CLAUDE_PROJECT_DIR ?? process.cwd();
const event = JSON.parse(readFileSync(0, 'utf8'));
const file = event?.tool_input?.file_path;
if (!file || !existsSync(file)) process.exit(0);

const pkg = join(root, 'package.json');
if (!existsSync(pkg)) {
  console.error('format-lint: package.json not found; the hook must not be registered before Stage 2.');
  process.exit(2);
}

const run = (args) => execFileSync('corepack', ['pnpm', 'exec', ...args], { cwd: root, stdio: 'pipe' });
try {
  if (['.ts', '.tsx', '.js', '.mjs', '.json', '.css', '.md'].includes(extname(file)))
    run(['prettier', '--write', file]);
  if (['.ts', '.tsx', '.js', '.mjs'].includes(extname(file))) run(['eslint', '--max-warnings=0', file]);
  if (extname(file) === '.md') run(['markdownlint-cli2', file]);
} catch (error) {
  console.error(`format-lint: ${file}\n${error.stdout?.toString() ?? ''}${error.stderr?.toString() ?? error.message}`);
  process.exit(2);
}
