class PerformanceAnalyzer {
    constructor(url) {
        this.url = url;
    }

    async analyze() {
        try {
            const browser = await chromium.launch({ headless: true });
            const page = await browser.newPage();
            
            const start = Date.now();
            await page.goto(this.url, { waitUntil: 'networkidle' }); // Ensures full load
            await page.waitForLoadState('domcontentloaded'); // Ensures DOM is ready
            const loadTime = Date.now() - start;
            
            await browser.close();
            return { loadTime: `${loadTime}ms` };
        } catch (error) {
            console.error(chalk.red(`Error analyzing performance: ${error.message}`));
            return { loadTime: "N/A" }; // Return a valid fallback value
        }
    }
}
