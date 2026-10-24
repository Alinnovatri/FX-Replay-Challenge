// Run with: node --test scripts/validate-claude-config.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cpSync, mkdtempSync, mkdirSync, rmSync, readFileSync, writeFileSync, appendFileSync, unlinkSync, symlinkSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { validate } from './validate-claude-config.mjs';
import { blockedReason } from '../.claude/hooks/env-guard.mjs';

const ROOT = join(fileURLToPath(import.meta.url), '..', '..');

/** Copies the committed config into a temp folder so each test can break one thing. */
function fixture(t) {
  const dir = mkdtempSync(join(tmpdir(), 'claude-config-'));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  for (const path of ['CLAUDE.md', '.claude', '.mcp.json', 'docs/PRODUCT_CONTEXT.md']) {
    cpSync(join(ROOT, path), join(dir, path), { recursive: true });
  }
  cpSync(join(ROOT, '.agents'), join(dir, '.agents'), { recursive: true, verbatimSymlinks: true });
  return dir;
}

test('the committed config is valid', () => {
  assert.deepEqual(validate(ROOT), []);
});

test('a missing agent is reported', (t) => {
  const dir = fixture(t);
  unlinkSync(join(dir, '.claude/agents/security-reviewer.md'));
  assert.ok(validate(dir).some((p) => p.includes('"security-reviewer" is missing')));
});

test('an agent with edit tools is reported', (t) => {
  const dir = fixture(t);
  const file = join(dir, '.claude/agents/code-reviewer.md');
  writeFileSync(file, '---\nname: code-reviewer\ndescription: x\ntools: Read, Edit\n---\nVerdict: PASS | FAIL\n');
  assert.ok(validate(dir).some((p) => p.includes('must not have edit tools')));
});

test('a vendored skill without a pinned commit or with a script is reported', (t) => {
  const dir = fixture(t);
  writeFileSync(join(dir, '.claude/skills/cro/SOURCE.md'), 'Commit: main\n');
  writeFileSync(join(dir, '.claude/skills/cro/run.sh'), 'echo hi\n');
  const problems = validate(dir);
  assert.ok(problems.some((p) => p.includes('pin a full 40-character commit')));
  assert.ok(problems.some((p) => p.includes('bundled executable')));
});

test('a paid API key reference in a vendored skill is reported', (t) => {
  const dir = fixture(t);
  appendFileSync(join(dir, '.claude/skills/signup/SKILL.md'), '\nSet OPENAI_API_KEY first.\n');
  assert.ok(validate(dir).some((p) => p.includes('paid API key')));
});

test('a removed deny rule and a missing hook script are reported', (t) => {
  const dir = fixture(t);
  const settings = {
    permissions: { allow: [], deny: [] },
    hooks: { PreToolUse: [{ matcher: 'Read', hooks: [{ type: 'command', command: 'node "$CLAUDE_PROJECT_DIR/.claude/hooks/missing.mjs"' }] }] },
  };
  writeFileSync(join(dir, '.claude/settings.json'), JSON.stringify(settings));
  const problems = validate(dir);
  assert.ok(problems.some((p) => p.includes('deny rule "Bash(gh pr merge:*)" is missing')));
  assert.ok(problems.some((p) => p.includes('missing.mjs does not exist')));
});

test('an unpinned MCP package is reported', (t) => {
  const dir = fixture(t);
  writeFileSync(join(dir, '.mcp.json'), JSON.stringify({ mcpServers: { playwright: { command: 'npx', args: ['-y', '@playwright/mcp@latest'] } } }));
  assert.ok(validate(dir).some((p) => p.includes('must pin an exact package version')));
});

test('a copied product context instead of a symlink is reported', (t) => {
  const dir = fixture(t);
  unlinkSync(join(dir, '.agents/product-marketing.md'));
  writeFileSync(join(dir, '.agents/product-marketing.md'), 'copy\n');
  assert.ok(validate(dir).some((p) => p.includes('must be a symlink')));
  unlinkSync(join(dir, '.agents/product-marketing.md'));
  symlinkSync('../CLAUDE.md', join(dir, '.agents/product-marketing.md'));
  assert.ok(validate(dir).some((p) => p.includes('must resolve to docs/PRODUCT_CONTEXT.md')));
});

test('a vendored skill that loses SOURCE.md is reported', (t) => {
  const dir = fixture(t);
  unlinkSync(join(dir, '.claude/skills/cro/SOURCE.md'));
  assert.ok(validate(dir).some((p) => p.includes('"cro": SOURCE.md is missing')));
});

test('NotebookEdit on a reviewer and a server-wide MCP allow are reported', (t) => {
  const dir = fixture(t);
  writeFileSync(join(dir, '.claude/agents/code-reviewer.md'), '---\nname: code-reviewer\ndescription: x\ntools: Read, NotebookEdit\n---\nVerdict: PASS | FAIL\n');
  const settings = JSON.parse(readFileSync(join(dir, '.claude/settings.json'), 'utf8'));
  settings.permissions.allow.push('mcp__my_server', 'mcp__playwright__browser_*');
  writeFileSync(join(dir, '.claude/settings.json'), JSON.stringify(settings));
  const problems = validate(dir);
  assert.ok(problems.some((p) => p.includes('must not have edit tools')));
  assert.ok(problems.some((p) => p.includes('"mcp__my_server" allows more than one MCP tool')));
  assert.ok(problems.some((p) => p.includes('"mcp__playwright__browser_*" allows more than one MCP tool')));
});

// Built at runtime so this file's own text never names a secret file literally.
const E = '.' + 'env';

test('env-guard blocks .env files and allows .env.example', () => {
  const blocked = [
    { tool_name: 'Read', tool_input: { file_path: `/repo/${E}.local` } },
    { tool_name: 'Read', tool_input: { file_path: `/repo/${E}rc` } },
    { tool_name: 'Read', tool_input: { file_path: `/repo/${E}-local` } },
    { tool_name: 'Read', tool_input: { file_path: `/repo/${E}.example.bak` } },
    { tool_name: 'Bash', tool_input: { command: `cat ${E}` } },
    { tool_name: 'Bash', tool_input: { command: `cat ${E}*` } },
    { tool_name: 'Bash', tool_input: { command: `cat <${E}` } },
    { tool_name: 'Bash', tool_input: { command: `echo \`cat ${E}\`` } },
    { tool_name: 'Bash', tool_input: { command: `cat ${E},x` } },
    { tool_name: 'Bash', tool_input: { command: `cat ${E}.example.local` } },
    { tool_name: 'Bash', tool_input: { command: `grep KEY ${E}.production` } },
    { tool_name: 'Grep', tool_input: { pattern: 'KEY', path: `${E}.local` } },
    { tool_name: 'Grep', tool_input: { pattern: 'KEY', glob: `${E}*` } },
    { tool_name: 'Glob', tool_input: { pattern: `**/${E}*` } },
    { tool_name: 'mcp__playwright__browser_navigate', tool_input: { url: `file:///repo/${E}.local` } },
    { tool_name: 'mcp__playwright__browser_navigate', tool_input: { url: 'file:///repo/%2Eenv.local' } },
    { tool_name: 'mcp__playwright__browser_navigate', tool_input: { url: 'file:///repo/%E0%A4%A' } },
    { tool_name: 'Bash', tool_input: { command: 'cat .*' } },
    { tool_name: 'Bash', tool_input: { command: 'cat .e*' } },
    { tool_name: 'Bash', tool_input: { command: 'cat .[e]nv' } },
    { tool_name: 'Bash', tool_input: { command: 'cat ?env' } },
    { tool_name: 'Bash', tool_input: { command: "cat .e''nv" } },
    { tool_name: 'Bash', tool_input: { command: 'cat .e\\nv' } },
    { tool_name: 'Glob', tool_input: { pattern: '.e*' } },
    { tool_name: 'Grep', tool_input: { pattern: 'KEY', glob: '.*' } },
  ];
  const allowed = [
    { tool_name: 'Read', tool_input: { file_path: `/repo/${E}.example` } },
    { tool_name: 'Bash', tool_input: { command: `cp ${E}.example /tmp/x` } },
    { tool_name: 'Bash', tool_input: { command: 'ls *' } },
    { tool_name: 'Glob', tool_input: { pattern: '**/*.ts' } },
    { tool_name: 'Grep', tool_input: { pattern: `\\${E}` } },
    { tool_name: 'Read', tool_input: { file_path: '/repo/.gitignore' } },
    { tool_name: 'Read', tool_input: { file_path: '/repo/src/environment.ts' } },
    { tool_name: 'Bash', tool_input: { command: 'git status' } },
  ];
  for (const event of blocked) assert.ok(blockedReason(event), JSON.stringify(event));
  for (const event of allowed) assert.equal(blockedReason(event), null, JSON.stringify(event));
});

test('env-guard exits 2 as a process, also through a symlinked dir and a path with a space', (t) => {
  const dir = mkdtempSync(join(tmpdir(), 'env guard '));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  mkdirSync(join(dir, 'real'));
  cpSync(join(ROOT, '.claude/hooks/env-guard.mjs'), join(dir, 'real/env-guard.mjs'));
  symlinkSync(join(dir, 'real'), join(dir, 'linked'));
  const event = JSON.stringify({ tool_name: 'Read', tool_input: { file_path: `/repo/${E}.local` } });
  const allowed = JSON.stringify({ tool_name: 'Read', tool_input: { file_path: '/repo/README.md' } });
  for (const hook of [join(ROOT, '.claude/hooks/env-guard.mjs'), join(dir, 'real/env-guard.mjs'), join(dir, 'linked/env-guard.mjs')]) {
    assert.equal(spawnSync(process.execPath, [hook], { input: event }).status, 2, hook);
    assert.equal(spawnSync(process.execPath, [hook], { input: allowed }).status, 0, hook);
  }
  assert.equal(spawnSync(process.execPath, [join(ROOT, '.claude/hooks/env-guard.mjs')], { input: 'not json' }).status, 2);
});
