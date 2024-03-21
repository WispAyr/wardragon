const express = require('express');
const http = require('http');
const fs = require('fs');
const path = require('path');
const mqtt = require('mqtt');
const screenshot = require('screenshot-desktop');
const sharp = require('sharp');
const os = require('os');
const { getDiskInfoSync } = require('node-disk-info');
const net = require('net');

const app = express();
const server = http.createServer(app);
let lastGpsData = null; // To store the last received GPS data

// Attempt to load configurations
let config;
try {
    const configPath = path.join(__dirname, 'config.json');
    config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
} catch (error) {
    console.error('Failed to load configuration:', error);
    process.exit(1);
}

// MQTT client setup
const mqttClient = mqtt.connect(config.mqttServer);
mqttClient.on('connect', () => console.log('Connected to MQTT server'));
mqttClient.on('error', (error) => console.error('MQTT connection error:', error));

// GPSD client setup
const gpsdClient = new net.Socket();
gpsdClient.connect(2947, 'localhost', () => {
    console.log('Connected to gpsd');
    gpsdClient.write('?WATCH={"enable":true,"json":true};');
});

gpsdClient.on('data', (data) => {
    const dataStr = data.toString();
    const messages = dataStr.split('\n');

    messages.forEach((message) => {
        if (message) {
            try {
                const gpsData = JSON.parse(message);
                if (gpsData.class === 'TPV') {
                    lastGpsData = gpsData; // Store the latest GPS data
                }
            } catch (error) {
                console.error('Error parsing JSON from gpsd:', error);
            }
        }
    });
});

gpsdClient.on('close', () => console.log('Connection to gpsd closed'));
gpsdClient.on('error', (error) => console.error('GPSD connection error:', error));

async function sendHeartbeat() {
    const systemMetrics = await getSystemMetrics(); // Assume getSystemMetrics() is defined as before
    let screenshotBase64 = '';
    try {
        const screenshotBuffer = await screenshot({ format: 'jpg' });
        const resizedScreenshotBuffer = await sharp(screenshotBuffer).resize(800).toBuffer();
        screenshotBase64 = resizedScreenshotBuffer.toString('base64');
    } catch (error) {
        console.error('Error capturing or processing screenshot:', error);
    }

    const messagePayload = {
        timestamp: new Date(),
        systemMetrics,
        screenshot: screenshotBase64,
        gpsData: lastGpsData // Include GPS data if available
    };

    mqttClient.publish(config.mqttTopic, JSON.stringify(messagePayload), {}, (error) => {
        if (error) console.error('Error sending heartbeat via MQTT:', error);
        else console.log('Heartbeat sent');
    });
}

// Send heartbeat every configured interval
setInterval(sendHeartbeat, config.heartbeatInterval || 5000);

const port = process.env.PORT || 3000;
server.listen(port, () => console.log(`Server running at http://localhost:${port}`));
