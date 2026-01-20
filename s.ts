import { readConfig, writeConfig } from "./lib/config.ts";

const run = async () => {
   const configPaths = new Set<string>();
   for await (const file of Deno.readDir("conf"))
      if (file.isFile && file.name.endsWith(".yaml"))
         configPaths.add(`conf/${file.name}`);
   for (const configPath of configPaths) {
      const config = await readConfig(configPath);
      config.output = config.output.replace(/\.txt$/, "");
      await writeConfig(configPath, config);
   }
}

if (import.meta.main) await run();