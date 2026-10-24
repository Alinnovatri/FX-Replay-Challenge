#!/usr/bin/env node
// PreToolUse hook: a best-effort guard against tool calls that name a .env file other than .env.example.
// Exit code 2 blocks the call and shows the message to Claude. Any internal error also exits 2 (fails closed).
//
// It matches text, so it cannot be complete: a recursive read (`grep -r KEY .`), a shell variable or a command
// substitution can still reach a secret file. The real controls are that .env files are gitignored and that the
// session never holds production secrets (ADR-007). This hook catches the direct and accidental cases:
//   - every path-like field (file paths, globs, shell commands, URLs) is URL-decoded, stripped of quotes,
//     ANSI-C quote markers ($'...') and backslashes, brace-expanded ({a,b}), and split into segments;
//   - a segment starting with ".env" is blocked unless it is exactly ".env.example";
//   - a glob segment (*, ?, [...]) is blocked when it matches a known secret name; a leading "*" is ignored
//     because shell and glob matching don't expand it to dotfiles; a glob that can't be compiled is blocked.
// Accepted false positives: shell text that mentions ".env" (for example a commit message), and regex text such
// as `sed 's/.*//'`, because ".*" is also a shell glob that expands to dotfiles.
import { readFileSync, realpathSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const FIELDS = ['file_path', 'path', 'pattern', 'glob', 'command', 'notebook_path', 'url'];
const SEPARATORS = /[\s`<>()=:;,&|{}/]+/;
const SECRET_NAMES = [
  '.env',
  '.envrc',
  '.env-local',
  '.env.local',
  '.env.production',
  '.env.development',
  '.env.test',
  '.env.staging',
  '.env.production.local',
  '.env.development.local',
  '.env.test.local',
];
const MAX_EXPANSIONS = 256;

/** Expands simple shell brace alternatives: ".e{n,}v" -> [".env", ".ev"]. */
export function expandBraces(token) {
  const results = [];
  const queue = [token];
  while (queue.length) {
    const current = queue.shift();
    const match = current.match(/\{([^{}]*,[^{}]*)\}/);
    if (!match) {
      results.push(current);
      continue;
    }
    for (const option of match[1].split(',')) {
      queue.push(current.slice(0, match.index) + option + current.slice(match.index + match[0].length));
    }
    if (queue.length + results.length > MAX_EXPANSIONS) throw new Error('brace expansion too large');
  }
  return results;
}

function globToRegExp(glob) {
  let source = '';
  for (let i = 0; i < glob.length; i += 1) {
    const char = glob[i];
    if (char === '*') source += '[^/]*';
    else if (char === '?') source += '[^/]';
    else if (char === '[') {
      const end = glob.indexOf(']', i + 1);
      if (end === -1) source += '\\[';
      else {
        source += `[${glob.slice(i + 1, end).replace(/^!/, '^')}]`;
        i = end;
      }
    } else source += char.replace(/[.+^${}()|\\]/g, '\\$&');
  }
  return new RegExp(`^${source}$`, 'i'); // throws on an invalid class; the caller treats that as a hit
}

function isSecretSegment(segment) {
  if (!segment || segment === '.env.example') return false;
  if (/^\.env/i.test(segment)) return true;
  if (!/[*?[]/.test(segment) || segment.startsWith('*')) return false;
  try {
    const pattern = globToRegExp(segment);
    return SECRET_NAMES.some((name) => pattern.test(name));
  } catch {
    return true;
  }
}

export function envSegments(value) {
  const cleaned = value.replace(/\$(?=['"])/g, '').replace(/['"\\]/g, '');
  const expanded = cleaned.split(/\s+/).flatMap(expandBraces).join(' ');
  return expanded.split(SEPARATORS).filter(isSecretSegment);
}

export function blockedReason(event) {
  const input = event?.tool_input ?? {};
  for (const field of FIELDS) {
    // Grep's pattern is a regex over file contents, not a path; its path and glob fields are still checked.
    if (field === 'pattern' && event?.tool_name === 'Grep') continue;
    let value = input[field];
    if (typeof value !== 'string') continue;
    if (field === 'url') {
      try {
        value = decodeURIComponent(value);
      } catch {
        return `env-guard: ${event.tool_name} url could not be decoded; blocked.`;
      }
    }
    const hits = envSegments(value);
    if (hits.length) {
      return `env-guard: ${event.tool_name} ${field} touches ${hits.join(', ')} (only .env.example is allowed). Secrets stay out of the session.`;
    }
  }
  return null;
}

function main() {
  let reason;
  try {
    reason = blockedReason(JSON.parse(readFileSync(0, 'utf8')));
  } catch (error) {
    console.error(`env-guard: blocked because the check itself failed (${error.message})`);
    process.exit(2);
  }
  if (reason) {
    console.error(reason);
    process.exit(2);
  }
}

// Compare real paths so a symlinked project dir or a path with spaces still runs the guard.
if (process.argv[1] && realpathSync(process.argv[1]) === fileURLToPath(import.meta.url)) main();
