import puppeteerExtra from 'puppeteer-extra';
import AdblockerPlugin from 'puppeteer-extra-plugin-adblocker';
const StealthPlugin = require('puppeteer-extra-plugin-stealth');

import * as puppeteer from 'puppeteer';
import * as cheerio from 'cheerio';
import * as fs from 'fs/promises';

let browser: puppeteer.Browser;

async function newPage() {
    if (!browser) {
        puppeteerExtra.use(AdblockerPlugin()).use(StealthPlugin());
        browser = await puppeteerExtra.launch();
    }
    return await browser.newPage();
}

export async function load(target: string): Promise<cheerio.Root> {
    let page = await newPage();
    await page.goto(target);
    let content = await page.content();
    await page.close();

    return cheerio.load(content);
}

export async function downloadImage(target: string, filePath: string): Promise<string> {
    let page = await newPage();
    let viewSource = await page.goto(target);
    let buffer = await viewSource.buffer();
    await fs.writeFile(filePath, buffer);
    await page.close();

    return filePath;
}

export default load;
