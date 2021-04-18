import {DetailResult, Plugin, SearchParameterDefinition, SearchParameters, SearchResult} from '../types';
import {config} from '../utils/config';
import * as ffmpeg from 'fluent-ffmpeg';
import * as path from 'path';
import * as fs from 'fs';

export class ScreenshotPlugin implements Plugin {

    @config('data.path', './.data')
    private dataPath: string;

    @config('screenshot.frames', 10)
    private frames: number;

    label = 'Screenshot';
    skipResults = true;

    searchParameters: SearchParameterDefinition[] = [{
        name: 'files',
        type: 'LIST',
        required: true
    }];

    search(params: SearchParameters): Promise<ScreenshotSearchResult[]> {
        return new Promise<ScreenshotSearchResult[]>((resolve) => {
            resolve([{
                files: params.files as string[]
            }]);
        });
    }

    getDetails(searchResult: ScreenshotSearchResult): Promise<ScreenshotDetailResult> {
        const files = searchResult.files;
        const count = Math.ceil(this.frames / files.length);

        const outPath = path.join(this.dataPath, 'images', 'screenshot');
        if (!fs.existsSync(outPath)) {
            fs.mkdirSync(outPath, {recursive: true});
        }

        const promises = files.map((file) => {
            return new Promise<string[]>((resolve, reject) => {
                ffmpeg(file).ffprobe((err, stat) => {
                    if (err) {
                        return reject(err);
                    }

                    let filename = path.basename(file, path.extname(file));
                    Promise.all(Array.from({length: count}, (v, i) => {
                        let time = Math.round((i + 0.5) * stat.format.duration / count);
                        let output = `${filename}_${i}.jpeg`;
                        return new Promise<string>((res, rej) => {
                            ffmpeg(file)
                                .setStartTime(time)
                                .videoFilter([{
                                    filter: 'select',
                                    options: 'eq(pict_type\\,I)'
                                }])
                                .frames(1)
                                .output(path.join(outPath, output))
                                .on('end', () => res(`./images/screenshot/${output}`))
                                .on('error', (e) => rej(e))
                                .run();
                        });
                    })).then((screenshots) => {
                        resolve(screenshots.filter(s => fs.existsSync(path.join(this.dataPath, s))));
                    }, (e) => reject(e));
                });
            });
        });

        return Promise.all(promises).then((screenshots) => ({
            files,
            screenshots: [].concat.apply([], screenshots)
        }));
    }
}

export interface ScreenshotSearchResult extends SearchResult {
    files: string[];
}

export interface ScreenshotDetailResult extends DetailResult {
    files: string[];
    screenshots: string[];
}
