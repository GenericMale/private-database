import {Injectable} from '@angular/core';
import {HttpClient, HttpParams} from '@angular/common/http';
import {DetailResult, Plugin, SearchParameters, SearchResult} from '../../../server/types';
import {from} from 'rxjs';
import {concatMap, toArray} from 'rxjs/operators';
import {ProgressService} from './progress.service';

@Injectable()
export class PluginService {

    constructor(private http: HttpClient,
                private progress: ProgressService) {
    }

    getPlugins() {
        return this.http.get<Plugin[]>(`./api/plugin/`);
    }

    search(plugin: string, params: SearchParameters) {
        let httpParams = new HttpParams();
        for (let [key, value] of Object.entries(params)) {
            if (value) {
                httpParams = httpParams.set(key, value.toString());
            }
        }

        return this.http.get<SearchResult[]>(`./api/plugin/${plugin}/search`,
            {params: httpParams}
        );
    }

    saveDetails(plugin: string, searchResults: SearchResult[], entry?: string) {
        let params = new HttpParams().set('skipProgress', 'true');
        if (entry) {
            params = params.set('entry', entry);
        }

        this.progress.show();
        return from([].concat(searchResults)).pipe(
            concatMap((s: SearchResult) => this.http.post(`./api/plugin/${plugin}/details`, s, {params, responseType: 'text'})),
            toArray(),
            this.progress.tapHide()
        );
    }
}
