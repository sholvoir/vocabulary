const entitiesRegex = /&(quot|apos|amp|lt|gt|#(x?\d+));/g;
const markRegex = /<.*?>/g;
const spliteNum = /^([A-Za-zèé /&''.-]+)(\d*)/;
const entities: Record<string, string> = { quot: '"', apos: "'", amp: '&', lt: '<', gt: '>' };
const decodeEntities = (_: string, p1: string, p2: string) => p2 ? String.fromCharCode(+`0${p2}`) : entities[p1];
const reqInit = { headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 6.1; Win64; x64; rv:47.0) Gecko/20100101 Firefox/47.0'} }

const getScfunc = (baseUri: string, regexes: Array<[RegExp, number]>) => async (word: string) => {
    try {
        const result = [];
        const html = await (await fetch(`${baseUri}${encodeURIComponent(word)}`, reqInit)).text();
        for (const [regex, index] of regexes)
            for (const match of html.matchAll(regex))
                result.push(match[index??1].trim().replaceAll(entitiesRegex, decodeEntities).replaceAll(markRegex, ''));
        return result;
    } catch (e) { return (console.log(e), []);}
};
const scfuncs = [
    /*getScfunc('https://www.merriam-webster.com/dictionary/',
        [[/<(?:h1|p) class="hword">(?:<span.*?>)?(.+?)(?:<\/span>)?<\/(?:h1|p)>/g, 1],
         [/<span class="fw-bold ure">(.+?)<\/span>/g, 1],
         [/<span id=".*?" class="va">(.+?)<\/span>/g, 1]]),*/
    getScfunc('https://www.oxfordlearnersdictionaries.com/us/definition/english/',
        [[/<h1 class="headword".*?>(.+?)<\/h1>/g, 1]])/*,
    getScfunc('https://www.dictionary.com/browse/',
        [[/<(p|h1) class="(?:elMfuCTjKMwxtSEEnUsi)?">(.*?)<\/\1>/g, 2]])*/
];
let functionIndex = 0;
export const spellCheck = async (word: string): Promise<string[]|undefined> => {
    const m = spliteNum.exec(word);
    if (!m) throw new Error("Error");
    const rword = m[1];

    console.log(`  Checking ${word}`);
    const replaces = new Set<string>();
    for (let i = 0; i < scfuncs.length; i++) {
        const funIndex = functionIndex++ % scfuncs.length;
        const entries = await scfuncs[funIndex](rword);
        if (entries.includes(rword)) {
            console.log(`    Found in ${funIndex}`);
            return undefined;
        } else {
            console.log(`    Not found in ${funIndex}`);
            entries.forEach(entry => replaces.add(entry));
        }
    }
    console.log('    Not found in all dict!');
    return Array.from(replaces);
}

if (import.meta.main) {
    functionIndex = +(Deno.args[1] ?? 0);
    console.log(await spellCheck(Deno.args[0]));
}