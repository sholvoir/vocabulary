// deno-lint-ignore-file no-cond-assign
const run = async () => {
    const vocabulary = new Set<string>();
    for await (const file of Deno.readDir('dest')) {
        if (file.isFile && file.name.endsWith('.txt')) {
            for (let line of (await Deno.readTextFile(`dest/${file.name}`)).split('\n'))
                if (line = line.trim()) vocabulary.add(line);
        }
    }
    await Deno.writeTextFile('vocabulary.txt', Array.from(vocabulary).sort().join('\n'));
    console.log('done!');
}

if (import.meta.main) run();