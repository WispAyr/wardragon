const express = require('express');
const http = require('http');
const { Server } = require("socket.io");
const mqtt = require('mqtt');
const fs = require('fs');
const path = require('path');
const os = require('os');
const osUtils = require('os-utils');
const diskInfo = require('node-disk-info');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// Load configurations
const configPath = path.join(__dirname, 'config.json');
const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));

// MQTT setup
const client = mqtt.connect(config.mqttServer);
const uniqueID = 'server-unique-id'; // Consider a dynamic way to generate/fetch this

// Serve static files
app.use('/css', express.static('public/css'));

// MQTT Client Events and Heartbeat
client.on('connect', () => {
    console.log(`MQTT client connected with Unique ID: ${uniqueID}`);
    setInterval(async () => {
        const metrics = await getSystemMetrics();
        const message = {
            unitID: uniqueID,
            timestamp: Date.now(),
            status: 'alive',
            metrics: metrics
        };
        client.publish('wardragon/heartbeat', JSON.stringify(message), {}, (error) => {
            if (!error) {
                io.emit('mqtt-sent'); // Notify connected clients for the UI indicator
                console.log('Heartbeat message sent:', message);
            }
        });
    }, config.heartbeatInterval);
});

client.on('error', function (error) {
    console.error('MQTT Client Error:', error);
});

// System Metrics Function
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
    return metrics;
}

// Dashboard Endpoint
app.get('/', (req, res) => {
    fs.readFile(path.join(__dirname, 'views', 'dashboard.html'), 'utf8', (err, data) => {
        if (err) {
            console.error('Error reading dashboard template:', err);
            return res.status(500).send('Server error');
        }
        res.send(data);
    });
});

// Socket.io Connection
io.on('connection', (socket) => {
    console.log('A client connected');
    socket.on('disconnect', () => {
        console.log('A client disconnected');
    });
});

const port = config.serverPort || 3000;
server.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});
