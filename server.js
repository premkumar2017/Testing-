import express from 'express';
import fs from 'fs/promises';
import cors from 'cors';
import chalk from 'chalk'; // For colored terminal output
import Table from 'cli-table3'; // For formatted tables in terminal

const app = express();
app.use(cors());
app.use(express.json()); // Support JSON request bodies

const REPORT_FILE = 'performance_report.json';
const LOG_FILE = 'api_logs.json';

// Initialize API stats
const apiStats = {
    GET: 0,
    POST: 0,
    DELETE: 0,
    ERROR: 0,
};

// Middleware to log requests
app.use(async (req, res, next) => {
    apiStats[req.method] = (apiStats[req.method] || 0) + 1;
    
    res.on('finish', async () => {
        const logEntry = {
            timestamp: new Date().toISOString(),
            method: req.method,
            url: req.originalUrl,
            status: res.statusCode,
        };
        
        if (res.statusCode >= 400) {
            apiStats.ERROR++;
        }
        
        try {
            let logs = [];
            try {
                const logData = await fs.readFile(LOG_FILE, 'utf8');
                logs = JSON.parse(logData);
            } catch (error) {
                if (error.code !== 'ENOENT') throw error;
            }
            logs.push(logEntry);
            await fs.writeFile(LOG_FILE, JSON.stringify(logs, null, 2));
        } catch (error) {
            console.error(chalk.red('❌ Error writing log file:', error.message));
        }
    });
    
    next();
});

// API to fetch report data
app.get('/report', async (req, res) => {
    try {
        await fs.access(REPORT_FILE);
        const data = await fs.readFile(REPORT_FILE, 'utf8');
        res.json(JSON.parse(data));
    } catch (error) {
        if (error.code === 'ENOENT') {
            return res.status(404).json({ error: 'Report not found.' });
        }
        console.error(chalk.red('❌ Error reading report:', error.message));
        res.status(500).json({ error: 'Internal server error.' });
    }
});

// API to fetch logs
app.get('/logs', async (req, res) => {
    try {
        const logData = await fs.readFile(LOG_FILE, 'utf8');
        res.json(JSON.parse(logData));
    } catch (error) {
        res.status(500).json({ error: 'Error fetching logs' });
    }
});

// Display API stats in the terminal
const displayStats = () => {
    const table = new Table({
        head: [chalk.blue('Metric'), chalk.green('Value')],
        colWidths: [20, 15],
    });

    table.push(
        ['GET Requests', apiStats.GET],
        ['POST Requests', apiStats.POST],
        ['DELETE Requests', apiStats.DELETE],
        ['Errors', chalk.red(apiStats.ERROR)]
    );

    console.clear();
    console.log(chalk.yellow('📊 API Usage Stats'));
    console.log(table.toString());
};

// Refresh stats every 5 seconds
setInterval(displayStats, 5000);

// Start the server
const PORT = 3000;
app.listen(PORT, () => {
    console.log(chalk.green(`✅ Server running on http://localhost:${PORT}`));
});
