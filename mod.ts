// deno-lint-ignore-file no-explicit-any no-cond-assign
import getArgs from "micinfotech/args.ts";
import { readLines } from "std/io/read_lines.ts";
import { InputConf, readConfig, writeConfig } from './config.ts';
import { Tags } from './tags.ts';

const encoder = new TextEncoder();
const vocabularyPath = 'vocabulary.txt';
let shouldWriteConfig: any;

function sort(array: Array<string>) {
    return array.sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase()));
}
function splitAndDo({ text, separator, func }: { text: string, separator: string, func: (line: string) => void }) {
    for (let line of text.split(separator)) (line = line.trim()) && func(line);
}
async function readAndDo(path: string, func: (line: string) => void) {
    const file = await Deno.open(path);
    for await (let line of readLines(file)) (line = line.trim()) && func(line);
    file.close();
}
async function writeToFile(path: string, lines: Iterable<string>) {
    const file = await Deno.open(path, { write: true, create: true, truncate: true });
    for (let line of lines) (line = line.trim()) && await Deno.write(file.rid, encoder.encode(`${line}\n`));
    file.close();
}

const entitiesRegex = /&(quot|apos|amp|lt|gt|#(x?\d+));/g;
const entities: { [key: string]: string } = { quot: '"', apos: "'", amp: '&', lt: '<', gt: '>' };
const decodeEntities = (_: string, p1: string, p2: string) => p2 ? String.fromCharCode(+`0${p2}`) : entities[p1];
const getSpellCheckFunc = (baseUri: string, regex: RegExp, index = 1) => async (word: string) => {
    try {
        const html = await (await fetch(`${baseUri}${encodeURIComponent(word)}`)).text();
        return Array.from(html.matchAll(regex)).map(match => match[index].trim().replaceAll(entitiesRegex, decodeEntities));
    } catch (e) {
        console.log(e);
        return [];
    }
};
const spellCheckFuns = [
    getSpellCheckFunc('https://www.merriam-webster.com/dictionary/',
        /<h1 class="hword">(?:<span.*?>)?(.+?)(?:<\/span>)?<\/h1>/g),
    getSpellCheckFunc('https://www.collinsdictionary.com/search/?dictCode=english&q=',
        /<h2 class="h2_entry"><span class="orth">(.+?)<\/span>/g),
    getSpellCheckFunc('https://www.dictionary.com/browse/',
        /<h1 data-first-headword="true" class=".+?">(.+?)<\/h1>/g),
    getSpellCheckFunc('https://www.oxfordlearnersdictionaries.com/search/english/?q=',
        /<h1.+?>(.+?)(?:<span.+?>.+?<\/span>)?<\/h1>/g)
];

export class Vocabulary extends Map<string, Tags> {
    addWord(word: string, tags: Iterable<string>) {
        if (this.has(word)) this.get(word)!.attach(tags);
        else this.set(word, new Tags(tags));
    }
    addItem(item: string) {
        const [word, ...tags] = item.split(/[,:] */).map(w => w.trim());
        if (word) this.addWord(word, tags);
    }
    addWords(words: string, tags: Iterable<string>, separator = '\n') {
        splitAndDo({ text: words, separator, func: (word: string) => this.addWord(word, tags) });
    }
    addItems(items: string, separator = '\n') {
        splitAndDo({ text: items, separator, func: this.addItem.bind(this) });
    }
    merge(that: Vocabulary) {
        for (const [word, tags] of that) this.addWord(word, tags);
    }
    async addWordsFromFile(path: string, tags: Array<string>) {
        await readAndDo(path, word => this.addWord(word, tags));
    }
    async addItemsFromFile(path: string) {
        await readAndDo(path, this.addItem.bind(this));
    }
    removeWord(word: string) {
        this.delete(word);
    }
    removeTags(word: string, tags: Iterable<string>) {
        const otags = this.get(word);
        if (otags) otags.remove(tags);
    }
    removeWordsWithoutTags() {
        for (const [word, tags] of this) if (!tags.size) {
            console.log(`Without Tags remove word "${word}".`);
            this.delete(word);
        }
    }
    clearTags(tags: Iterable<string>) {
        for (const [word] of this) this.removeTags(word, tags);
    }
    toArray() {
        return sort(Array.from(this).map(([word, tags]) => `${word}${tags.size ? `: ${tags.toString()}` : ''}`));
    }
    toString() {
        return this.toArray().join('\n');
    }
    async writeFile(path: string) {
        await writeToFile(path, this.toArray());
    }
}

export async function extractAndMerge({
    conf,
    vocabulary,
    writeStepFile,
    ignoreSpellCheck,
    outputDir
}: {
    conf: InputConf,
    vocabulary: Vocabulary,
    writeStepFile?: boolean,
    ignoreSpellCheck?: boolean,
    outputDir?: string
}) {
    console.log(`Dealing ${conf.name}...`);
    const words = new Vocabulary();
    // import conf
    const defaultTag = conf.tag || Tags.encoder[conf.name];
    if (!conf.wordPath) {
        let text = await Deno.readTextFile(conf.path);
        if (conf.replaces) for (const [index, [regex, newstr]] of conf.replaces.entries()) {
            text = text.replace(new RegExp(...regex), newstr || '');
            if (writeStepFile) await Deno.writeTextFile(conf.path.replace(/.*?([^/]*)$/, `debug/$1-${index}.txt`), text);
        }
        if (conf.test && new RegExp(conf.test).test(text)) {
            console.log(`There is still some special char in ${conf.path}.`);
            Deno.exit(-1);
        }
        if (defaultTag) words.addWords(text, [defaultTag], conf.separator);
        else words.addItems(text, conf.separator);
    } else await readAndDo(conf.path, line => {
        let word = JSON.parse(line);
        let tag: any;
        for (const item of conf.wordPath as Array<string | number>) word = word[item];
        if (conf.tagPath) (tag = word) && conf.tagPath.forEach(item => tag = tag[item]);
        else tag = defaultTag;
        words.addWord(word, [tag]);
    });
    console.log(`  Find ${words.size} words from ${conf.path}`);
    // revision
    if (conf.revision) {
        for (let line of conf.revision.split('\n')) if (line = line.trim()) {
            let [oldWord, ...newWords] = line.split(':');
            let otags
            if ((oldWord = oldWord.trim()) && (otags = words.get(oldWord))) {
                words.delete(oldWord);
                for (let newWord of newWords) (newWord = newWord.trim()) && words.addWord(newWord, otags);
            }
            else console.log(`${oldWord} not in words.`);
        }
        console.log(`  After revision remain ${words.size} words.`);
    }
    // SpellCheck
    if (!ignoreSpellCheck) {
        const miss: Array<string> = [];
        let funIndex = 0;
        const funLength = spellCheckFuns.length;
        for (const word of words.keys()) if (!vocabulary.has(word)) {
            console.log(`Checking ${word}`);
            let found = false;
            const replaces = new Set<string>();
            for (let i = 0; i < funLength; i++) {
                const entries = await spellCheckFuns[funIndex++ % funLength](word);
                for (const entry of entries) if (found = (entry === word)) break; else replaces.add(entry);
                if (found) {
                    console.log(`  Found in ${funIndex}`)
                    break;
                }
            }
            if (!found) {
                console.log('  Not Found!');
                miss.push(replaces.size ? `${word} :${Array.from(replaces).join()}` : word) && words.delete(word);
            }
        }
        console.log(`Miss ${miss.length} words in ${conf.name}`);
        shouldWriteConfig ||= miss.length || conf.miss;
        if (miss.length) conf.miss = sort(miss).join('\n');
        else if (conf.miss) delete conf.miss;
    }
    // return
    outputDir && await words.writeFile(`${outputDir}/${conf.output || conf.name}.txt`);
    vocabulary.merge(words);
}

async function run() {
    const config = await readConfig();
    const { options, args } = getArgs();
    const debug = options.has('-d') || options.has('--debug');
    const vocabulary = new Vocabulary()
    if (options.has('-c') || options.has('--continue'))
        await vocabulary.addItemsFromFile(vocabularyPath);
    else await vocabulary.addWordsFromFile('dict.txt', []);
    for (const input of config.inputs)
        if (!args.length || input.name == args[0])
            await extractAndMerge({ conf: input, vocabulary, writeStepFile: !debug, ignoreSpellCheck: debug, outputDir: 'public' });
    debug || await vocabulary.writeFile(vocabularyPath);
    shouldWriteConfig && await writeConfig(config);
}

if (import.meta.main) await run();
