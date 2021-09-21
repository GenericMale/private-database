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
            void DatabaseService.DATABASE.createIndex({
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

    public getLastChange(): Date {
        if (!DatabaseService.LAST_CHANGE) {
            this.updateLastChange();
        }

        return DatabaseService.LAST_CHANGE;
    }

    public async create(document: any, entry?: string): Promise<string> {
        document._id = new Date().getTime().toString() + '';
        document.$entry = entry || document._id;
        document.$updated = new Date();

        const result = await this.db.put(document);
        this.updateLastChange();
        return result.id;
    }

    public async getAll(fields?: string[]): Promise<any[]> {
        const result = await this.db.allDocs({include_docs: true});
        if ((<any>result).warning) {
            this.log.warn((<any>result).warning);
        }
        const docs = result.rows.map((row) => row.doc);

        const grouped = _.groupBy(docs, '$entry');
        const results: any = [];
        _.forOwn(grouped, (group) => {
            results.push(this.merge(group));
        });

        return results.filter((r: any) => r.$entry).map((r: any) => _.pick(r, ['$entry'].concat(fields)));
    }

    public async getFields(): Promise<string[]> {
        const result = await this.db.query('fields', {group: true});
        return result.rows.map(r => r.key)
    }

    public async get(entry: string, plugin?: string): Promise<any> {
        const result = await this.db.find({
            selector: {
                $entry: entry,
                $plugin: plugin
            }
        });
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
    }

    public async remove(entry: string, plugin?: string): Promise<Array<PouchDB.Core.Response | PouchDB.Core.Error >> {
        const result = await this.db.find({
            selector: {
                $entry: entry,
                $plugin: plugin
            }
        });
        this.updateLastChange();

        result.docs.forEach((d: any) => d['_deleted'] = true);
        return this.db.bulkDocs(result.docs);
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
