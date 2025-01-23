// deno-lint-ignore-file no-cond-assign
const run = async () => {
    const delimiter = /[,:] */;
    const invalid = new Set<string>();
    for (let line of (await Deno.readTextFile(Deno.args[0] ?? 'invalid4.txt')).split('\n'))
        if (line = line.trim()) {
            let [word] = line.split(delimiter);
            if (word = word.trim()) invalid.add(word);
        }
    const vocabulary = new Set<string>();
    for (let line of (await Deno.readTextFile(Deno.args[1] ?? 'vocabulary.txt')).split('\n'))
        if (line = line.trim()) {
            let [word] = line.split(delimiter);
            if (word = word.trim()) vocabulary.add(word);
        }
    const result = Array.from(invalid.intersection(vocabulary));
    for (const word of result) console.log(word);
    await Deno.writeTextFile('invalid5.txt', result.join('\n'));
}

if (import.meta.main) run();