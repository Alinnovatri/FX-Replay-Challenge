#!/usr/bin/env node
// PreToolUse hook: a best-effort guard against tool calls that name a .env file other than .env.example.
// Exit code 2 blocks the call and shows the message to Claude.
//
// It matches text, so it cannot be complete: a recursive read (`grep -r KEY .`), a shell variable or a command
// substitution can still reach a secret file. The real controls are that .env files are gitignored and that the
// session never holds production secrets (ADR-007). This hook catches the direct and accidental cases:
//   - every path-like field (file paths, globs, shell commands, URLs) is decoded, stripped of quotes and
//     backslashes, and split into segments;
//   - a segment starting with ".env" is blocked unless it is exactly ".env.example";
//   - a glob segment (*, ?, [...]) is blocked when it could match a .env file; a leading "*" is ignored because
//     shell and glob matching don't expand it to dotfiles.
// Known false positive, accepted: shell text that merely mentions ".env", such as a commit message.
import { readFileSync, realpathSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const FIELDS = ['file_path', 'path', 'pattern', 'glob', 'command', 'notebook_path', 'url'];
const SEPARATORS = /[\s`<>()=:;,&|{}/]+/;
const SECRET_NAMES = ['.env', '.env.local', '.envrc', '.env.production', '.env.development', '.env-local'];

function globToRegExp(glob) {
  let source = '';
  for (let i = 0; i < glob.length; i += 1) {
    const char = glob[i];
    if (char === '*') source += '[^/]*';
    else if (char === '?') source += '[^/]';
    else if (char === '[') {
      const end = glob.indexOf(']', i + 1);
      if (end === -1) source += '\\[';
      else { source += `[${glob.slice(i + 1, end).replace(/^!/, '^')}]`; i = end; }
    } else source += char.replace(/[.+^${}()|\\]/g, '\\$&');
  }
  return new RegExp(`^${source}$`, 'i');
}

export function envSegments(value) {
  const cleaned = value.replace(/['"\\]/g, '');
  return cleaned.split(SEPARATORS).filter((segment) => {
    if (!segment || segment === '.env.example') return false;
    if (/^\.env/i.test(segment)) return true;
    if (!/[*?[]/.test(segment) || segment.startsWith('*')) return false;
    const pattern = globToRegExp(segment);
    return SECRET_NAMES.some((name) => pattern.test(name));
  });
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
  let event;
  try {
    event = JSON.parse(readFileSync(0, 'utf8'));
  } catch (error) {
    console.error(`env-guard: could not parse hook input (${error.message})`);
    process.exit(2);
  }
  const reason = blockedReason(event);
  if (reason) {
    console.error(reason);
    process.exit(2);
  }
}

// Compare real paths so a symlinked project dir or a path with spaces still runs the guard.
if (process.argv[1] && realpathSync(process.argv[1]) === fileURLToPath(import.meta.url)) main();
