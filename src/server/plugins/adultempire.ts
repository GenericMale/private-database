import {downloadImage, load} from '../utils/http';
import * as url from 'url';
import * as moment from 'moment';
import cheerio from 'cheerio';
import {DetailResult, Plugin, SearchParameterDefinition, SearchParameters, SearchResult} from '../types';
import {config} from '../utils/config';
import * as path from 'path';
import * as fs from 'fs';

const BASE_URL = 'https://www.adultempire.com/dvd/search?view=list&q=';

export class AdultEmpirePlugin implements Plugin {

    @config('data.path', './.data')
    private dataPath: string;

    label = 'Adult Empire';

    searchParameters: SearchParameterDefinition[] = [{
        name: 'title',
        type: 'STRING',
        required: true
    }];

    search(params: SearchParameters): Promise<AdultEmpireSearchResult[]> {
        return load(BASE_URL + params.title).then(($) => {
            let titles: AdultEmpireSearchResult[] = [];
            $('.item-list .list-view-item').each((i, e) => {
                let $$ = $(e);
                titles.push({
                    urls: [url.resolve(BASE_URL, $$.find('h3 a').attr('href'))],
                    title: $$.find('h3 a').text().trim(),
                    year: parseInt($$.find('h3 small').eq(1).text().replace(/[()]/g, ''), 10),
                    distributor: this.getSearchField($$, 'studio'),
                    actors: $$.find('a[label^="Performer "]').map((ii, ee) => $(ee).attr('title')).get(),
                    // releaseDate: moment(this.getSearchField($$, 'released'), 'MM/DD/YYYY').toDate(),
                    // length: this.getSearchField($$, 'run time'),
                    // directors: [this.getSearchField($$, 'directed by')],
                    // poster: [url.resolve(BASE_URL, $$.find('.boxcover').attr('href'))],
                });
            });
            return titles;
        });
    }

    getDetails(searchResult: AdultEmpireSearchResult): Promise<AdultEmpireDetailResult> {
        const outPath = path.join(this.dataPath, 'images', 'adultempire');
        if (!fs.existsSync(outPath)) {
            fs.mkdirSync(outPath, {recursive: true});
        }

        return load(searchResult.urls[0]).then(($) => {
            const details = {
                urls: searchResult.urls,
                title: searchResult.title,
                year: parseInt(this.getField($, 'Production Year:'), 10),
                distributor: $(`small:contains("Studio: ")`).next().text().trim(),
                actors: $('a[label="Performer"]').map((i, e) => $(e).text().trim()).get(),
                genre: $('.list-unstyled a[label="Category"]').map((i, e) => $(e).text().trim()).get(),
                releaseDate: moment(this.getField($, 'Released:'), 'MMM DD YYYY').toDate(),
                synopsis: $('.synopsis').text().trim(),
                poster: '',
                directors: $('a[label="Director"]').map((i, e) => $(e).text().trim()).get(),
            };

            const posterUrl = [$('#front-cover').data('href'), $('#back-cover').attr('href')].toString();
            const fileName = posterUrl.split('/').pop().split('?')[0];
            const filePath = path.join(outPath, fileName);

            return downloadImage(posterUrl, filePath).then(() => {
                details.poster = `./images/adultempire/${fileName}`;
                return details;
            });
        });
    }

    private getSearchField($: cheerio.Cheerio, name: string): string {
        const field = $.find(`small:contains("${name}")`);
        return field && field.length > 0 ? field[0].nextSibling.nodeValue.trim() : undefined;
    }

    private getField($: cheerio.Root, name: string): string {
        const field = $(`small:contains("${name}")`);
        return field && field.length > 0 ? field[0].nextSibling.nodeValue.trim() : undefined;
    }
}

export interface AdultEmpireSearchResult extends SearchResult {
    urls: string[];
    title: string;
    year: number;
    distributor: string;
    actors: string[];
}

export interface AdultEmpireDetailResult extends DetailResult {
    urls: string[];
    title: string;
    year: number;
    distributor: string;
    actors: string[];
    genre: string[];
    releaseDate: Date;
    synopsis: string;
    poster: string;
    directors: string[];
}
