import * as puppeteer from 'puppeteer';
import * as cheerio from 'cheerio';
import * as fs from 'fs/promises';

let page: puppeteer.Page;

export async function goto(target: string): Promise<puppeteer.HTTPResponse | null> {
    if (!page || page.isClosed()) {
        const browser = await puppeteer.launch({headless: false, ignoreHTTPSErrors: true});
        page = (await browser.pages())[0];
        await page.setRequestInterception(true);
        page.on('request', (request) => {
            void (request.resourceType() === 'document' ? request.continue() : request.abort());
        });
    }
    return page.goto(target);
}

export async function load(target: string): Promise<cheerio.CheerioAPI> {
    const response = await goto(target);
    const content = await response.text();
    return cheerio.load(content);
}

export async function downloadImage(target: string, filePath: string): Promise<string> {
    const response = await goto(target);
    const buffer = await response.buffer();
    await fs.writeFile(filePath, buffer);
    return filePath;
}

export default load;
