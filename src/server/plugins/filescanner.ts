import * as glob from 'glob';
import * as path from 'path';
import * as _ from 'lodash';
import * as namedRegExp from 'named-js-regexp';
import * as ffmpeg from 'fluent-ffmpeg';
import {log} from '../utils/log';
import {config} from '../utils/config';
import {Logger} from 'log4js';
import {DetailResult, Plugin, SearchParameterDefinition, SearchParameters, SearchResult} from '../types';

export class FileScannerPlugin implements Plugin {

    @log()
    private log: Logger;

    @config('filescanner.replacements', {})
    private replacements: { [key: string]: string };

    @config('filescanner.separator', null)
    private separator: string;

    @config('filescanner.extensions', [])
    private extensions: string[];

    @config('filescanner.regex', ['.*/(?<title>.*)\\..*'])
    private regex: string[];

    @config('filescanner.grouping', 'title')
    private grouping: string;

    @config('filescanner.directory', __dirname)
    private defaultDir: string;

    label = 'File Scanner';

    searchParameters: SearchParameterDefinition[] = [{
        name: 'directory',
        type: 'STRING',
        required: true,
        // @ts-ignore
        default: this.defaultDir
    }, {
        name: 'title',
        type: 'STRING',
        required: false
    }];

    search(params: SearchParameters): Promise<FileScannerSearchResult[]> {
        return new Promise((resolve) => {
            const pattern = params.title ? `**/*${params.title}*` : '**/*';
            glob(pattern, {cwd: params.directory as string, nodir: true, absolute: true, nocase: true}, (err, files) => {
                let results = files
                    .filter((file) =>
                        this.extensions.length === 0 || this.extensions.indexOf(path.extname(file).substr(1)) !== -1
                    )
                    .map((file) => this.parseFileName(file)).filter((v) => v !== null);
                if (this.grouping) {
                    let grouped = _.groupBy(results, this.grouping as string);
                    results = [];
                    _.forOwn(grouped, (group) => {
                        results.push(this.merge(group));
                    });
                }
                resolve(results);
            });
        });
    }

    getDetails(searchResult: FileScannerSearchResult): Promise<FileScannerDetailResult> {
        let promises = searchResult.files.map((file) => {
            return new Promise((resolve, reject) => {
                ffmpeg(file).ffprobe((err, stat) => {
                    if (err) {
                        return reject(err);
                    }

                    let audio = stat.streams && stat.streams.find((stream) => stream.codec_type === 'audio');
                    let video = stat.streams && stat.streams.find((stream) => stream.codec_type === 'video');
                    resolve(Object.assign(searchResult, {
                        duration: Math.round(stat.format.duration),
                        size: stat.format.size,
                        bitrate: stat.format.bit_rate,
                        videoCodec: video && video.codec_name,
                        videoWidth: video && video.width,
                        videoHeight: video && video.height,
                        audioCodec: audio && audio.codec_name
                    }));
                });
            });
        });

        return Promise.all(promises).then((results: any[]) => {
            return Object.assign(this.merge(results), {
                duration: _.sumBy(results, 'duration'),
                size: _.sumBy(results, 'size'),
                bitrate: _.meanBy(results, 'bitrate')
            });
        });
    }

    private parseFileName(file: string) {
        file = file.replace(/\\/g, '/'); // always use forward slashes
        let result: FileScannerSearchResult = {
            files: [file]
        };

        let groups;
        for (let i = 0; i < this.regex.length && !groups; i++) {
            groups = namedRegExp(this.regex[i]).execGroups(file);
        }
        if (!groups) {
            return null;
        }

        _.forOwn(groups, (v, k) => {
            if (v === null || v === undefined || v.length === 0) {
                return;
            }

            _.forOwn(this.replacements, (to, from) => {
                v = v.replace(new RegExp(from, 'g'), to);
            });

            if (/_$/.test(k) && this.separator) {
                result[k.slice(0, -1)] = v.length > 0 ? v.split(this.separator) : undefined;
            } else if (/\$$/.test(k)) {
                result[k.slice(0, -1)] = parseInt(v, 10) || undefined;
            } else {
                result[k] = v;
            }
        });

        return result;
    }

    private merge(data: any[]) {
        data.push((a: any, b: any) => _.isArray(a) ? _.uniq(a.concat(b)) : a);
        _.assignWith.apply(null, data);
        return data[0];
    }
}

export interface FileScannerSearchResult extends SearchResult {
    files: string[];
}

export interface FileScannerDetailResult extends DetailResult {
    files: string[];
    duration: number;
    size: number;
    bitrate: number;
    videoCodec: string;
    videoWidth: number;
    videoHeight: number;
    audioCodec: string;
}
