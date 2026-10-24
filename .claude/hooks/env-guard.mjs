#!/usr/bin/env node
// PreToolUse hook: blocks any tool call that would read, write or print a .env file other than .env.example.
// Exit code 2 blocks the call and shows the message to Claude.
//
// Every string field that can carry a path (file paths, globs, shell commands, URLs) is split into tokens and
// path segments. Any segment that starts with ".env" is blocked unless it is exactly ".env.example", so globs
// (.env*), variants (.envrc, .env-local, .env.example.bak) and redirects (<.env) are all caught.
// Known false positive, accepted: text that merely mentions ".env", such as a commit message, is blocked too.
import { readFileSync, realpathSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const FIELDS = ['file_path', 'path', 'pattern', 'glob', 'command', 'notebook_path', 'url'];
const SEPARATORS = /[\s'"`<>()=:;,&|{}[\]\\/]+/;

export function envSegments(value) {
  return value.split(SEPARATORS).filter((segment) => /^\.env/i.test(segment) && segment !== '.env.example');
}

export function blockedReason(event) {
  const input = event?.tool_input ?? {};
  for (const field of FIELDS) {
    const value = input[field];
    if (typeof value !== 'string') continue;
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
