import {Injectable} from '@angular/core';
import {HttpClient, HttpParams} from '@angular/common/http';
import {Entry} from '../../../server/types';
import {from} from 'rxjs';
import {concatMap, toArray} from 'rxjs/operators';
import {ProgressService} from './progress.service';

@Injectable()
export class DatabaseService {

    constructor(private http: HttpClient,
                private progress: ProgressService) {
    }

    list(fields: string[]) {
        return this.http.get<Entry[]>(`./api/db/`,
            {params: {field: fields}}
        );
    }

    getFields() {
        return this.http.get<string[]>(`./api/db/fields`);
    }

    get(id: string, plugin?: string) {
        let params = new HttpParams().set('skipProgress', 'true');
        if (plugin) {
            params = params.set('plugin', plugin);
        }

        return this.http.get<Entry>(`./api/db/${id}`, {params});
    }

    getPage(id: string, template: string, plugin?: string) {
        let params = new HttpParams().set('skipProgress', 'true');
        if (plugin) {
            params = params.set('plugin', plugin);
        }

        return this.http.get(`./api/db/${id}/${template}.html`, {params, responseType: 'text'});
    }

    remove(entries: Entry[]) {
        this.progress.show();
        return from(entries).pipe(
            concatMap(entry => this.http.delete(`./api/db/${entry.$entry}`)),
            toArray(),
            this.progress.tapHide()
        );
    }
}
