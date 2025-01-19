// deno-lint-ignore-file no-cond-assign
import { stringify } from '@std/yaml';

export const run = async () => {
    const lem = await Deno.readTextFile('./lemmatization.txt');
    const vocabulary = new Map<string, Set<string>>;
    const regexes = [
        /^([èé\w]+)\t\1/,
        /^([èé\w]+)e\t\1ing/,
        /^([èé\w]+)y\t\1ie[sdr]/,
        /^([èé\w]+)fe*\t\1ves/
    ]
    for (let line of lem.split('\n')) if (line = line.trim()) {
        for (const regex of regexes) if (line.match(regex)) {
            const [lemma, word] = line.split('\t');
            if (vocabulary.has(word)) vocabulary.get(word)!.add(lemma);
            else vocabulary.set(word, new Set<string>([lemma]));
            break;
        }
    }
    const result: Record<string, Array<string>> = {};
    for (const word of Array.from(vocabulary.keys()).sort())
        result[word] = Array.from(vocabulary.get(word)!).sort();
    await Deno.writeTextFile('./lemmatization.yaml', stringify(result, { flowLevel: 1 }));
}

if (import.meta.main) run();