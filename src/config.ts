// deno-lint-ignore-file no-explicit-any
import { parse, stringify } from '@std/yaml';
import { Tag } from "./tag.ts";

export type Config = {
    name: string;
    path: string;
    tag?: Tag;
    wordPath?: Array<string | number>;
    tagPath?: Array<string | number>;
    test?: string;
    process?: Array<[[string, string], string]>;
    replace?: Record<string, Array<string>>
    miss?: Record<string, Array<string>>;
};

export async function readConfig(path: string) {
    return parse(await Deno.readTextFile(path)) as Array<Config>;
}

export async function writeConfig(path: string, config: Array<Config>) {
    await Deno.writeTextFile(path, stringify(config as any, { flowLevel: 3 }));
}