// deno-lint-ignore-file no-explicit-any
const path = `${import.meta.dirname}/deno.json`;
const json: any = JSON.parse(await Deno.readTextFile(path));
const version = (json.version as string).split('.').map(s=>parseInt(s));
version[2]++;
json.version = version.join('.');
console.log(json.version);
await Deno.writeTextFile(path, JSON.stringify(json, undefined, 4));
