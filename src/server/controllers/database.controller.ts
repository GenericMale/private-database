import {
    controller,
    httpDelete,
    httpGet,
    httpPost,
    interfaces,
    queryParam,
    request,
    requestBody,
    requestParam,
    response
} from 'inversify-express-utils';
import {inject} from 'inversify';
import {DatabaseService} from '../services';
import {DetailResult, Entry} from '../types';
import * as express from 'express';

@controller('/db')
export class DatabaseController implements interfaces.Controller {

    @inject(DatabaseService)
    private dbService: DatabaseService;

    @httpGet('/')
    public async list(@request() req: express.Request,
                @response() res: express.Response,
                @queryParam('field') fields: string[] | string): Promise<Entry[]> {
        if (this.isModified(req, res)) {
            return this.dbService.getAll(this.toArray(fields));
        }
    }

    @httpGet('/fields')
    public async getFields(@request() req: express.Request,
                     @response() res: express.Response): Promise<string[]> {
        if (this.isModified(req, res)) {
            return this.dbService.getFields();
        }
    }

    @httpGet('/:id')
    private async get(@request() req: express.Request,
                @response() res: express.Response,
                @requestParam('id') id: string,
                @queryParam('plugin') plugin?: string): Promise<Entry> {
        if (this.isModified(req, res)) {
            return this.dbService.get(id, plugin);
        }
    }

    @httpGet('/:id/:template.html')
    private async getPage(@request() req: express.Request,
                          @response() res: express.Response,
                          @requestParam('id') id: string,
                          @requestParam('template') template: string,
                          @queryParam('plugin') plugin?: string): Promise<string> {
        if (this.isModified(req, res)) {
            const data = await this.dbService.get(id, plugin);
            return this.render(res, template, data);
        }
    }

    @httpDelete('/:id')
    private async remove(@requestParam('id') id: string,
                   @queryParam('plugin') plugin?: string): Promise<void> {
        await this.dbService.remove(id, plugin);
    }

    @httpPost('/')
    public async save(@requestBody() details: DetailResult,
                @queryParam('entry') entry?: string): Promise<string> {
        return this.dbService.create(details, entry);
    }

    private async render(res: express.Response, template: string, options = {}) {
        return new Promise<string>((resolve, reject) => {
            res.render(template, options, (err, compiled) => {
                if (err) {
                    reject(err);
                }
                resolve(compiled);
            });
        });
    }

    private toArray(val: string[] | string) {
        return val ? [].concat(val) : [];
    }

    private isModified(req: express.Request, res: express.Response) {
        const ifModifiedSince = req.header('If-Modified-Since');
        const since = new Date(ifModifiedSince);
        const dbChange = this.dbService.getLastChange();

        if (!ifModifiedSince || since < dbChange) {
            res.setHeader('Last-Modified', dbChange.toUTCString());
            return true;
        } else {
            res.status(304).send();
            return false;
        }
    }

}
