import * as request from 'request';
import * as cheerio from 'cheerio';
import * as fs from 'fs';

export function load(url: string): Promise<cheerio.Root> {
    return new Promise((resolve, reject) => {
        request.get(url, {
            gzip: true,
            headers: {
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                'Accept-Encoding': 'gzip',
                'Connection': 'keep-alive',
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:61.0) Gecko/20100101 Firefox/61.0'
            }
        }, (error, response, body) => {
            resolve(cheerio.load(body));
        });
    });
}

export function downloadImage(url: string, filePath: string): Promise<string> {
    let file = fs.createWriteStream(filePath);
    return new Promise((resolve, reject) => {
        request.get(url, {
            gzip: true,
            headers: {
                'Accept': 'image/webp,*/*',
                'Accept-Encoding': 'gzip',
                'Connection': 'keep-alive',
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:61.0) Gecko/20100101 Firefox/61.0'
            }
        })
            .pipe(file)
            .on('finish', () => resolve(filePath))
            .on('error', (err) => reject(err));
    });
}

export default load;
