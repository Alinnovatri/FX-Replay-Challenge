#!/usr/bin/env node
// PreToolUse hook: blocks any tool call that would read, write or print a .env file other than .env.example.
// Exit code 2 blocks the call and shows the message to Claude.
import { readFileSync } from 'node:fs';

const ENV_FILE = /(^|[\s/'"=:(])\.env(?!\.example\b)(\.[\w.-]+)?(?=$|[\s'")|;&>])/;

export function blockedReason(event) {
  const input = event?.tool_input ?? {};
  const candidates = [input.file_path, input.path, input.pattern, input.glob, input.command, input.notebook_path]
    .filter((value) => typeof value === 'string');
  const hit = candidates.find((value) => ENV_FILE.test(value));
  return hit ? `env-guard: ${event.tool_name} touches a .env file (only .env.example is allowed). Secrets stay out of the session.` : null;
}

if (process.argv[1] === new URL(import.meta.url).pathname) {
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
