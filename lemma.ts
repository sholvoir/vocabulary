import { getHash } from "@sholvoir/generic/hash";

const run  = async () => {
   const lema = await Deno.readTextFile("docs/lemmatization.yaml");
   const checksumLema = await getHash(lema);
   await Deno.writeTextFile("docs/checksum-lema.json", JSON.stringify({ checksum: checksumLema }));
}

if (import.meta.main) await run();