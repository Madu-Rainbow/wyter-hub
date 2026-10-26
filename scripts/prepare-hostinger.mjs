import { cp, mkdir, rm } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const standalone = path.join(root, ".next", "standalone");
const output = path.join(root, "hostinger");

await rm(output, { recursive: true, force: true });
await mkdir(output, { recursive: true });
await cp(standalone, output, { recursive: true });

const publicDir = path.join(root, "public");
const standalonePublic = path.join(output, "public");
await cp(publicDir, standalonePublic, { recursive: true });

const staticDir = path.join(root, ".next", "static");
const standaloneStatic = path.join(output, ".next", "static");
await mkdir(path.dirname(standaloneStatic), { recursive: true });
await cp(staticDir, standaloneStatic, { recursive: true });

console.log(`Pacote Hostinger criado em ${path.relative(root, output)}/`);
console.log("Arquivo de inicialização: server.js");
