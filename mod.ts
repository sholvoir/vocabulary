// deno-lint-ignore-file no-explicit-any no-cond-assign no-empty
import { parse as parseArgs } from 'std/flags/mod.ts';
import { readConfig, writeConfig } from './config.ts';
import { Tags } from './tags.ts';

function sortCaseInsensitive(array: Array<string>) {
    return array.sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase()));
}

export class Vocabulary extends Map<string, Tags> {
    addWord(word: string, tags: Iterable<string>) {
        if (this.has(word)) this.get(word)!.attach(tags);
        else this.set(word, new Tags(tags));
    }
    addItem(item: string) {
        const [word, ...tags] = item.split(/[,:] */).map(w => w.trim());
        if (word) this.addWord(word, tags);
    }
    removeTags(word: string, tags: Iterable<string>) {
        const otags = this.get(word);
        if (otags) otags.remove(tags);
    }
    removeWordsWithoutTags() {
        for (const [word, tags] of this) if (!tags.size)
            this.delete(word) && console.log(`Without Tags remove word "${word}".`);
    }
    toArray() {
        return Array.from(this).map(([word, tags]) => `${word}${tags.size ? `: ${tags.toString()}` : ''}`);
    }
}

async function run() {
    // get command line args and read config file
    const args = parseArgs(Deno.args, {
        boolean: ['step-out', 'no-spell-check'],
        string: ['config', 'init', 'output'],
        alias: { config: 'c', init: 'i', output: 'o', 'step-out': 'p', 'no-spell-check': 's' },
        default: {config: 'config.yaml', init: 'vocabulary.txt', output: 'vocabulary.txt' }
    });
    const config = await readConfig(args.config);
    // ready for spell check functions
    const entitiesRegex = /&(quot|apos|amp|lt|gt|#(x?\d+));/g;
    const entities: { [key: string]: string } = { quot: '"', apos: "'", amp: '&', lt: '<', gt: '>' };
    const decodeEntities = (_: string, p1: string, p2: string) => p2 ? String.fromCharCode(+`0${p2}`) : entities[p1];
    const getSpellCheckFunction = (baseUri: string, regex: RegExp, index = 1) => async (word: string) => {
        try {
            const html = await (await fetch(`${baseUri}${encodeURIComponent(word)}`)).text();
            return Array.from(html.matchAll(regex)).map(match => match[index].trim().replaceAll(entitiesRegex, decodeEntities));
        } catch (e) {
            console.log(e);
            return [];
        }
    };
    const spellCheckFunctions = [
        getSpellCheckFunction('https://www.merriam-webster.com/dictionary/',
            /<h1 class="hword">(?:<span.*?>)?(.+?)(?:<\/span>)?<\/h1>/g),
        getSpellCheckFunction('https://www.collinsdictionary.com/search/?dictCode=english&q=',
            /<h2 class="h2_entry"><span class="orth">(.+?)<\/span>/g),
        getSpellCheckFunction('https://www.dictionary.com/browse/',
            /<h1 data-first-headword="true" class=".+?">(.+?)<\/h1>/g),
        getSpellCheckFunction('https://www.oxfordlearnersdictionaries.com/search/english/?q=',
            /<h1.+?>(.+?)(?:<span.+?>.+?<\/span>)?<\/h1>/g)
    ];
    spellCheckFunctions.length;
    let functionIndex = 0;
    // read init data
    const vocabulary = new Vocabulary();
    try { for (const line of (await Deno.readTextFile(args.init)).split('\n')) vocabulary.addItem(line); } catch { }
    // start run tasks
    const encoder = new TextEncoder();
    const tasks = args._.length ? args._ as Array<string> : Object.keys(config.inputs);
    for (const task of tasks) {
        const conf = config.inputs[task];
        if (!conf) continue;
        console.log(`Dealing ${task}...`);
        // read file and process
        if (conf.revision?._) for (const word of conf.revision._) vocabulary.addWord(word, [conf.tag!])
        let text = await Deno.readTextFile(conf.path);
        const miss: Record<string, Array<string>> = {};
        let words: () => Generator<Array<string>, void, unknown>;
        if (!conf.wordPath) {
            if (conf.process) for (const [index, [[pattern, flags], replacement = '']] of conf.process.entries()) {
                text = text.replace(new RegExp(pattern, flags), replacement);
                if (args["step-out"]) await Deno.writeTextFile(conf.path.replace(/.*?([^/]*)$/, `debug/$1-${index}.txt`), text);
            }
            if (conf.test && new RegExp(conf.test).test(text)) {
                console.log(`There is still some special char in ${conf.path}.`);
                Deno.exit(-1);
            }
            words = function*() {
                for (let line of text.split('\n')) {
                    if (!(line = line.trim())) continue;
                    yield conf.tag ? [line, conf.tag] : line.split(/[,:] */).map(w => w.trim());
                }
            }
        } else {
            words = function*() {
                for (let line of text.split('\n')) {
                    if (!(line = line.trim())) continue;
                    const root = JSON.parse(line);
                    let word = root;
                    for (const item of conf.wordPath!) word = word[item];
                    word = word.replaceAll('é', 'e').replaceAll('ç', 'c');
                    let tag: any = conf.tag;
                    if (conf.tagPath) (tag = root) && conf.tagPath.forEach(item => tag = tag[item]);
                    yield [word, tag];
                }
            }
        }
        for (let [word, ...tags] of words()) {
            // revision
            if (config.revision?.hasOwnProperty(word)) word = config.revision[word];
            else if (conf.revision?.hasOwnProperty(word)) word = conf.revision[word];
            if (!word) continue;
            // spell check
            if (!args['spell-check'] || vocabulary.has(word)) {
                vocabulary.addWord(word, tags);
                continue;
            }  
            console.log(`  Checking ${word}`);
            const replaces = new Set<string>();
            let found;
            for (let i = 0; i < spellCheckFunctions.length; i++) {
                const funIndex = functionIndex++ % spellCheckFunctions.length;
                const entries = await spellCheckFunctions[funIndex](word);
                if (found = entries.find(entry => entry === word)) {
                    console.log(`    Found in ${funIndex}`);
                    vocabulary.addWord(word, tags);
                    break;
                } else {
                    console.log(`    Not found in ${funIndex}`);
                    entries.forEach(entry => replaces.add(entry));
                }
            }
            if (!found) {
                console.log('    Not found in all dict!');
                miss[word] = Array.from(replaces);
            }
        }
        if (Object.keys(miss).length) conf.miss = miss;
    }
    // write to file
    const file = await Deno.open(args.output, { write: true, create: true, truncate: true });
    for (const line of sortCaseInsensitive(vocabulary.toArray()))
        await Deno.write(file.rid, encoder.encode(`${line}\n`));
    file.close();
    // write config
    for (const conf of Object.values(config.inputs)) if (conf.miss) {
        await writeConfig(args.config, config);
        return;
    }
}

if (import.meta.main) await run();
