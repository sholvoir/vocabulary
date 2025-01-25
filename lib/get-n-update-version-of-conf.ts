import { readConfig, writeConfig } from "./config.ts";

if (!Deno.args[0]) Deno.exit(2);
const path = `./conf/${Deno.args[0]}.yaml`;
const conf = await readConfig(path);
const version = conf.version ?? '0.0.1';
console.log(version);
const ver = version.split('.').map(s=>parseInt(s));
ver[2]++;
conf.version= ver.join('.');
await writeConfig(path, conf);