import {controller, httpGet, httpPost, interfaces, queryParam, request, requestBody, requestParam} from 'inversify-express-utils';
import {inject} from 'inversify';
import * as express from 'express';
import {DatabaseService, PluginService} from '../services';
import {log} from '../utils/log';
import {Logger} from 'log4js';
import {Plugin, SearchResult} from '../types';

@controller('/plugin')
export class PluginController implements interfaces.Controller {

    @log()
    private log: Logger;

    @inject(PluginService)
    private pluginService: PluginService;

    @inject(DatabaseService)
    private dbService: DatabaseService;

    @httpGet('/')
    private getPlugins(): Plugin[] {
        return this.pluginService.getPlugins();
    }

    @httpGet('/:plugin')
    private getPlugin(@requestParam('plugin') plugin: string): Plugin {
        return this.pluginService.getPlugin(plugin);
    }

    @httpGet('/:plugin/search')
    public search(@requestParam('plugin') plugin: string,
                  @request() req: express.Request): Promise<SearchResult[]> {
        return this.pluginService.search(plugin, req.query as any);
    }

    @httpPost('/:plugin/details')
    public saveDetails(@requestParam('plugin') plugin: string,
                       @requestBody() searchResult: SearchResult,
                       @queryParam('entry') entry?: string): Promise<string> {
        return this.pluginService.getDetails(plugin, searchResult).then((details) => {
            details.$plugin = plugin;
            return this.dbService.create(details, entry);
        });
    }

}
