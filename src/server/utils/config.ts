import * as node_config from 'config';

export function config(setting: string, defaultValue?: any) {

    return function (target: any, key: string): void {
        Object.defineProperty(target, key, {
            value: get(setting, defaultValue),
            writable: false
        });
    };
}

export function get<T>(setting: string, defaultValue?: T): T {
    if (node_config.has(setting) || defaultValue === undefined) {
        return node_config.get(setting);
    } else {
        return defaultValue;
    }
}

export default config;
