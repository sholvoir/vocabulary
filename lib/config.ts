// deno-lint-ignore-file no-explicit-any
import { parse, stringify } from '@std/yaml';

export interface Config {
    input: string;
    output: string;
    version: string;
    wordPath?: Array<string | number>;
    test?: string;
    process?: Array<[[string, string], string]>;
    replace?: Record<string, Array<string>>;
    miss?: Record<string, Array<string>>;
};

export async function readConfig(path: string) {
    return parse(await Deno.readTextFile(path)) as Config;
}

export async function writeConfig(path: string, config: Config) {
    await Deno.writeTextFile(path, stringify(config as any, { flowLevel: 2 }));
}