import {injectable} from 'inversify';
import * as fs from 'fs';
import * as path from 'path';
import {log} from '../utils/log';
import {Logger} from 'log4js';
import {SearchParameters, Plugin} from '../types';
import {SearchResult} from '../types';

const PLUGIN_DIR = path.join(__dirname, '..', 'plugins');

@injectable()
export class PluginService {

    private static PLUGINS: Plugin[];

    @log()
    private log: Logger;

    private get plugins() {
        if (!PluginService.PLUGINS) {
            PluginService.PLUGINS = [];
            fs.readdirSync(PLUGIN_DIR).filter(
                (file) => path.extname(file) === '.js'
            ).map((file) => {
                let name = path.basename(file, '.js');
                this.log.info(`Loading plugins in ${name}.js ...`);

                return require(path.join(PLUGIN_DIR, name));
            }).forEach(module => {
                Object.keys(module).forEach(name => {
                    let plugin = new module[name]();
                    plugin.name = name;
                    PluginService.PLUGINS.push(plugin);

                    this.log.info(`Plugin ${name} loaded.`);
                });
            });
        }

        return PluginService.PLUGINS;
    }

    public getPlugin(plugin: string) {
        return this.plugins.find(p => p.name === plugin);
    }

    public getPlugins() {
        return this.plugins;
    }

    public search(pluginName: string, params: SearchParameters) {
        let plugin = this.getPlugin(pluginName);
        if (!plugin) {
            return Promise.reject('Unknown plugin ' + pluginName);
        }

        let searchParams: SearchParameters  = {};
        plugin.searchParameters.forEach((param) => {
            if (params[param.name] === undefined) {
                if (param.default) {
                    searchParams[param.name] = param.default;
                } else if (param.required) {
                    return Promise.reject(`Missing parameter '${param.name}'.`);
                }
            } else if (param.type === 'STRING') {
                searchParams[param.name] = params[param.name];
            } else if (param.type === 'BOOLEAN') {
                searchParams[param.name] = params[param.name] === 'true';
            } else if (param.type === 'NUMBER') {
                searchParams[param.name] = parseInt(params[param.name].toString(), 10);
            } else if (param.type === 'DATE') {
                searchParams[param.name] = new Date(params[param.name].toString());
            } else if (param.type === 'LIST') {
                searchParams[param.name] = Array.isArray(params[param.name]) ?
                    params[param.name] :
                    params[param.name].toString().split(',');
            }
        });
        return plugin.search(searchParams);
    }

    public getDetails(plugin: string, searchResult: SearchResult) {
        return this.getPlugin(plugin).getDetails(searchResult);
    }

}
