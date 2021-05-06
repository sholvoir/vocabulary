import { readline } from 'https://deno.land/x/readline/mod.ts';
import { parse as yamlParse, stringify as yamlStringify } from 'https://deno.land/std@0.92.0/encoding/yaml.ts';
import { Tag } from 'https://sholvoir.github.io/generic/word_tag.ts';
import getArgs from 'https://sholvoir.github.io/generic/args.ts';
import marked from 'https://ga.jspm.io/npm:marked@2.0.3/lib/marked.esm.js';
import publish from 'https://sholvoir.github.io/generic/publish.ts';

const decoder = new TextDecoder();
const encoder = new TextEncoder();
const configPath = 'config.yaml';
const readmePath = 'README.md';
const vocabularyPath = 'vocabulary.txt';
let outputDir = 'public/';
let debug: any;
let release: any;
let shouldWriteConfig: any;

interface InputConf {
    name: string;
    path: string;
    conf?: InputConf;
    tag?: bigint;
    wordPath?: Array<string|number>;
    tagPath?: Array<string|number>;
    replaces?: Array<[[string, string], string]>;
    test?: string;
    separator?: string;
    revision?: string;
    output?: string;
    writeWithTags?: boolean;
    miss?: string;
}

interface Config {
    version: string;
    inputs: Array<InputConf>;
}

function sort(array: Array<string>) {
    return array.sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase()));
}
function splitAndDo(text: string, separator = '\n', func: (line: string) => void) {
    for (let line of text.split(separator)) (line = line.trim()) && func(line);
}
async function readAndDo(path: string, func: (line: string) => void) {
    const file = await Deno.open(path);
    for await (let lineU of readline(file)) {
        const line = decoder.decode(lineU).trim();
        if (line) func(line);
    }
    file.close();
}

async function writeToFile(path: string, words: Iterable<string>) {
    const file = await Deno.open(path, { write: true, create: true, truncate: true });
    for (let word of words) if (word = word.trim()) await Deno.write(file.rid, encoder.encode(`${word}\n`));
    file.close();
}

async function readConfig(path = configPath) {
    const config = yamlParse(await Deno.readTextFile(path)) as Config;
    for (const input of config.inputs) input.tag && (input.tag = BigInt(input.tag))
    return 
}

async function writeConfig(config: Config, path = configPath) {
    await Deno.writeTextFile(path, yamlStringify(config as any, {flowLevel: 3, lineWidth: 640}));
}

function extractAllWords(text: string, pattern = /([A-Za-z'\.-]+)/g, index = 1) {
    const words = new Set<string>();
    for (const match of text.matchAll(pattern)) words.add(match[index]);
    return words;
}

function getDictionaryApiFunc(lang: 'US'|'GB') {
    return async (word: string) => {
        const entries = await (await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en_${lang}/${encodeURIComponent(word)}`)).json();
        return Array.isArray(entries) ? entries.map(entry => entry.word as string) : [];
    }
}

function getSpellCheckFunc(baseUri: string, regex: RegExp, index = 1) {
    const entitiesRegex = /&(quot|apos|amp|lt|gt|#(x?\d+));/g
    const entities: {[key: string]: string} = { quot: '"', apos: "'", amp: '&', lt: '<', gt: '>' };
    const decodeEntities = (m: string, p1: string, p2: string) => p2 ? String.fromCharCode(+`0${p2}`) : entities[p1];
    return async (word: string) => {
        const html = await (await fetch(`${baseUri}${encodeURIComponent(word)}`)).text();
        return Array.from(html.matchAll(regex)).map(match => match[index].trim().replaceAll(entitiesRegex, decodeEntities));
    }
}

class Vocabulary extends Map<string, Tag> {
    add(word: string, tag = 0n) {
        this.has(word) ? this.get(word)?.attach(tag) : this.set(word, new Tag(tag));
    }
    merge(that: Vocabulary) {
        for (const [word, tag] of that) this.add(word, tag.value);
    }
    addItem(item: string, tag?: bigint) {
        const [word, ...tags] = item.split(/[,:] */).map(w => w.trim());
        if (tag === undefined) {
            tag = 0n;
            for (const t of tags) tag |= (isNaN(<any>t) ? Tag.get(t) || 0n : BigInt(t));
            if (!tag) console.log(`... will add ${word} without tags.`);
        }
        if (word) this.add(word, tag);
    }
    remove(word: string, tag: bigint) {
        this.get(word)?.remove(tag);
    }
    removeWordsWithoutTag() {
        for (const [word, tag] of this) tag.value || this.delete(word);
    }
    clearTag(tag: bigint) {
        for (let [word] of this) this.remove(word, tag);
    }
    load(text: string, tag?: bigint, separator?: string) {
        splitAndDo(text, separator, line => this.addItem(line, tag));
    }
    toArray() {
        return Array.from(this).map(([word, tag]) => `${word}${tag.value ? `: ${tag.value}` : ''}`);
    }
    toString() {
        return sort(this.toArray()).join('\n');
    }
    async readFile(path = vocabularyPath, ignoreTag?: boolean) {
        try { await readAndDo(path, ignoreTag ? line => this.addItem(line, 0n) : this.addItem.bind(this)); }
        catch { await readAndDo('dict.txt', this.add.bind(this)); }
        return this;
    }
    async writeFile(path = vocabularyPath, withTags?: boolean) {
        await writeToFile(path, sort(withTags ? this.toArray() : Array.from(this.keys())));
    }
}

export async function extractAndMerge(conf: InputConf, vocabulary: Vocabulary) {
    const words = new Vocabulary();
    // import conf
    const defaultTag = conf.tag || Tag.get(conf.name);
    if (!conf.wordPath) {
        let text = await Deno.readTextFile(conf.path);
        if (conf.replaces) for (const [index, [regex, newstr]] of conf.replaces.entries()) {
            text = text.replace(new RegExp(...regex), newstr || '');
            if (debug) await Deno.writeTextFile(conf.path.replace(/.*?([^/]*)$/, `$1-${index}.txt`), text);
        }
        if (conf.test && new RegExp(conf.test).test(text)) {
            console.log(`There is still some special char in ${conf.path}.`);
            Deno.exit(-1);
        }
        words.load(text, defaultTag, conf.separator);
    } else await readAndDo(conf.path, line => {
        let word = JSON.parse(line);
        for (const item of conf.wordPath as Array<string|number>) word = word[item];
        let tag: any = defaultTag;
        if (conf.tagPath) {
            tag = word;
            for (const i of conf.tagPath) tag = tag[i];
            tag = +tag;
        }
        words.add(word, tag);
    });
    console.log(`${words.size}, add File ${conf.path}`);
    // revision
    if (conf.revision) {
        for (let line of conf.revision.split('\n')) if (line = line.trim()) {
            let [oldWord, ...newWords] = line.split(':');
            if (words.has(oldWord = oldWord.trim())) {
                const otag = words.get(oldWord)?.value || 0n;
                words.delete(oldWord);
                for (let newWord of newWords) (newWord = newWord.trim()) && words.add(newWord, otag);
            }
            else console.log(`${oldWord} not in words.`);
        }
        console.log(`${words.size}, use revision`);
    }
    if (debug) return;
    // SpellCheck
    const spellCheckFuns = [
        getDictionaryApiFunc('US'),
        getDictionaryApiFunc('GB'),
        getSpellCheckFunc('https://www.merriam-webster.com/dictionary/',
            /<h1 class="hword">(?:<span.*?>)?(.+?)(?:<\/span>)?<\/h1>/g),
        getSpellCheckFunc('https://www.collinsdictionary.com/search/?dictCode=english&q=',
            /<h2 class="h2_entry"><span class="orth">(.+?)<\/span>/g),
        getSpellCheckFunc('https://www.dictionary.com/browse/',
            /<h1 data-first-headword="true" class=".+?">(.+?)<\/h1>/g),
        getSpellCheckFunc('https://www.oxfordlearnersdictionaries.com/search/english/?q=',
            /<h1.+?>(.+?)(?:<span.+?>.+?<\/span>)?<\/h1>/g)
    ];
    const miss: Array<string> = [];
    for (const word of words.keys()) if (!vocabulary.has(word)) {
        console.log(`Checking ${word}`);
        let found = false;
        const replaces = new Set<string>();
        try { for (const spellCheckFun of spellCheckFuns) {
            const entries = await spellCheckFun(word);
            for (const entry of entries) if (found = (entry === word)) break; else replaces.add(entry);
            if (found) break;
        }} catch (e) { console.log(e); }
        if (!found) miss.push(replaces.size ? `${word} :${Array.from(replaces).join()}` : word) && words.delete(word);
    }
    console.log(`Miss ${miss.length} words in ${conf.name}`);
    shouldWriteConfig ||= miss.length || conf.miss;
    if (miss.length) conf.miss = sort(miss).join('\n');
    else if (conf.miss) delete conf.miss;
    // return
    words.writeFile(`${outputDir}${conf.output || `${conf.name}.txt`}`, conf.writeWithTags);
    vocabulary.merge(words);
}

async function run() {
    const {options, args} = getArgs();
    const config = await readConfig();
    (release = options.has('-r')) && (outputDir = `../sholvoir.github.io/vocabulary/${config.version}/`);
    try { await Deno.mkdir(outputDir); }
    catch {}
    debug = options.has('-d')
    const vocabulary = await new Vocabulary().readFile(vocabularyPath, release);
    for (const input of config.inputs)
        if (!Deno.args.length || input.name == args[0])
            await extractAndMerge(input, vocabulary);
    debug || await vocabulary.writeFile(vocabularyPath, true);
    if (release) {
        vocabulary.removeWordsWithoutTag();
        await vocabulary.writeFile(`${outputDir}vocabulary.txt`, true);
        const readme = (await Deno.readTextFile(readmePath))
            .replaceAll(new RegExp('(https://sholvoir.github.io/vocabulary/)\\d+\\.\\d+\\.\\d+', 'g'), `$1${config.version}`);
        await Deno.writeTextFile(readmePath, readme);
        await Deno.writeTextFile('../sholvoir.github.io/vocabulary/index.html', marked(readme));
        debug || await publish(`vocabulary ${config.version}`, "../sholvoir.github.io");
        const ver = config.version.split('.').map(x => parseInt(x));
        ver[2]++;
        shouldWriteConfig = config.version = ver.join('.');
    }
    shouldWriteConfig && await writeConfig(config);
}
// await run();
function test() {
    let x = yamlParse(`{a: +32578493578291537291374583947892348578293874875328983748n}`);
    console.log(typeof (<any>x).a, ' ', (<any>x).a);
}
test()