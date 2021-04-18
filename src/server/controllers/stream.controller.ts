import {controller, httpGet, interfaces, requestHeaders, requestParam, response} from 'inversify-express-utils';
import * as express from 'express';
import {log} from '../utils/log';
import {Logger} from 'log4js';
import * as fs from 'fs';
import {inject} from 'inversify';
import {DatabaseService} from '../services';
import * as mime from 'mime-types';
import * as path from 'path';

@controller('/stream')
export class StreamController implements interfaces.Controller {

    @log()
    private log: Logger;

    @inject(DatabaseService)
    private dbService: DatabaseService;

    @httpGet('/:id/:index')
    private async getStream(@requestParam('id') id: string,
                       @requestParam('index') index: number,
                       @requestHeaders('range') range: string,
                       @response() res: express.Response) {
        const details = await this.dbService.get(id);
        if (!details || !details.files || details.files.length <= index) {
            return res.status(404).send();
        }

        const filePath = details.files[index];
        const stat = fs.statSync(filePath);
        const fileSize = stat.size;
        if (range) {
            const parts = range.replace(/bytes=/, '').split('-');
            const start = parseInt(parts[0], 10);
            const end = parts[1]
                ? parseInt(parts[1], 10)
                : fileSize - 1;
            const chunkSize = (end - start) + 1;
            const file = fs.createReadStream(filePath, {start, end});
            const head = {
                'Content-Range': `bytes ${start}-${end}/${fileSize}`,
                'Accept-Ranges': 'bytes',
                'Content-Length': chunkSize,
                'Content-Type': mime.lookup(filePath) || 'video/mp4',
                'Content-Disposition': `inline; filename="${path.basename(filePath)}"`
            };
            res.writeHead(206, head);
            file.pipe(res);
        } else {
            const head = {
                'Content-Length': fileSize,
                'Content-Type': mime.lookup(filePath) || 'video/mp4',
                'Content-Disposition': `inline; filename="${path.basename(filePath)}"`
            };
            res.writeHead(200, head);
            fs.createReadStream(filePath).pipe(res);
        }
    }

}
