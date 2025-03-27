import { chromium } from 'playwright';
import fs from 'fs';

class APITester {
    constructor(url) {
        this.url = url;
        this.apiRequests = [];
    }

    async captureRequests() {
        const browser = await chromium.launch();
        const context = await browser.newContext();
        const page = await context.newPage();

        // Enable request interception
        await page.route('**', route => {
            const request = route.request();
            this.apiRequests.push({
                method: request.method(),
                url: request.url(),
                status: 'Pending'
            });
            route.continue();
        });

        // Listen to responses
        page.on('response', response => {
            const matchingRequest = this.apiRequests.find(req => 
                req.url === response.url() && req.status === 'Pending'
            );
            if (matchingRequest) {
                matchingRequest.status = response.status();
                matchingRequest.headers = response.headers();
            }
        });

        try {
            await page.goto(this.url, { waitUntil: 'networkidle' });
            await this.validateAPIs();
        } finally {
            await browser.close();
            this.saveResults();
        }
    }

    async validateAPIs() {
        this.apiRequests = this.apiRequests.map(request => {
            // Basic validation rules
            let validation = {
                isSecure: request.url.startsWith('https://'),
                hasCacheHeaders: !!request.headers?.['cache-control'],
                statusOk: request.status >= 200 && request.status < 300,
                responseTime: null // Would need actual timing measurement
            };
            return { ...request, validation };
        });
    }

    saveResults() {
        const report = {
            timestamp: new Date().toISOString(),
            apiRequests: this.apiRequests
        };
        fs.writeFileSync('api_report.json', JSON.stringify(report, null, 2));
    }
}

// Usage
const tester = new APITester(process.argv[2] || 'https://example.com');
tester.captureRequests();