const mqtt = require('mqtt');
const express = require('express');
const app = express();
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const os = require('os');
const osUtils = require('os-utils');
const diskInfo = require('node-disk-info');

// Load configurations
const configPath = path.join(__dirname, 'config.json');
const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));

// Function to get the system's UUID
function getSystemUUID() {
    try {
        const uuid = execSync('cat /sys/class/dmi/id/product_uuid').toString().trim();
        return uuid;
    } catch (error) {
        console.error('Error obtaining system UUID:', error);
        return 'random-' + Math.random().toString(36).substring(2, 15);
    }
}

// Function to gather system metrics
async function getSystemMetrics() {
    const metrics = {
        networkInterfaces: os.networkInterfaces(),
        uptime: os.uptime(),
        freeMemory: os.freemem(),
        totalMemory: os.totalmem(),
        cpuUsage: await new Promise(resolve => osUtils.cpuUsage(resolve)),
        loadAverage: os.loadavg(),
        diskInfo: await diskInfo.getDiskInfo(),
    };
    // Optionally, add more metrics as needed
    return metrics;
}

const uniqueID = getSystemUUID();
const client = mqtt.connect(config.mqttServer);
const port = config.serverPort;

// Serve static files
app.use('/css', express.static('public/css'));

// MQTT Client Events
client.on('connect', async function () {
    console.log(`Connected with Unique ID: ${uniqueID}`);
    // Publish heartbeat message every second
    setInterval(async () => {
        const metrics = await getSystemMetrics();
        const message = {
            unitID: uniqueID,
            timestamp: Date.now(),
            status: 'alive',
            metrics: metrics
        };
        client.publish('wardragon/heartbeat', JSON.stringify(message));
        console.log('Heartbeat message sent:', message);
    }, config.heartbeatInterval); // Use interval from config
});

client.on('error', function (error) {
    console.log('MQTT Client Error:', error);
    // Handle error or update dashboard/status accordingly
});

// Endpoint for the dashboard
app.get('/', async (req, res) => {
    const metrics = await getSystemMetrics(); // Fetch system metrics
    fs.readFile(path.join(__dirname, 'views/dashboard.html'), 'utf8', (err, data) => {
        if (err) {
            console.error('Error reading dashboard template:', err);
            return res.status(500).send('Server error');
        }
        // Prepare dynamic content to replace placeholders
        let updateScript = `
    <script>
        ${Object.entries(metrics).map(([key, value]) => `updateCard('${key}', ${JSON.stringify(value)});`).join('\n')}
    </script>
`;

        let dashboard = data.replace('</body>', `${updateScript}</body>`); // Insert the update script just before the closing body tag

        res.send(dashboard);
    });
});

app.listen(port, () => {
    console.log(`Dashboard running at http://localhost:${port}`);
});

// Note: Ensure that mqtt, express, fs, path, child_process, os, os-utils, and node-disk-info packages are installed.
