import fs from "fs";

fs.readFile("report.json", "utf8", (err, data) => {
    if (err) {
        console.error("Error reading report:", err);
        return;
    }

    let report;
    try {
        report = JSON.parse(data);
    } catch (error) {
        console.error("Error parsing JSON:", error);
        return;
    }

    if (!report.categories) {
        console.error("Error: 'categories' section is missing in report.json");
        console.log("Report content:", JSON.stringify(report, null, 2));
        return;
    }

    const performanceReport = {
        performance: (report.categories.performance?.score || 0) * 100,
        accessibility: (report.categories.accessibility?.score || 0) * 100,
        bestPractices: (report.categories["best-practices"]?.score || 0) * 100,
        seo: (report.categories.seo?.score || 0) * 100,
        coreWebVitals: {
            fcp: report.audits?.["first-contentful-paint"]?.displayValue || "N/A",
            lcp: report.audits?.["largest-contentful-paint"]?.displayValue || "N/A",
            tbt: report.audits?.["total-blocking-time"]?.displayValue || "N/A",
            cls: report.audits?.["cumulative-layout-shift"]?.displayValue || "N/A",
            si: report.audits?.["speed-index"]?.displayValue || "N/A",
        },
        diagnostics: {
            jsExecutionTime: report.audits?.["bootup-time"]?.displayValue || "N/A",
            mainThreadWork: report.audits?.["main-thread-tasks"]?.displayValue || "N/A",
        },
    };

    fs.writeFile("performanceReport.json", JSON.stringify(performanceReport, null, 2), (err) => {
        if (err) {
            console.error("Error writing performance report:", err);
            return;
        }
        console.log("✅ Performance report saved to performanceReport.json");
    });
});
