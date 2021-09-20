import {load} from '../utils/http';
import * as url from 'url';
import * as moment from 'moment';
import * as _ from 'lodash';
import cheerio from 'cheerio';
import {DetailResult, Plugin, SearchParameterDefinition, SearchParameters, SearchResult} from '../types';

const BASE_URL = 'https://www.iafd.com/results.asp?searchtype=comprehensive&searchstring=';

export class IAFDPlugin implements Plugin {

    label = 'Internet Adult Film Database';

    searchParameters: SearchParameterDefinition[] = [{
        name: 'title',
        type: 'STRING',
        required: true
    }];

    search(params: SearchParameters): Promise<IAFDSearchResult[]> {
        return load(BASE_URL + params.title).then(($) => {
            let titles: IAFDSearchResult[] = [];
            $('#titleresult').find('tbody tr').each((i, e) => {
                let $$ = $(e);
                let aka = $$.find('td').eq(3).text();
                titles.push({
                    urls: [url.resolve(BASE_URL, $$.find('a').eq(0).attr('href'))],
                    title: $$.find('a').eq(0).text(),
                    year: parseInt($$.find('td').eq(1).text(), 10),
                    distributor: $$.find('td').eq(2).text(),
                    aka: aka.length > 0 ? aka.split(' / ') : undefined
                });
            });
            return titles;
        });
    }

    getDetails(searchResult: IAFDSearchResult): Promise<IAFDDetailResult> {
        return load(searchResult.urls[0] as string).then(($) => {
            let heading = /(.*) \((\d*)\)/.exec($('h1').text());
            let date = moment(this.getBioText($, 'Release Date'), 'MMM DD, YYYY');

            const genre = _.uniq($('.castbox p').map((i, e) => {
                let g = $(e).children()[1].next.data;
                return g ? g.trim().split(' ') : undefined;
            }).get());

            if (this.getBioText($, 'All-Girl') === 'Yes') {
                genre.push('All-Girl');
            }
            if (this.getBioText($, 'All-Male') === 'Yes') {
                genre.push('All-Male');
            }
            if (this.getBioText($, 'Compilation') === 'Yes') {
                genre.push('Compilation');
            }
            if (this.getBioText($, 'Webscene') === 'Yes') {
                genre.push('Webscene');
            }

            return {
                urls: searchResult.urls,
                title: heading[1],
                year: parseInt(heading[2], 10),
                distributor: this.getBioText($, 'Distributor'),
                actors: $('.castbox a').map((i, e) => $(e).text()).get(),
                genre,
                releaseDate: date.isValid() ? date.toDate() : undefined,
                synopsis: $('#synopsis li').text() || undefined,
                directors: this.getBio($, 'Director').find('a').map((i, e) => $(e).text().replace(/ \(as .*/, '')).get(),
                length: parseInt(this.getBioText($, 'Minutes'), 10) || undefined,
                studio: this.getBioText($, 'Studio'),
                tagline: $('#sceneinfo li').map((i, e) => $(e).text().substr($(e).text().indexOf('. ') + 2)).get(),

            };
        });
    }

    private getBioText($: cheerio.Root, name: string): string {
        return this.getBio($, name).text() || undefined;
    }

    private getBio($: cheerio.Root, name: string) {
        return $(`.bioheading:contains(${name})`).next('.biodata');
    }
}

export interface IAFDSearchResult extends SearchResult {
    urls: string[];
    title: string;
    year: number;
    distributor: string;
    aka: string[];
}

export interface IAFDDetailResult extends DetailResult {
    urls: string[];
    title: string;
    year: number;
    distributor: string;
    // TODO: aka: string[];
    actors: string[];
    genre: string[];
    releaseDate: Date;
    synopsis: string;
    directors: string[];
    length: number;
    studio: string;
    tagline: string[];
}
