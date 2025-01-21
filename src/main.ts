// deno-lint-ignore-file no-explicit-any no-empty
import { parseArgs } from '@std/cli/parse-args';
import { parse as yamlParse } from "@std/yaml";
import { readConfig, writeConfig } from './config.ts';
import { spellCheck } from './spell-check.ts';
import { Vocabulary, delimiter } from "./vocabulary.ts";
import type { Tag } from "./tag.ts";

async function run() {
    // get command line args and read config file
    const args = parseArgs(Deno.args, {
        boolean: ['step-out', 'spell-check', 'read-init'],
        string: ['config', 'init', 'output', 'revision'],
        alias: { config: 'c', init: 'i', output: 'o', 'read-init': 'r', 'step-out': 'p', 'spell-check': 's' },
        default: {config: 'config.yaml', init: 'vocabulary.txt', output: 'vocabulary.txt', revision: 'revision.yaml' }
    });
    const configs = await readConfig(args.config);
    const revision = yamlParse(await Deno.readTextFile(args.revision)) as Record<string, Array<string>>;
    // read init data
    const vocabulary = new Vocabulary();
    if (args["read-init"]) try {
        console.log('reading init...');
        for (const line of (await Deno.readTextFile(args.init)).split('\n')) vocabulary.addItem(line);
    } catch {}
    // start run tasks
    const tasks = args._ as Array<string>;
    for (const conf of configs) {
        if (tasks.length && !tasks.includes(conf.name)) continue;
        console.log(`Dealing ${conf.name}...`);
        // read file and process
        let text: string;
        if (conf.path.startsWith('http')) {
            const resp = await fetch(conf.path, { cache: 'force-cache' });
            if (!resp.ok) throw new Error(`Network Error: Can not access ${conf.path}`);
            text = await resp.text();
        } else text = await Deno.readTextFile(conf.path);
        const miss: Record<string, Array<string>> = {};
        let words: () => Generator<Array<string>, void, unknown>;
        if (!conf.wordPath) {
            if (conf.process) for (const [index, [[pattern, flags], replacement = '']] of conf.process.entries()) {
                text = text.replace(new RegExp(pattern, flags), replacement);
                if (args["step-out"]) await Deno.writeTextFile(conf.path.replace(/.*?([^/]*)$/, `debug_$1-${index}.txt`), text);
            }
            if (conf.test && new RegExp(conf.test).test(text)) {
                console.log(`There is still some special char in ${conf.path}.`);
                Deno.exit(-1);
            }
            words = function*() {
                for (let line of text.split('\n')) {
                    if (!(line = line.trim())) continue;
                    yield conf.tag ? [line, conf.tag] : line.split(delimiter).map(w => w.trim());
                }
            }
        } else {
            words = function*() {
                for (let line of text.split('\n')) {
                    if (!(line = line.trim())) continue;
                    const root = JSON.parse(line);
                    let word = root;
                    for (const item of conf.wordPath!) word = word[item];
                    let tag: any = conf.tag;
                    if (conf.tagPath) (tag = root) && conf.tagPath.forEach(item => tag = tag[item]);
                    yield [word, tag];
                }
            }
        }
        const revisionAndAddWord = async (w: string, tags: Array<Tag>) => {
            const ws = revision[w]
            if (!ws) {
                let reps;
                if (args['spell-check'] && !vocabulary.has(w) && (reps = await spellCheck(w)))
                    miss[w] = reps!;
                else vocabulary.addWord(w, tags);
            } else for (const x of ws) await revisionAndAddWord(x, tags);
        }
        for (const [word, ...tags] of words())
            if (word) for (const replace of conf.replace?.[word] || [word])
                if (replace) await revisionAndAddWord(replace, tags as Array<Tag>);
        if (Object.keys(miss).length) conf.miss = miss;
    }
    // write to file
    const encoder = new TextEncoder();
    const file = await Deno.open(args.output, { write: true, create: true, truncate: true });
    // (a, b) => a.localeCompare(b, undefined, {sensitivity: 'base'})
    for (const line of vocabulary.toArray().sort())
        await file.write(encoder.encode(`${line}\n`));
    file.close();
    // write config
    for (const input of configs) if (input.miss) {
        await writeConfig(args.config, configs);
        break;
    }
}

if (import.meta.main) await run();