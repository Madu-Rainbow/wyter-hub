#!/usr/bin/env node

/**
 * Automação de commit: verifica mudanças, roda lint/typecheck, commita e push.
 * Uso: node scripts/git-auto.mjs "<tipo>(<escopo>): <resumo>" T0xx
 */

import { execSync } from "node:child_process";
import { existsSync } from "node:fs";

const [, , message, taskRef] = process.argv;

if (!message) {
  console.error("Uso: node scripts/git-auto.mjs \"<mensagem>\" [T0xx]");
  process.exit(1);
}

function run(cmd, opts = {}) {
  try {
    return execSync(cmd, { encoding: "utf8", stdio: "pipe", ...opts }).trim();
  } catch (e) {
    if (opts.allowFail) return "";
    console.error(`Falha: ${cmd}\n${e.stderr || e.message}`);
    process.exit(1);
  }
}

const status = run("git status --porcelain");
if (!status) {
  console.log("Nenhuma mudança para commitar.");
  process.exit(0);
}

console.log("Rodando lint...");
run("pnpm biome check --write .", { allowFail: true });

if (existsSync("tsconfig.json")) {
  console.log("Rodando typecheck...");
  run("pnpm tsc --noEmit", { allowFail: true });
}

run("git add -A");

let fullMessage = message;
if (taskRef) {
  fullMessage += `\n\nRefs: ${taskRef}`;
}
fullMessage += "\n\nCo-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>";

run(`git commit -m ${JSON.stringify(fullMessage)}`);
console.log("Commit criado.");

const branch = run("git branch --show-current");
const hasRemote = run("git remote", { allowFail: true });

if (hasRemote && branch !== "main") {
  console.log(`Pushing ${branch}...`);
  run(`git push -u origin ${branch}`, { allowFail: true });
}
