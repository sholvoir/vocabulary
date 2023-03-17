import publish from "micinfotech/publish.ts";
import { Vocabulary, extractAndMerge } from "./mod.ts";
import { readConfig, writeConfig } from './config.ts';
import marked from "marked";

export async function release() {
    // Init
    const config = await readConfig();
    const outputDir = `../sholvoir.github.io/vocabulary/${config.version}`;
    await Deno.mkdir(outputDir);
    // Read and deal and write to output file
    const vocabulary = new Vocabulary()
    await vocabulary.addFromFile('dict.txt', true);
    for (const input of config.inputs)
        await extractAndMerge(input, vocabulary);
    vocabulary.removeWordsWithoutTags();
    await vocabulary.writeFile(`${outputDir}/vocabulary.txt`);
    // Readme
    const readmePath = "README.md";
    const readme = (await Deno.readTextFile(readmePath)).replaceAll(
        new RegExp("(https://sholvoir.github.io/vocabulary/)\\d+\\.\\d+\\.\\d+", "g"), `$1${config.version}`);
    await Deno.writeTextFile(readmePath, readme);
    await Deno.writeTextFile("../sholvoir.github.io/vocabulary/index.html", marked.parse(readme));
    // Publish
    const error = await publish(`"vocabulary ${config.version}"`, "../sholvoir.github.io");
    if (error) console.error(`${error}`);
    // Update version
    const ver = config.version.split(".").map((x) => parseInt(x));
    ver[2]++;
    config.version = ver.join(".");
    // Write config file
    await writeConfig(config);
}

if (import.meta.main) await release();
