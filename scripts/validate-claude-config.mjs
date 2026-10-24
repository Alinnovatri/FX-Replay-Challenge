#!/usr/bin/env node
// Validates the committed Claude Code system: CLAUDE.md, agents, skills, settings, hooks and MCP config.
//
//   node scripts/validate-claude-config.mjs        exit 1 and list every problem found
//
// Each check returns a list of problems; nothing is skipped silently.

import { readFileSync, readdirSync, existsSync, lstatSync, realpathSync, statSync } from 'node:fs';
import { dirname, join, basename, extname } from 'node:path';
import { fileURLToPath } from 'node:url';

const REQUIRED_AGENTS = [
  'code-reviewer',
  'security-reviewer',
  'qa-a11y-tester',
  'analytics-auditor',
  'perf-seo-auditor',
  'brand-copy-reviewer',
];
const REQUIRED_SKILLS = ['add-tracked-event', 'add-migration', 'stage-checkpoint', 'pre-submit-audit'];
const REQUIRED_DENY = [
  'Bash(gh pr merge:*)',
  'Bash(vercel env:*)',
  'Bash(vercel promote:*)',
  'Bash(vercel rollback:*)',
];
const PAID_API = /\b(OPENAI|ANTHROPIC|GEMINI|SERPAPI|SEMRUSH|AHREFS|DATAFORSEO|APOLLO|CLEARBIT|HUNTER)_API_KEY\b/;
const EXECUTABLE = new Set(['.sh', '.py', '.js', '.mjs', '.ts', '.rb']);
const EDIT_TOOLS = new Set(['Edit', 'Write', 'MultiEdit', 'NotebookEdit']);

/** Parses a minimal YAML frontmatter block of `key: value` lines. */
export function frontmatter(text) {
  const match = text.match(/^---\n([\s\S]*?)\n---\n/);
  if (!match) return null;
  const fields = {};
  for (const line of match[1].split('\n')) {
    const kv = line.match(/^([a-z_-]+):\s*(.*)$/i);
    if (kv) fields[kv[1]] = kv[2].replace(/^"|"$/g, '');
  }
  return fields;
}

const walk = (dir) =>
  readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    return entry.isDirectory() ? walk(path) : [path];
  });

export function checkAgents(root) {
  const dir = join(root, '.claude', 'agents');
  if (!existsSync(dir)) return ['.claude/agents/ is missing'];
  const problems = [];
  const names = readdirSync(dir)
    .filter((f) => f.endsWith('.md'))
    .map((f) => basename(f, '.md'));
  for (const name of REQUIRED_AGENTS) if (!names.includes(name)) problems.push(`agent "${name}" is missing`);
  for (const name of names) {
    const text = readFileSync(join(dir, `${name}.md`), 'utf8');
    const fm = frontmatter(text);
    if (!fm) {
      problems.push(`agent "${name}": no frontmatter`);
      continue;
    }
    if (fm.name !== name) problems.push(`agent "${name}": frontmatter name "${fm.name}" does not match the file name`);
    if (!fm.description) problems.push(`agent "${name}": description is empty`);
    if (!fm.tools) problems.push(`agent "${name}": tools must be listed explicitly (least privilege)`);
    const tools = (fm.tools ?? '').split(',').map((tool) => tool.trim());
    if (tools.some((tool) => EDIT_TOOLS.has(tool)))
      problems.push(`agent "${name}": reviewers must not have edit tools`);
    if (!text.includes('Verdict: PASS | FAIL')) problems.push(`agent "${name}": missing the fixed output format`);
  }
  return problems;
}

export function checkSkills(root) {
  const dir = join(root, '.claude', 'skills');
  if (!existsSync(dir)) return ['.claude/skills/ is missing'];
  const problems = [];
  const names = readdirSync(dir, { withFileTypes: true })
    .filter((e) => e.isDirectory())
    .map((e) => e.name);
  for (const name of REQUIRED_SKILLS) if (!names.includes(name)) problems.push(`skill "${name}" is missing`);
  for (const name of names) {
    const skillDir = join(dir, name);
    const skillFile = join(skillDir, 'SKILL.md');
    if (!existsSync(skillFile)) {
      problems.push(`skill "${name}": SKILL.md is missing`);
      continue;
    }
    const fm = frontmatter(readFileSync(skillFile, 'utf8'));
    if (!fm) {
      problems.push(`skill "${name}": no frontmatter`);
      continue;
    }
    if (fm.name !== name) problems.push(`skill "${name}": frontmatter name "${fm.name}" does not match the folder`);
    if (!fm.description) problems.push(`skill "${name}": description is empty`);

    // Every skill that is not a required project skill is vendored and must say where it came from.
    if (REQUIRED_SKILLS.includes(name)) continue;
    const source = join(skillDir, 'SOURCE.md');
    if (!existsSync(source)) {
      problems.push(`vendored skill "${name}": SOURCE.md is missing`);
      continue;
    }
    const sourceText = readFileSync(source, 'utf8');
    if (!/Commit: [0-9a-f]{40}\b/.test(sourceText))
      problems.push(`vendored skill "${name}": SOURCE.md must pin a full 40-character commit`);
    if (!existsSync(join(skillDir, 'LICENSE'))) problems.push(`vendored skill "${name}": LICENSE is missing`);
    for (const file of walk(skillDir)) {
      const rel = file.slice(root.length + 1);
      if (EXECUTABLE.has(extname(file)))
        problems.push(`vendored skill "${name}": bundled executable ${rel} must be removed`);
      else if (PAID_API.test(readFileSync(file, 'utf8')))
        problems.push(`vendored skill "${name}": ${rel} references a paid API key`);
    }
  }
  return problems;
}

export function checkSettings(root) {
  const problems = [];
  const path = join(root, '.claude', 'settings.json');
  let settings;
  try {
    settings = JSON.parse(readFileSync(path, 'utf8'));
  } catch (error) {
    return [`.claude/settings.json: ${error.message}`];
  }
  const deny = settings.permissions?.deny ?? [];
  for (const rule of REQUIRED_DENY) if (!deny.includes(rule)) problems.push(`settings: deny rule "${rule}" is missing`);
  const allow = settings.permissions?.allow ?? [];
  for (const rule of allow) if (deny.includes(rule)) problems.push(`settings: "${rule}" is both allowed and denied`);
  for (const rule of allow.filter((r) => r.startsWith('mcp__'))) {
    const rest = rule.slice('mcp__'.length);
    if (!rest.includes('__') || rule.includes('*'))
      problems.push(`settings: "${rule}" allows more than one MCP tool; allow tools by exact name`);
  }

  for (const [event, groups] of Object.entries(settings.hooks ?? {})) {
    for (const group of groups) {
      for (const hook of group.hooks ?? []) {
        const script = hook.command?.match(/\$CLAUDE_PROJECT_DIR\/?([^"\s]+)/)?.[1];
        if (!script)
          problems.push(
            `settings: ${event} hook "${hook.command}" does not reference a script under $CLAUDE_PROJECT_DIR`,
          );
        else if (!existsSync(join(root, script)))
          problems.push(`settings: ${event} hook script ${script} does not exist`);
      }
    }
  }

  const mcpPath = join(root, '.mcp.json');
  const servers = existsSync(mcpPath) ? (JSON.parse(readFileSync(mcpPath, 'utf8')).mcpServers ?? {}) : {};
  for (const name of settings.enabledMcpjsonServers ?? [])
    if (!servers[name]) problems.push(`settings: enabled MCP server "${name}" is not in .mcp.json`);
  for (const [name, server] of Object.entries(servers)) {
    const pkg = (server.args ?? []).find((arg) => arg.startsWith('@') || /^[a-z][\w.-]*@/.test(arg));
    if (server.command === 'npx' && !/@\d+\.\d+\.\d+$/.test(pkg ?? ''))
      problems.push(`.mcp.json: server "${name}" must pin an exact package version`);
  }
  return problems;
}

export function checkInstructions(root) {
  const problems = [];
  const path = join(root, 'CLAUDE.md');
  if (!existsSync(path)) return ['CLAUDE.md is missing'];
  const text = readFileSync(path, 'utf8');
  if (!text.includes('.claude/agents/')) problems.push('CLAUDE.md must state that reviews use .claude/agents/');
  if (!text.includes('/code-review') || !text.includes('/security-review'))
    problems.push('CLAUDE.md must name the built-in review skills it replaces');

  const link = join(root, '.agents', 'product-marketing.md');
  if (!existsSync(link) && !lstatExists(link))
    problems.push('.agents/product-marketing.md is missing (symlink to docs/PRODUCT_CONTEXT.md)');
  else if (!lstatSync(link).isSymbolicLink())
    problems.push('.agents/product-marketing.md must be a symlink, not a copy');
  else if (!existsSync(link) || realpathSync(link) !== realpathSync(join(root, 'docs', 'PRODUCT_CONTEXT.md'))) {
    problems.push('.agents/product-marketing.md must resolve to docs/PRODUCT_CONTEXT.md');
  }
  return problems;
}

function lstatExists(path) {
  try {
    lstatSync(path);
    return true;
  } catch {
    return false;
  }
}

export function validate(root) {
  return [...checkInstructions(root), ...checkAgents(root), ...checkSkills(root), ...checkSettings(root)];
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const root = join(dirname(fileURLToPath(import.meta.url)), '..');
  if (!statSync(root).isDirectory()) throw new Error(`root ${root} is not a directory`);
  const problems = validate(root);
  if (problems.length) {
    console.error(`Claude Code config: ${problems.length} problem(s)`);
    for (const problem of problems) console.error(`  - ${problem}`);
    process.exit(1);
  }
  console.log('Claude Code config is valid.');
}
