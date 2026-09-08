const run = async () => {
    const afile = Deno.args[0];
    const bfile = Deno.args[1];
    const rfile = Deno.args[2];
    console.log(Deno.args);
    if (!afile || !bfile) return console.log("Args is not correct");
    const vocabulary = new Set<string>();
    for (let line of (await Deno.readTextFile(afile)).split('\n'))
        if (line = line.trim()) vocabulary.add(line);
    for (let line of (await Deno.readTextFile(bfile)).split('\n'))
        if (line = line.trim()) vocabulary.delete(line);
    const result = Array.from(vocabulary).sort().join('\n');
    if (rfile) await Deno.writeTextFile('vocabulary.txt', result);
    else console.log(result);
    console.log('done!');
}

if (import.meta.main) run();