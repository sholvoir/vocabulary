// deno-lint-ignore-file no-explicit-any
import { parse, stringify } from 'std/encoding/yaml.ts';

const configPath = 'config.yaml';

export interface InputConf {
    name: string;
    path: string;
    conf?: InputConf;
    tag?: string;
    wordPath?: Array<string|number>;
    tagPath?: Array<string|number>;
    replaces?: Array<[[string, string], string]>;
    test?: string;
    separator?: string;
    revision?: string;
    output?: string;
    miss?: string;
}

export interface Config {
    version: string;
    inputs: Array<InputConf>;
}

export async function readConfig(path = configPath) {
    return parse(await Deno.readTextFile(path)) as Config;
}

export async function writeConfig(config: Config, path = configPath) {
    await Deno.writeTextFile(path, stringify(config as any, {flowLevel: 3, lineWidth: 640}));
}