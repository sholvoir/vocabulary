// deno-lint-ignore-file no-cond-assign
import { parseArgs } from '@std/cli/parse-args';
import { parse as yamlParse } from "@std/yaml";
import { readConfig, writeConfig } from './config.ts';
import { spellCheck, spellCheckClose, spellCheckInit } from './spell-check.ts';

const revisionPath = './revision.yaml';
const sortFunc = (a: string, b: string) => a.localeCompare(b, undefined, {sensitivity: 'base'});

async function run() {
    // get command line args and read config file
    const args = parseArgs(Deno.args, { boolean: ['step-out'], alias: {'step-out': 's'} });
    if (!args._.length) return console.log('No Task Assigned!');
    await spellCheckInit();
    const revision = yamlParse(await Deno.readTextFile(revisionPath)) as Record<string, Array<string>>;
    for (const path of args._) {
        const configPath = `./${path}/config.yaml`;
        const config = await readConfig(configPath);
        const miss: Record<string, Array<string>> = {};
        const vocabulary = new Set<string>();
        let text: string;
        if (config.input.startsWith('http')) {
            const resp = await fetch(config.input, { cache: 'force-cache' });
            if (!resp.ok) {
                console.error(`Network Error: Can not access ${config.input}`);
                continue;
            }
            text = await resp.text();
        } else text = await Deno.readTextFile(`./${path}/${config.input}`);
        let words: () => Generator<string, void, unknown>;
        if (!config.wordPath) {
            if (config.process) for (const [index, [[pattern, flags], replacement = '']] of config.process.entries()) {
                text = text.replace(new RegExp(pattern, flags), replacement);
                if (args["step-out"]) await Deno.writeTextFile(config.input.replace(/.*?([^/]*)$/, `debug_$1-${index}.txt`), text);
            }
            if (config.test && new RegExp(config.test).test(text)) {
                console.log(`There is still some special char in ${config.input}.`);
                continue;
            }
            words = function*() {
                for (let line of text.split('\n'))
                    if (line = line.trim()) yield line;
                    else continue;
            }
        } else {
            words = function*() {
                for (let line of text.split('\n')) {
                    if (!(line = line.trim())) continue;
                    let word = JSON.parse(line);
                    for (const item of config.wordPath!) word = word[item];
                    yield word;
                }
            }
        }
        for (const word of words())
            if (word) for (const replace of config.replace?.[word] || [word])
                if (replace) for (const fword of revision[replace] || [replace])
                    if (!vocabulary.has(fword)) {
                        const check = await spellCheck(fword);
                        if (!check) vocabulary.add(fword);
                        else miss[fword] = check;
                    }
        if (Object.keys(miss).length) {
            config.miss = miss;
            await writeConfig(configPath, config);
        }
        await Deno.writeTextFile(config.output, Array.from(vocabulary).sort(sortFunc).join('\n'))
    }
    await spellCheckClose();
}

if (import.meta.main) await run();