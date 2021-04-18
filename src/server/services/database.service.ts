import {injectable} from 'inversify';
import config from '../utils/config';
import * as path from 'path';

import * as PouchDB from 'pouchdb';
import * as PouchDBFind from 'pouchdb-find';
import {log} from '../utils/log';
import {Logger} from 'log4js';
import * as _ from 'lodash';

@injectable()
export class DatabaseService {

    private static DATABASE: PouchDB.Database;

    private static LAST_CHANGE: Date;

    @log()
    private log: Logger;

    @config('data.path', './.data')
    private dataPath: string;

    private get db() {
        if (!DatabaseService.DATABASE) {
            this.updateLastChange();

            PouchDB.plugin(PouchDBFind);
            DatabaseService.DATABASE = new PouchDB(path.resolve(process.cwd(), this.dataPath, 'db'));
            DatabaseService.DATABASE.createIndex({
                index: {
                    fields: ['$entry', '$plugin']
                }
            });

            DatabaseService.DATABASE.put({
                _id: '_design/fields',
                views: {
                    fields: {
                        map: `function(doc) {
                            Object.keys(doc).forEach(key => emit(key, null));
                        }`,
                        reduce: `function() {
                            return true;
                        }`
                    }
                }
            }).catch(() => {
                // ignore
            });
        }
        return DatabaseService.DATABASE;
    }

    public getLastChange() {
        if (!DatabaseService.LAST_CHANGE) {
            this.updateLastChange();
        }

        return DatabaseService.LAST_CHANGE;
    }

    public create(document: any, entry?: string) {
        document._id = new Date().getTime() + '';
        document.$entry = entry || document._id;
        document.$updated = new Date();
        return this.db.put(document).then((result) => {
            this.updateLastChange();
            return result.id;
        });
    }

    public getAll(fields?: string[]) {
        return this.db.allDocs({
            include_docs: true
        }).then((result) => {
            if ((<any>result).warning) {
                this.log.warn((<any>result).warning);
            }
            let docs = result.rows.map((row) => row.doc);

            let grouped = _.groupBy(docs, '$entry');
            let results: any = [];
            _.forOwn(grouped, (group) => {
                results.push(this.merge(group));
            });

            return results.filter((r: any) => r.$entry).map((r: any) => _.pick(r, ['$entry'].concat(fields)));
        });
    }

    public getFields() {
        return this.db.query('fields', {
            group: true
        }).then((result) =>
            result.rows.map(r => r.key)
        );
    }

    public get(entry: string, plugin?: string) {
        return this.db.find({
            selector: {
                $entry: entry,
                $plugin: plugin
            }
        }).then((result) => {
            if ((<any>result).warning) {
                this.log.warn((<any>result).warning);
            }
            if (result.docs.length === 0) {
                return Promise.reject({status: 404});
            } else if (result.docs.length === 1) {
                return result.docs[0];
            } else {
                return this.merge(result.docs);
            }
        });
    }

    public remove(entry: string, plugin?: string) {
        return this.db.find({
            selector: {
                $entry: entry,
                $plugin: plugin
            }
        }).then((result) => {
            this.updateLastChange();

            result.docs.forEach((d: any) => d['_deleted'] = true);
            return this.db.bulkDocs(result.docs);
        });
    }

    private merge(data: any[]) {
        data.push((a: any, b: any, k: string) => {
            if (_.isArray(a)) {
                return _.uniq(a.concat(b));
            } else if (k === '$plugin' || k.indexOf('_') === 0) {
                return [a].concat(b);
            }
        });
        _.assignWith.apply(null, data);
        return data[0];
    }

    private updateLastChange() {
        DatabaseService.LAST_CHANGE = new Date();
        DatabaseService.LAST_CHANGE.setMilliseconds(0);
    }

}
