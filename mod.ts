import { readline } from 'https://deno.land/x/readline/mod.ts';
import { parse as yamlParse, stringify as yamlStringify } from 'https://deno.land/std@0.92.0/encoding/yaml.ts';
import { getArgs } from 'https://sholvoir.github.io/args/mod.ts';
import marked from 'https://ga.jspm.io/npm:marked@2.0.3/lib/marked.esm.js';

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
    tag?: string;
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

export class Tags extends Set<string> {
    static encoder: Record<string, string> = {
        ogden:      'OG',
        macmillan:  'MC',
        longmand:   'LD',
        longmanS1:  'S1',
        longmanS2:  'S2',
        longmanS3:  'S3',
        longmanW1:  'W1',
        longmanW2:  'W2',
        longmanW3:  'W3',
        voa:        'VA',
        wik:        'WK',
        oxfordA1:   'A1',
        oxfordA2:   'A2',
        oxfordB1:   'B1',
        oxfordB2:   'B2',
        oxfordC1:   'C1',
        oxfordC2:   'C2',
        collins1:   'L1',
        collins2:   'L2',
        collins3:   'L3',
        collins4:   'L4',
        collins5:   'L5',
        ngsl:       'GL',
        ngsls:      'GS',
        nawl:       'AW',
        tsl:        'TS',
        bsl:        'BS',
        ndl:        'DL',
        fel:        'FE',
        coca:       'CA',
        bnc:        'BN',
        hsee:       'ZK',
        ncee:       'GK',
        npee:       'KY',
        cet4:       'T4',
        cet6:       'T6',
        toefl:      'TF',
        ielts:      'IS',
        sat:        'ST',
        gre:        'GR',
        gmat:       'GM',
        bec:        'BE'
    }
    static decoder: Record<string, string> = {
        OG: 'Ogden',
        MC: 'Macmillan',
        LD: 'LangmanD',
        S1: 'LangmanS1',
        S2: 'LangmanS2',
        S3: 'LangmanS3',
        W1: 'LangmanW1',
        W2: 'LangmanW2',
        W3: 'LangmanW3',
        VA: 'VOA1500',
        WK: 'Wik1000',
        A1: 'OxfordA1',
        A2: 'OxfordA2',
        B1: 'OxfordB1',
        B2: 'OxfordB2',
        C1: 'OxfordC1',
        C2: 'OxfordC2',
        L1: 'Collins1',
        L2: 'Collins2',
        L3: 'Collins3',
        L4: 'Collins4',
        L5: 'Collins5',
        GL: 'NGSL',
        GS: 'NGSLS',
        AW: 'NAWL',
        TL: 'TSL',
        BL: 'BSL',
        DL: 'NDL',
        FE: 'FEL',
        CA: 'COCA',
        BN: 'BNC',
        ZK: 'HSEE',
        GK: 'NECC',
        KY: 'NPEE',
        T4: 'CET4',
        T6: 'CET6',
        TF: 'Toefl',
        IS: 'Ietls',
        ST: 'SAT',
        GR: 'GRE',
        GM: 'GMAT',
        BE: 'BEC'
    }
    attach(...tags: Array<string>) {
        if (tags) for (const tag of tags) this.add(tag);
    }
    remove(...tags: Array<string>) {
        for (const tag of tags) this.delete(tag);
    }
    toString() {
        return Array.from(this).sort().join(',');
    }
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
    return yamlParse(await Deno.readTextFile(path)) as Config;
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

class Vocabulary extends Map<string, Tags> {
    add(word: string, ...tags: Array<string>) {
        if (this.has(word)) this.get(word)?.attach(...tags);
        else this.set(word, new Tags(tags));
    }
    merge(that: Vocabulary) {
        for (const [word, tags] of that) this.add(word, ...tags);
    }
    addItem(item: string) {
        const [word, ...tags] = item.split(/[,:] */).map(w => w.trim());
        if (!tags.length) console.log(`... will add ${word} without tags.`);
        if (word) this.add(word, ...tags);
    }
    remove(word: string, ...tags: Array<string>) {
        const otags = this.get(word);
        if (otags) otags.remove(...tags);
    }
    removeWordsWithoutTags() {
        for (const [word, tags] of this) tags.size || this.delete(word);
    }
    clearTags(...tags: Array<string>) {
        for (let [word] of this) this.remove(word, ...tags);
    }
    load(text: string, tag?: string, separator?: string) {
        if (tag) splitAndDo(text, separator, word => this.add(word, tag));
        else splitAndDo(text, separator, this.addItem.bind(this));
    }
    toArray() {
        return sort(Array.from(this).map(([word, tags]) => `${word}${tags.size ? `: ${tags.toString()}` : ''}`));
    }
    toString() {
        return this.toArray().join('\n');
    }
    async readFile(path = vocabularyPath, ignoreTags?: boolean) {
        try { await readAndDo(path, ignoreTags ? this.add.bind(this) : this.addItem.bind(this)); }
        catch { await readAndDo('dict.txt', this.add.bind(this)); }
        return this;
    }
    async writeFile(path = vocabularyPath, withTags?: boolean) {
        await writeToFile(path, withTags ? this.toArray() : sort(Array.from(this.keys())));
    }
}

export async function extractAndMerge(conf: InputConf, vocabulary: Vocabulary) {
    const words = new Vocabulary();
    // import conf
    const defaultTag = conf.tag || Tags.encoder[conf.name];
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
        let tag: any;
        for (const item of conf.wordPath as Array<string|number>) word = word[item];
        if (conf.tagPath) (tag = word) && conf.tagPath.forEach(item => tag = tag[item]);
        else tag = defaultTag;
        words.add(word, tag);
    });
    console.log(`${words.size}, add File ${conf.path}`);
    // revision
    if (conf.revision) {
        for (let line of conf.revision.split('\n')) if (line = line.trim()) {
            let [oldWord, ...newWords] = line.split(':');
            let otags
            if ((oldWord = oldWord.trim()) && (otags = words.get(oldWord))) {
                words.delete(oldWord);
                for (let newWord of newWords) (newWord = newWord.trim()) && words.add(newWord, ...otags);
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
    words.writeFile(`${outputDir}${conf.output || conf.name}.txt`, conf.writeWithTags);
    vocabulary.merge(words);
}

async function test() {
    console.log(encodeURIComponent('c/o'));
}

async function run() {
    const {options, args} = getArgs();
    if (options.has('-t')) { await test(); return; }
    const config = await readConfig();
    (release = options.has('-r')) && (outputDir = `../sholvoir.github.io/vocabulary/${config.version}/`);
    await Deno.mkdir(outputDir);
    debug = options.has('-d')
    const vocabulary = await new Vocabulary().readFile(vocabularyPath, release);
    for (const input of config.inputs)
        if (!Deno.args.length || input.name == args[0])
            await extractAndMerge(input, vocabulary);
    debug || await vocabulary.writeFile(vocabularyPath, true);
    if (release) {
        vocabulary.removeWordsWithoutTags();
        await vocabulary.writeFile(`${outputDir}vocabulary.txt`, true);
        const readme = (await Deno.readTextFile(readmePath))
            .replaceAll(new RegExp('(https://sholvoir.github.io/vocabulary/)\\d+\\.\\d+\\.\\d+', 'g'), `$1${config.version}`);
        await Deno.writeTextFile(readmePath, readme);
        await Deno.writeTextFile('../sholvoir.github.io/vocabulary/index.html', marked(readme));
        const cmds = [{
            cmd: ["git", "add", "."],
            cwd: "../sholvoir.github.io",
        }, {
            cmd: ["git", "commit", "-m", `"vocabulary ${config.version}"`],
            cwd: "../sholvoir.github.io",
        }, {
            cmd: ["git", "push"],
            cwd: "../sholvoir.github.io",
        }];
        if (!debug) for (const cmd of cmds) {
            const p = Deno.run(cmd);
            const r = await p.status();
            if (!r.success) {
                console.log(`Failed at "${cmd.cmd.join(" ")}"`);
                Deno.exit(-1);
            }
            p.close();
        }
        const ver = config.version.split('.').map(x => parseInt(x));
        ver[2]++;
        shouldWriteConfig = config.version = ver.join('.');
    }
    shouldWriteConfig && await writeConfig(config);
}
await run();
