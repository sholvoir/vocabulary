import { getHash } from "@sholvoir/generic/hash";
import { parseArgs } from "@std/cli/parse-args";
import { readConfig, writeConfig } from "./lib/config.ts";
import { spellCheck } from "./lib/spell-check.ts";

const vocabularyPath = "vocabulary.txt";

async function run() {
   // get command line args and read config file
   const args = parseArgs(Deno.args, {
      boolean: ["step-out", "all"],
      alias: { "step-out": "s", all: "a" },
   });
   // Read Checksum
   const checksum: Record<string, { disc: string; checksum: string }> =
      JSON.parse(await Deno.readTextFile("docs/checksum.json"));
   // Read Vocabulary
   const vocabulary = new Set<string>();
   for (let line of (await Deno.readTextFile(vocabularyPath)).split("\n"))
      if ((line = line.trim())) vocabulary.add(line);
   const vocabularyOldSize = vocabulary.size;
   // Ready Config Paths
   const configPaths = new Set<string>();
   for (const path of args._) configPaths.add(`conf/${path}.yaml`);
   if (args.all)
      for await (const file of Deno.readDir("conf"))
         if (file.isFile && file.name.endsWith(".yaml"))
            configPaths.add(`conf/${file.name}`);
   // Run
   for (const configPath of configPaths) {
      // Read Config
      const config = await readConfig(configPath);
      const miss: Record<string, Array<string>> = {};
      const words = new Set<string>();
      // Read Input
      let text: string;
      if (config.input.startsWith("http")) {
         const resp = await fetch(config.input, { cache: "force-cache" });
         if (!resp.ok) {
            console.error(`Network Error: Can not access ${config.input}`);
            continue;
         }
         text = await resp.text();
      } else text = await Deno.readTextFile(`origin/${config.input}`);
      // Process
      const wordSet = new Set<string>();
      if (!config.wordPath) {
         // Process Input as text
         if (config.process)
            for (const [
               index,
               [[pattern, flags], replacement = ""],
            ] of config.process.entries()) {
               text = text.replace(new RegExp(pattern, flags), replacement);
               if (args["step-out"])
                  await Deno.writeTextFile(
                     config.input.replace(
                        /.*?([^/]*)$/,
                        `debug_$1-${index}.txt`,
                     ),
                     text,
                  );
            }
         if (config.test && new RegExp(config.test).test(text)) {
            console.log(`There is still some special char in ${config.input}.`);
            await Deno.writeTextFile(
               "test.txt",
               JSON.stringify(new RegExp(config.test).exec(text)),
            );
            continue;
         }
         for (let line of text.split("\n"))
            if ((line = line.trim())) wordSet.add(line);
      } else {
         // Process Input as JSON
         for (let line of text.split("\n")) {
            if ((line = line.trim())) {
               let word = JSON.parse(line);
               for (const item of config.wordPath!) word = word[item];
               wordSet.add(word);
            }
         }
      }
      // Replace and SpellCheck
      for (const candidate of wordSet)
         if (candidate)
            for (const word of config.replace?.[candidate] || [candidate]) {
               if (!word) continue;
               if (words.has(word)) continue;
               if (vocabulary.has(word)) words.add(word);
               else {
                  const check = await spellCheck(word);
                  if (!check) {
                     words.add(word);
                     vocabulary.add(word);
                  } else miss[word] = Array.from(check);
               }
            }
      // Write miss
      if (Object.keys(miss).length) {
         config.miss = miss;
         await writeConfig(configPath, config);
      }
      // Write output
      const outstr = Array.from(words).sort().join("\n");
      checksum[config.output] = {
         disc: config.disc!,
         checksum: await getHash(outstr),
      };
      await Deno.writeTextFile(`docs/${config.output}.txt`, outstr);
   }
   // Close SpellCheck
   if (vocabulary.size > vocabularyOldSize) {
      const vocab = Array.from(vocabulary).sort().join("\n");
      await Deno.writeTextFile(vocabularyPath, vocab);
   }
   // Write Checksum
   await Deno.writeTextFile(
      "docs/checksum.json",
      JSON.stringify(checksum, undefined, 3),
   );
}

if (import.meta.main) await run();
