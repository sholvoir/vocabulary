// deno-lint-ignore-file no-cond-assign
const run = async () => {
    const delimiter = /[,:] */;
    const oldVocabulary = new Set<string>();
    for (let line of (await Deno.readTextFile(Deno.args[0] ?? 'vocabulary1.txt')).split('\n'))
        if (line = line.trim()) {
            let [word] = line.split(delimiter);
            if (word = word.trim()) oldVocabulary.add(word);
        }
    const newVocabulary = new Set<string>();
    for (let line of (await Deno.readTextFile(Deno.args[1] ?? 'vocabulary.txt')).split('\n'))
        if (line = line.trim()) {
            let [word] = line.split(delimiter);
            if (word = word.trim()) newVocabulary.add(word);
        }
    console.log('...removing...');
    for (const word of Array.from(oldVocabulary.difference(newVocabulary)).sort()) console.log(word);
    console.log('...adding...');
    for (const word of Array.from(newVocabulary.difference(oldVocabulary)).sort()) console.log(word);
}

if (import.meta.main) run();