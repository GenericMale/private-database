import 'reflect-metadata';
import {Container} from 'inversify';

import * as bodyParser from 'body-parser';
import * as express from 'express';
import * as hbs from 'hbs';
import * as i18n from 'i18n';
import {InversifyExpressServer} from 'inversify-express-utils';

import * as path from 'path';
import {AddressInfo} from 'net';
import * as log4js from 'log4js';
import * as ffmpeg from 'fluent-ffmpeg';

import * as services from './services';
import './controllers';
import * as config from './utils/config';
import * as handlebarsHelpers from 'handlebars-helpers';

process.env['NODE_CONFIG_DIR'] = process.cwd() + '/config/';

// set up logging
log4js.configure({
    appenders: {
        out: {type: 'console'},
    },
    categories: {
        default: {appenders: ['out'], level: 'trace'},
    },
});
let log = log4js.getLogger();

// set up ffmpeg
ffmpeg().getAvailableFormats((err) => {
    if (err) {
        ffmpeg().setFfmpegPath(path.join(process.cwd(), 'ffmpeg.exe'));
        ffmpeg().setFfprobePath(path.join(process.cwd(), 'ffprobe.exe'));
    }
});

// set up container
let container = new Container();

// set up bindings
Object.keys(services).forEach((service) => {
    container.bind((<any>services)[service]).toSelf();
});

// register some handy template helpers
const ignoredHelpers = ['year'];
Object.entries(handlebarsHelpers()).forEach(([helperName, helperFunction]) => {
    if (ignoredHelpers.indexOf(helperName) === -1) {
        hbs.registerHelper(helperName, helperFunction);
    }
});

// setup localization for templates
i18n.configure({
    locales: ['en', 'de', 'fr', 'zh', 'es', 'ru'],
    directory: path.join(__dirname, '/templates')
});
hbs.registerHelper('i18n', function (phrase, ...args) {
    const options = args.pop();
    if (!options) {
        return null;
    }

    const locale = options.hash.locale || options.data.root.getLocale();
    return i18n.__(locale ? {phrase, locale} : phrase, ...args, options.hash);
});

// create server
let server = new InversifyExpressServer(container, null, {rootPath: '/api'});
server.setConfig((app) => {
    app.use(bodyParser.urlencoded({extended: true}));
    app.use(bodyParser.json());
    app.use(express.static(path.join(__dirname, '../client')));
    app.use('/images', express.static(path.join(config.get('data.path', './.data'), 'images')));

    // setup rendering engine
    app.set('view engine', 'hbs');
    app.set('views', path.join(__dirname, '/templates'));
    app.use(i18n.init);
});

// error handling
server.setErrorConfig((app) => {
    app.use((err: any, req: express.Request, res: express.Response) => {
        let body = err;
        if (err instanceof Error) {
            body = {message: err.message, name: err.name, stack: err.stack};
        } else if (typeof err === 'string') {
            body = {message: err};
        }
        log.error(err);
        res.status(err.status || 500).json(body);
    });
});

let listener = server.build().listen(
    config.get('server.port', 80),
    config.get('server.address', '0.0.0.0'),
    () => {
        let address = listener.address() as AddressInfo;
        log.info(`Server started on http://${address.address}:${address.port}`);
    });
