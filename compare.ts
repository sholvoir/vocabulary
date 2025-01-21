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
    for (const word of oldVocabulary) newVocabulary.delete(word);
    if (newVocabulary.size) {
        console.log('adding...');
        for (const word of Array.from(newVocabulary).sort()) console.log(word);
    }
    console.log('done!');
}

if (import.meta.main) run();