// deno-lint-ignore-file no-cond-assign no-empty
const vocabFile = `${import.meta.dirname}/../vocabulary.txt`;
const entitiesRegex = /&(quot|apos|amp|lt|gt|#(x?\d+));/g;
const markRegex = /<.*?>/g;
// const spliteNum = /^([A-Za-zèé /&''.-]+)(\d*)/;
const agent = 'Mozilla/5.0 (Windows NT 6.1; Win64; x64; rv:47.0) Gecko/20100101 Firefox/47.0';
const entities: Record<string, string> = {
    quot: '"', apos: "'", amp: '&', lt: '<', gt: '>'
};
const decodeEntities = (_: string, p1: string, p2: string) =>
    p2 ? String.fromCharCode(+`0${p2}`) : entities[p1];
const reqInit = { headers: { 'User-Agent': agent } }

const getScfunc = (baseUri: string, regexes: Array<[RegExp, number]>) =>
    async (word: string) => {
        try {
            const result = [];
            const res = await fetch(`${baseUri}${encodeURIComponent(word)}`, reqInit);
            const html = await res.text();
            for (const [regex, index] of regexes)
                for (const match of html.matchAll(regex))
                    result.push(match[index ?? 1].trim()
                        .replaceAll(entitiesRegex, decodeEntities)
                        .replaceAll(markRegex, ''));
            return result;
        } catch (e) { return (console.log(e), []); }
    };

const scfuncs = [
    getScfunc('https://www.merriam-webster.com/dictionary/',
        [[/<(?:h1|p) class="hword">(?:<span.*?>)?(.+?)(?:<\/span>)?<\/(?:h1|p)>/g, 1],
        [/<span class="fw-bold ure">(.+?)<\/span>/g, 1],
        [/<span id=".*?" class="va">(.+?)<\/span>/g, 1]]),
    getScfunc('https://www.oxfordlearnersdictionaries.com/us/search/english/?q=',
        [[/<h1 class="headword".*?>(.+?)<\/h1>/g, 1]]),
    getScfunc('https://www.dictionary.com/browse/',
        [[/<(p|h1) class="(?:elMfuCTjKMwxtSEEnUsi)?">(.*?)<\/\1>/g, 2]])
];

const vocabSet = new Set<string>();
let vocabSize = 0;
export const spellCheckInit = async () => {
    if (!vocabSet.size) try {
        for (let line of (await Deno.readTextFile(vocabFile)).split('\n'))
            if (line = line.trim()) vocabSet.add(line);
    } catch { }
    vocabSize = vocabSet.size;
}

let functionIndex = 0;
export const spellCheck = async (word: string): Promise<string[] | undefined> => {
    word = word.trim();
    if (!vocabSet) await spellCheckInit();
    if (vocabSet.has(word)) return;
    console.log(`Spell Check ${word}...`);
    const replaces = new Set<string>();
    for (let i = 0; i < scfuncs.length; i++) {
        const funIndex = functionIndex++ % scfuncs.length;
        const entries = await scfuncs[funIndex](word);
        if (entries.includes(word)) { vocabSet.add(word); return; }
        else entries.forEach(entry => replaces.add(entry));
    }
    return Array.from(replaces);
}

export const spellCheckClose = async () => {
    if (vocabSet.size > vocabSize)
        await Deno.writeTextFile(vocabFile, Array.from(vocabSet).sort().join('\n'));
}

if (import.meta.main) {
    functionIndex = +(Deno.args[1] ?? 0);
    await spellCheckInit();
    console.log(await spellCheck(Deno.args[0]));
    await spellCheckClose();
}