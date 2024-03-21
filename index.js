const express = require('express');
const http = require('http');
const fs = require('fs');
const path = require('path');
const mqtt = require('mqtt');
const net = require('net');
const screenshot = require('screenshot-desktop');
const sharp = require('sharp');
const os = require('os');
const { getDiskInfoSync } = require('node-disk-info');

const app = express();
const server = http.createServer(app);

// Attempt to load configurations
let config;
try {
    const configPath = path.join(__dirname, 'config.json');
    config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
} catch (error) {
    console.error('Failed to load configuration:', error);
    process.exit(1); // Exit if configuration cannot be loaded
}

// MQTT client setup
const mqttClient = mqtt.connect(config.mqttServer);

mqttClient.on('connect', () => {
    console.log('Connected to MQTT server');
});

mqttClient.on('error', (error) => {
    console.error('MQTT connection error:', error);
});

// GPSD client setup
const gpsdClient = new net.Socket();
const gpsdHost = 'localhost';
const gpsdPort = 2947;

gpsdClient.connect(gpsdPort, gpsdHost, () => {
    console.log('Connected to gpsd');
    gpsdClient.write('?WATCH={"enable":true,"json":true};');
});

// Function to get system metrics
async function getSystemMetrics() {
    const totalMemory = os.totalmem();
    const freeMemory = os.freemem();
    const cpuModel = os.cpus()[0].model;
    const cpuSpeed = os.cpus()[0].speed;
    let disks = [];
    try {
        disks = getDiskInfoSync().map(disk => ({
            filesystem: disk.filesystem,
            size: disk.blocks,
            available: disk.available,
            mountpoint: disk.mounted
        }));
    } catch (error) {
        console.error('Error fetching disk info:', error);
    }
    const networks = os.networkInterfaces();

    return {
        totalMemory,
        freeMemory,
        cpuModel,
        cpuSpeed,
        disks,
        networks
    };
}

// Handling GPSD data
gpsdClient.on('data', async (data) => {
    const dataStr = data.toString();
    const messages = dataStr.split('\n');

    for (const message of messages) {
        if (message) {
            try {
                const gpsData = JSON.parse(message);

                if (gpsData.class === 'TPV') {
                    const systemMetrics = await getSystemMetrics();
                    let screenshotBase64 = '';
                    try {
                        const screenshotBuffer = await screenshot({ format: 'jpg' });
                        const resizedScreenshotBuffer = await sharp(screenshotBuffer)
                            .resize(800)
                            .toBuffer();
                        screenshotBase64 = resizedScreenshotBuffer.toString('base64');
                    } catch (error) {
                        console.error('Error capturing or processing screenshot:', error);
                    }

                    const messagePayload = {
                        gpsData: {
                            latitude: gpsData.lat,
                            longitude: gpsData.lon,
                            altitude: gpsData.alt,
                            speed: gpsData.speed
                        },
                        screenshot: screenshotBase64,
                        systemMetrics
                    };

                    mqttClient.publish(config.mqttTopic, JSON.stringify(messagePayload), {}, (error) => {
                        if (error) {
                            console.error('Error sending data via MQTT:', error);
                        }
                    });
                }
            } catch (error) {
                console.error('Error parsing JSON from gpsd:', error);
            }
        }
    }
});

gpsdClient.on('close', () => {
    console.log('Connection to gpsd closed');
});

gpsdClient.on('error', (error) => {
    console.error('GPSD connection error:', error);
});

mqttClient.on('close', () => {
    console.log('MQTT connection closed');
});

// Handle uncaught exceptions and unhandled promise rejections
process.on('uncaughtException', (error) => {
    console.error('Uncaught Exception:', error);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

const port = process.env.PORT || 3000;
server.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});
