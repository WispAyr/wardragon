const express = require('express');
const http = require('http');
const { Server } = require("socket.io");
const fs = require('fs');
const path = require('path');
const mqtt = require('mqtt');
const os = require('os');
const osUtils = require('os-utils');
const diskInfo = require('node-disk-info');
const app = express();
const server = http.createServer(app);

app.use(express.static('public')); // Serve static files
app.use(express.json()); // For parsing application/json

app.use(express.static('views'));
const io = require('socket.io')(server); // Assuming you've already set up a server

// Load configurations
const configPath = path.join(__dirname, 'config.json');
let config = JSON.parse(fs.readFileSync(configPath, 'utf8'));

// MQTT setup
const client = mqtt.connect(config.mqttServer);

// Utility function to get system metrics
async function getSystemMetrics() {
    // Implementation of your getSystemMetrics function
}

// MQTT Client Events and Heartbeat
client.on('connect', () => {
    console.log(`MQTT client connected with Unique ID: ${config.uniqueID}`);
    setInterval(async () => {
        const metrics = await getSystemMetrics();
        const message = {
            unitID: config.uniqueID,
            timestamp: Date.now(),
            status: 'alive',
            metrics: metrics
        };
        client.publish(config.mqttTopic, JSON.stringify(message), {}, (error) => {
            if (!error) {
                io.emit('mqtt-sent'); // Notify connected clients
                console.log('Heartbeat message sent:', message);
            }
        });
    }, config.heartbeatInterval);
});

// Serve the main dashboard page
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'dashboard.html'));
});

// Serve the configuration editing page
app.get('/edit-config', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'edit-config.html'));
});

// API endpoint to fetch current configuration
app.get('/config', (req, res) => {
    res.sendFile(configPath);
});

// API endpoint to update configuration
app.post('/config', (req, res) => {
    config = req.body; // Update the in-memory config
    fs.writeFile(configPath, JSON.stringify(config, null, 2), (err) => {
        if (err) {
            console.error('Error writing config file:', err);
            return res.status(500).send('Error saving configuration');
        }
        res.send({ status: 'success' });
    });
});

// Socket.io setup for real-time communication
io.on('connection', (socket) => {
    console.log('A client connected');
    socket.on('disconnect', () => {
        console.log('Client disconnected');
    });
});

const port = process.env.PORT || 4000;
server.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});
