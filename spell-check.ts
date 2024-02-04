const entitiesRegex = /&(quot|apos|amp|lt|gt|#(x?\d+));/g;
const markRegex = /<.*?>/g;
const entities: Record<string, string> = { quot: '"', apos: "'", amp: '&', lt: '<', gt: '>' };
const decodeEntities = (_: string, p1: string, p2: string) => p2 ? String.fromCharCode(+`0${p2}`) : entities[p1];
const getScfunc = (baseUri: string, regex: RegExp, index = 1) => async (word: string) => {
    try {
        const html = await (await fetch(`${baseUri}${encodeURIComponent(word)}`)).text();
        return Array.from(html.matchAll(regex)).map(match =>
            match[index].trim().replaceAll(entitiesRegex, decodeEntities).replaceAll(markRegex, '')
        );
    } catch (e) {
        console.log(e);
        return [];
    }
};
const scfuncs = [
    getScfunc('https://www.merriam-webster.com/dictionary/',
        /<(?:h1|p) class="hword">(?:<span.*?>)?(.+?)(?:<\/span>)?<\/(?:h1|p)>/g),
    getScfunc('https://www.collinsdictionary.com/dictionary/english/',
        /<h2 class="h2_entry"><span class="orth">(.+?)<\/span>/g),
    getScfunc('https://www.dictionary.com/browse/',
        /(?:<h1>|<span class="c8xVkuOkmPmaouCkeaau">)(.+?)(?:<\/h1>|<\/span>)/g)
];
let functionIndex = 0;
export const spellCheck = async (word: string): Promise<string[]|undefined> => {
    console.log(`  Checking ${word}`);
    const replaces = new Set<string>();
    for (let i = 0; i < scfuncs.length; i++) {
        const funIndex = functionIndex++ % scfuncs.length;
        const entries = await scfuncs[funIndex](word);
        if (entries.includes(word)) {
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

if (import.meta.main) console.log(await spellCheck(Deno.args[0]));