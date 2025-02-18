import chalk from 'chalk';
import fs from 'fs';
import { chromium } from 'playwright';

class PageAnalyzer {
    constructor(url) {
        this.url = url;
    }

    async analyze() {
        try {
            const browser = await chromium.launch({ headless: true });
            const page = await browser.newPage();
            await page.goto(this.url, { waitUntil: 'domcontentloaded' });

            const forms = await page.$$('form');
            const buttons = await page.$$('button');
            const links = await page.$$('a');

            await browser.close();
            return { forms: forms.length, buttons: buttons.length, links: links.length };
        } catch (error) {
            console.error(chalk.red(`Error analyzing page: ${error.message}`));
            return null;
        }
    }
}

class ApiAnalyzer {
    constructor(url) {
        this.url = url;
        this.requests = [];
    }

    async analyze() {
        try {
            const browser = await chromium.launch({ headless: true });
            const page = await browser.newPage();

            page.on('request', request => {
                this.requests.push({
                    url: request.url(),
                    method: request.method(),
                    headers: request.headers(),
                });
            });

            await page.goto(this.url, { waitUntil: 'networkidle' });
            await browser.close();
            return this.requests;
        } catch (error) {
            console.error(chalk.red(`Error analyzing API: ${error.message}`));
            return null;
        }
    }
}

class PerformanceAnalyzer {
    constructor(url) {
        this.url = url;
    }

    async analyze() {
        try {
            const browser = await chromium.launch({ headless: true });
            const page = await browser.newPage();
            
            const start = Date.now();
            await page.goto(this.url, { waitUntil: 'load' });
            const loadTime = Date.now() - start;
            
            await browser.close();
            return { loadTime: `${loadTime}ms` };
        } catch (error) {
            console.error(chalk.red(`Error analyzing performance: ${error.message}`));
            return null;
        }
    }
}

class SecurityAnalyzer {
    constructor(url) {
        this.url = url;
        this.securityWarnings = [];
    }

    async analyze() {
        try {
            const browser = await chromium.launch({ headless: true });
            const page = await browser.newPage();

            page.on('response', response => {
                if (response.url().startsWith('http://')) {
                    this.securityWarnings.push({
                        url: response.url(),
                        warning: 'Insecure HTTP request'
                    });
                }
            });

            await page.goto(this.url, { waitUntil: 'networkidle' });
            await browser.close();
            return this.securityWarnings;
        } catch (error) {
            console.error(chalk.red(`Error analyzing security: ${error.message}`));
            return null;
        }
    }
}

class ReportGenerator {
    constructor() {
        this.report = {
            timestamp: new Date().toISOString(),
            results: []
        };
    }

    addResult(result) {
        this.report.results.push(result);
    }

    saveReport(filename = 'report.json') {
        fs.writeFileSync(filename, JSON.stringify(this.report, null, 2));
        console.log(chalk.green(`\n Report saved as ${filename}\n`));
    }
}

async function testWebsite(url) {
    console.log(chalk.blue(`\n Testing website: ${url}\n`));
    
    const pageAnalyzer = new PageAnalyzer(url);
    const apiAnalyzer = new ApiAnalyzer(url);
    const performanceAnalyzer = new PerformanceAnalyzer(url);
    const securityAnalyzer = new SecurityAnalyzer(url);
    
    const elements = await pageAnalyzer.analyze();
    const apiResults = await apiAnalyzer.analyze();
    const performanceResults = await performanceAnalyzer.analyze();
    const securityResults = await securityAnalyzer.analyze();
    
    const report = new ReportGenerator();
    report.addResult({ url, elements, apiResults, performanceResults, securityResults });
    report.saveReport();

    console.log(chalk.yellow('\n Test Summary:\n'));
    console.table({ elements, performanceResults });
    console.log(chalk.cyan(`\n Found ${securityResults.length} security warnings.`));
}

const args = process.argv.slice(2);
if (args.length < 1) {
    console.log(chalk.red('Usage: node main.js <https://www.flipkart.com/>'));
    process.exit(1);
}

testWebsite(args[0]);
