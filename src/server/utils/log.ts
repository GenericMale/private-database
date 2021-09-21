import * as log4js from 'log4js';

export function log(category?: string) {
    return function (target: any, key: string): void {
        Object.defineProperty(target, key, {
            value: log4js.getLogger(category || target.constructor.name),
            writable: false
        });
    };
}

export default log;
