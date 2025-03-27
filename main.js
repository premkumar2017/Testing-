import chalk from 'chalk';
import fs from 'fs';
import { chromium } from 'playwright';
import lighthouse from 'lighthouse';
import { launch } from 'chrome-launcher';
import Table from 'cli-table3';

// ✅ Log the URL being tested
console.log(chalk.blue(`🔍 Testing website URL: ${process.argv[2] || 'No URL Provided'}`));

class APITester {
    constructor() {
        this.apiRequests = [];
    }

    async captureRequests(page) {
        // Enable request interception
        await page.route('**', (route) => {
            const request = route.request();
            this.apiRequests.push({
                method: request.method(),
                url: request.url(),
                status: 'pending',
                timestamp: new Date().toISOString()
            });
            route.continue();
        });

        // Capture responses
        page.on('response', async (response) => {
            const request = this.apiRequests.find(req => 
                req.url === response.url() && req.status === 'pending'
            );
            if (request) {
                request.status = response.status();
                try {
                    request.response = {
                        headers: response.headers(),
                        body: await response.text().catch(() => 'Unable to parse response')
                    };
                    request.validation = {
                        isSecure: response.url().startsWith('https://'),
                        hasCacheHeaders: !!response.headers()['cache-control'],
                        isJson: response.headers()['content-type']?.includes('application/json'),
                        responseTime: Date.now() - new Date(request.timestamp).getTime()
                    };
                } catch (error) {
                    console.error(chalk.yellow(`⚠️ Failed to process response for ${request.url}: ${error.message}`));
                }
            }
        });
    }

    getResults() {
        return this.apiRequests;
    }
}

class PageAnalyzer {
    constructor(url) { this.url = url; }

    async analyze() {
        let browser;
        try {
            browser = await chromium.launch({ headless: true });
            const page = await browser.newPage();
            await page.goto(this.url, { waitUntil: 'domcontentloaded' });

            const getElementCount = async (selector) => {
                try {
                    return (await page.$$(selector)).length;
                } catch (error) {
                    console.error(chalk.yellow(`⚠️ Could not count elements for selector "${selector}": ${error.message}`));
                    return 0;
                }
            };

            const getMetaContent = async (selector) => {
                try {
                    return await page.$eval(selector, el => el.content);
                } catch (error) {
                    console.error(chalk.yellow(`⚠️ Could not retrieve meta content for selector "${selector}": ${error.message}`));
                    return "No meta description found.";
                }
            };

            const result = {
                forms: await getElementCount('form'),
                buttons: await getElementCount('button'),
                links: await getElementCount('a'),
                images: await getElementCount('img'),
                headings: await page.$$eval('h1, h2, h3', nodes => nodes.map(node => node.textContent.trim())).catch(() => []),
                metaDescription: await getMetaContent('meta[name="description"]')
            };

            await browser.close();
            return result;
        } catch (error) {
            console.error(chalk.red(`❌ Page analysis failed: ${error.message}`));
            return null;
        }
    }
}

async function responsiveTest(url) {
    let browser;
    try {
        browser = await chromium.launch({ headless: true });
        const viewports = [
            { name: 'Mobile', width: 375, height: 812 },
            { name: 'Tablet', width: 768, height: 1024 },
            { name: 'Desktop', width: 1366, height: 768 }
        ];

        for (const viewport of viewports) {
            const page = await browser.newPage();
            await page.setViewportSize({ width: viewport.width, height: viewport.height });

            try {
                await page.goto(url, { waitUntil: 'domcontentloaded' });
                console.log(chalk.green(`✅ Loaded ${url} on ${viewport.name}`));

                if (await page.locator('img[alt="Logo"]').isVisible().catch(() => false)) {
                    console.log(chalk.green(`✅ Logo is visible on ${viewport.name}`));
                }

                await page.screenshot({ path: `screenshot-${viewport.name}.png`, fullPage: true });
                console.log(chalk.yellow(`📸 Screenshot saved: screenshot-${viewport.name}.png`));
            } catch (error) {
                console.error(chalk.red(`❌ Failed to load or analyze ${url} on ${viewport.name}: ${error.message}`));
            } finally {
                await page.close();
            }
        }
    } catch (error) {
        console.error(chalk.red(`❌ Responsive test failed: ${error.message}`));
    } finally {
        if (browser) await browser.close();
    }
}

class LighthouseAnalyzer {
    constructor(url) { this.url = url; }

    async analyze() {
        let chrome;
        try {
            chrome = await launch({ chromeFlags: ['--headless'] });
            const options = { 
                logLevel: 'info', 
                output: 'json', 
                onlyCategories: ['performance', 'accessibility', 'best-practices', 'seo'], 
                port: chrome.port 
            };
            const result = await lighthouse(this.url, options);

            return {
                performance: result.lhr.categories.performance.score * 100,
                accessibility: result.lhr.categories.accessibility.score * 100,
                bestPractices: result.lhr.categories['best-practices'].score * 100,
                seo: result.lhr.categories.seo.score * 100,
            };
        } catch (error) {
            console.error(chalk.red(`❌ Lighthouse analysis failed: ${error.message}`));
            return null;
        } finally {
            if (chrome) await chrome.kill();
        }
    }
}

class SecurityAnalyzer {
    constructor(url) { this.url = url; }

    async analyze() {
        let browser;
        try {
            browser = await chromium.launch({ headless: true });
            const page = await browser.newPage();
            await page.goto(this.url);

            const sqlInjectionResult = await this.testSQLInjection(page).catch(error => `Error: ${error.message}`);
            console.log(chalk.yellow(`🔒 SQL Injection Test: ${sqlInjectionResult}`));

            const xssResult = await this.testXSS(page).catch(error => `Error: ${error.message}`);
            console.log(chalk.yellow(`🔒 XSS Test: ${xssResult}`));

            const authResult = await this.testAuthentication(page).catch(error => `Error: ${error.message}`);
            console.log(chalk.yellow(`🔒 Authentication Test: ${authResult}`));

            const encryptionResult = await this.testDataEncryption(page).catch(error => `Error: ${error.message}`);
            console.log(chalk.yellow(`🔒 Data Encryption Test: ${encryptionResult}`));

            return {
                sqlInjection: sqlInjectionResult,
                xss: xssResult,
                authentication: authResult,
                dataEncryption: encryptionResult
            };
        } catch (error) {
            console.error(chalk.red(`❌ Security analysis failed: ${error.message}`));
            return null;
        } finally {
            if (browser) await browser.close();
        }
    }

    async testSQLInjection(page) {
        const inputSelector = 'input[type="text"], input[type="email"], input[type="password"]';
        const inputs = await page.$$(inputSelector);
        if (inputs.length === 0) return "No input fields found.";

        const payload = "' OR '1'='1";
        for (const input of inputs) {
            await input.fill(payload);
        }

        const submitButton = await page.$('button[type="submit"]');
        if (submitButton) {
            await submitButton.click();
            await page.waitForNavigation();
        }

        const currentUrl = page.url();
        if (currentUrl.includes('error') || currentUrl.includes('sql')) {
            return "Vulnerable to SQL Injection";
        }
        return "No SQL Injection vulnerability detected";
    }

    async testXSS(page) {
        const inputSelector = 'input[type="text"], input[type="email"], input[type="password"]';
        const inputs = await page.$$(inputSelector);
        if (inputs.length === 0) return "No input fields found.";

        const payload = '<script>alert("XSS")</script>';
        for (const input of inputs) {
            await input.fill(payload);
        }

        const submitButton = await page.$('button[type="submit"]');
        if (submitButton) {
            await submitButton.click();
            await page.waitForNavigation();
        }

        const content = await page.content();
        if (content.includes(payload)) {
            return "Vulnerable to XSS";
        }
        return "No XSS vulnerability detected";
    }

    async testAuthentication(page) {
        const loginUrl = `${this.url}/login`;
        try {
            await page.goto(loginUrl);
        } catch {
            return "Login page not found";
        }

        const username = await page.$('input[type="text"]');
        const password = await page.$('input[type="password"]');
        const submitButton = await page.$('button[type="submit"]');

        if (!username || !password || !submitButton) {
            return "Login form not found.";
        }

        await username.fill('admin');
        await password.fill('password');
        await submitButton.click();
        await page.waitForNavigation();

        const currentUrl = page.url();
        if (currentUrl.includes('dashboard')) {
            return "Authentication successful";
        }
        return "Authentication failed";
    }

    async testDataEncryption(page) {
        const loginUrl = `${this.url}/login`;
        try {
            await page.goto(loginUrl);
        } catch {
            return "Login page not found";
        }

        const passwordField = await page.$('input[type="password"]');
        if (!passwordField) return "Password field not found.";

        const isEncrypted = await passwordField.evaluate((el) => el.type === 'password');
        return isEncrypted ? "Data is encrypted" : "Data is not encrypted";
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

    saveReport(filename = 'performance_report.json') {
        try {
            fs.writeFileSync(filename, JSON.stringify(this.report, null, 2));
            console.log(chalk.green(`\n✅ Report saved as ${filename}\n`));
        } catch (error) {
            console.error(chalk.red(`❌ Failed to save report: ${error.message}`));
        }
    }
}

async function testWebsite(url) {
    console.log(chalk.blue(`\n🚀 Testing website: ${url}\n`));

    const report = new ReportGenerator();

    try {
        const pageAnalyzer = new PageAnalyzer(url);
        const securityAnalyzer = new SecurityAnalyzer(url);
        const lighthouseAnalyzer = new LighthouseAnalyzer(url);
        const apiTester = new APITester();

        // Setup browser for API testing and page analysis
        const browser = await chromium.launch({ headless: true });
        const page = await browser.newPage();
        
        // Start capturing API requests
        await apiTester.captureRequests(page);
        
        // Run tests that require browser
        await page.goto(url, { waitUntil: 'networkidle' });
        const elements = await pageAnalyzer.analyze();
        const securityResults = await securityAnalyzer.analyze();
        const lighthouseResults = await lighthouseAnalyzer.analyze();
        const apiResults = apiTester.getResults();

        await browser.close();

        report.addResult({ 
            url, 
            elements, 
            securityResults, 
            lighthouseResults,
            apiResults 
        });

        console.log(chalk.yellow('\n📊 Test Summary:\n'));

        const table = new Table({
            head: [chalk.cyan('Metric'), chalk.green('Value')],
            colWidths: [25, 50]
        });

        table.push(
            ['Forms', elements?.forms ?? 0],
            ['Buttons', elements?.buttons ?? 0],
            ['Links', elements?.links ?? 0],
            ['Images', elements?.images ?? 0],
            ['Meta Description', elements?.metaDescription || chalk.red('❌ No meta description found')],
            ['Performance Score', lighthouseResults?.performance ? `${lighthouseResults.performance.toFixed(1)}%` : 'N/A'],
            ['Accessibility Score', lighthouseResults?.accessibility ? `${lighthouseResults.accessibility.toFixed(1)}%` : 'N/A'],
            ['Best Practices', lighthouseResults?.bestPractices ? `${lighthouseResults.bestPractices.toFixed(1)}%` : 'N/A'],
            ['SEO Score', lighthouseResults?.seo ? `${lighthouseResults.seo.toFixed(1)}%` : 'N/A'],
            ['SQL Injection', securityResults?.sqlInjection ?? 'N/A'],
            ['XSS', securityResults?.xss ?? 'N/A'],
            ['Authentication', securityResults?.authentication ?? 'N/A'],
            ['Data Encryption', securityResults?.dataEncryption ?? 'N/A'],
            ['API Requests', apiResults?.length ?? 0]
        );

        console.log(table.toString());

        console.log(chalk.blue('📱 Running Responsive Testing...'));
        await responsiveTest(url);

        const summary = `AI Summary: 
- Performance: ${lighthouseResults?.performance.toFixed(1)}% 
- Accessibility: ${lighthouseResults?.accessibility.toFixed(1)}% 
- Best Practices: ${lighthouseResults?.bestPractices.toFixed(1)}% 
- SEO: ${lighthouseResults?.seo.toFixed(1)}%
- Security: ${securityResults?.sqlInjection}, ${securityResults?.xss}
- API Requests: ${apiResults?.length} captured`;
        console.log(chalk.green(`\n📝 AI Summary:\n${summary}`));

        report.addResult({ summary });
        report.saveReport();

    } catch (error) {
        console.error(chalk.red(`❌ Error during website testing: ${error.message}`));
    }
}

const args = process.argv.slice(2);
if (args.length < 1) {
    console.log(chalk.red('Usage: node main.js <URL>'));
    process.exit(1);
}

testWebsite(args[0]);