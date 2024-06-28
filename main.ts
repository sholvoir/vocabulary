// deno-lint-ignore-file no-explicit-any
import { parseArgs } from '@std/cli/parse-args';
import { readConfig, writeConfig } from './config.ts';
import { spellCheck } from './spell-check.ts';
import { Vocabulary, delimiterItem } from "./vocabulary.ts";
import { type Tag } from "./mod.ts";

async function run() {
    // get command line args and read config file
    const args = parseArgs(Deno.args, {
        boolean: ['step-out', 'spell-check'],
        string: ['config', 'init', 'output', 'revision'],
        alias: { config: 'c', init: 'i', output: 'o', 'step-out': 'p', 'spell-check': 's' },
        default: {config: 'config.yaml', init: 'vocabulary.txt', output: 'vocabulary.txt', revision: 'revision.txt' }
    });
    const configs = await readConfig(args.config);
    const revision = {} as Record<string, string>;
    const delimiter = /: */;
    for (const line of (await Deno.readTextFile(args.revision)).split('\n')) {
        const [word, replace] = line.split(delimiter);
        if (word) revision[word] = replace;
    }
    // read init data
    const vocabulary = new Vocabulary();
    try { for (const line of (await Deno.readTextFile(args.init)).split('\n')) vocabulary.addItem(line); }
    catch (e) { console.log('init data read error', e); }
    // start run tasks
    const tasks = args._ as Array<string>;
    for (const conf of configs) {
        if (tasks.length && !tasks.includes(conf.name)) continue;
        console.log(`Dealing ${conf.name}...`);
        // read file and process
        let text = await Deno.readTextFile(conf.path);
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
                    yield conf.tag ? [line, conf.tag] : line.split(delimiterItem).map(w => w.trim());
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
        for (const [word, ...tags] of words()) {
            // revision
            if (!word) continue
            const ws = conf.replace?.[word] || [word];
            for (let w of ws) {
                if (revision[w]) w = revision[w];
                // spell check
                let replaces;
                if (args['spell-check'] && !vocabulary.has(w) && (replaces = await spellCheck(w)))
                    miss[w] = replaces!;
                else vocabulary.addWord(w, tags as Array<Tag>);
            }
        }
        if (Object.keys(miss).length) conf.miss = miss;
    }
    // write to file
    const encoder = new TextEncoder();
    const file = await Deno.open(args.output, { write: true, create: true, truncate: true });
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