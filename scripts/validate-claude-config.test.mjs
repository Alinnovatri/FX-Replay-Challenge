// Run with: node --test scripts/validate-claude-config.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cpSync, mkdtempSync, rmSync, writeFileSync, appendFileSync, unlinkSync, symlinkSync } from 'node:fs';
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

test('env-guard blocks .env files and allows .env.example', () => {
  const blocked = [
    { tool_name: 'Read', tool_input: { file_path: '/repo/.env.local' } },
    { tool_name: 'Bash', tool_input: { command: 'cat .env' } },
    { tool_name: 'Bash', tool_input: { command: 'grep KEY .env.production' } },
    { tool_name: 'Grep', tool_input: { pattern: 'KEY', path: '.env.local' } },
  ];
  const allowed = [
    { tool_name: 'Read', tool_input: { file_path: '/repo/.env.example' } },
    { tool_name: 'Read', tool_input: { file_path: '/repo/src/environment.ts' } },
    { tool_name: 'Bash', tool_input: { command: 'git status' } },
  ];
  for (const event of blocked) assert.ok(blockedReason(event), JSON.stringify(event));
  for (const event of allowed) assert.equal(blockedReason(event), null, JSON.stringify(event));
});
