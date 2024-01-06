// deno-lint-ignore-file no-explicit-any
import { parse } from 'std/yaml/parse.ts';
import { stringify } from 'std/yaml/stringify.ts';
import { Tag } from "./tag.ts";

export interface Config {
    version: string;
    inputs: Record<string, {
        path: string;
        tag?: Tag;
        wordPath?: Array<string | number>;
        tagPath?: Array<string | number>;
        test?: string;
        process?: Array<[[string, string], string]>;
        revision?: {_: Array<string>} & Record<string, string>;
        miss?: Record<string, Array<string>>;
    }>;
    revision?: Record<string, string>;
}

export async function readConfig(path: string) {
    return parse(await Deno.readTextFile(path)) as Config;
}

export async function writeConfig(path: string, config: Config) {
    await Deno.writeTextFile(path, stringify(config as any, { flowLevel: 4, lineWidth: 640 }));
}