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
const actions = require('./actions'); // Import actions defined in actions.js

const app = express();
const server = http.createServer(app);

let config;
try {
    const configPath = path.join(__dirname, 'config.json');
    config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    console.log('Configuration loaded:', config);
} catch (error) {
    console.error('Failed to load configuration:', error);
    process.exit(1);
}

const mqttClient = mqtt.connect(config.mqttServer, {
    clientId: config.uniqueID
});


mqttClient.on('connect', () => {
    console.log('Connected to MQTT server');
    // Subscribe to the ACTION topic to listen for incoming action messages
    mqttClient.subscribe('ACTION', function(err) {
        if (!err) {
            console.log('Subscribed to ACTION topic');
        } else {
            console.error('Failed to subscribe to ACTION topic:', err);
        }
    });
});

mqttClient.on('error', (error) => {
    console.error('MQTT connection error:', error);
});

// Handle incoming MQTT messages for actions
mqttClient.on('message', function(topic, message) {
    if (topic === 'ACTION') {
        handleActionMessage(message.toString());
    }
});

let gpsData = null;
let gpsdConnected = false;

const gpsdClient = new net.Socket();
const gpsdHost = 'localhost';
const gpsdPort = 2947;

gpsdClient.connect(gpsdPort, gpsdHost, () => {
    console.log('Connected to gpsd');
    gpsdConnected = true;
    gpsdClient.write('?WATCH={"enable":true,"json":true};');
});

gpsdClient.on('data', async (data) => {
    const dataStr = data.toString();
    const messages = dataStr.split('\n');

    for (const message of messages) {
        if (message) {
            try {
                gpsData = JSON.parse(message);
            } catch (error) {
                console.error('Error parsing JSON from gpsd:', error);
            }
        }
    }
});

gpsdClient.on('close', () => {
    console.log('Connection to gpsd closed');
    gpsdConnected = false;
});

gpsdClient.on('error', (error) => {
    console.error('GPSD connection error:', error);
    gpsdConnected = false;
});

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

async function captureScreenshot() {
    if (!config.captureScreenshots) return '';

    try {
        const screenshotBuffer = await screenshot({ format: 'jpg' });
        const resizedScreenshotBuffer = await sharp(screenshotBuffer)
            .resize(800)
            .toBuffer();
        return resizedScreenshotBuffer.toString('base64');
    } catch (error) {
        console.error('Error capturing or processing screenshot:', error);
        return '';
    }
}

async function getOptionalSystemMetrics() {
    if (!config.transferSystemMetrics) return {};

    return await getSystemMetrics();
}

async function sendHeartbeat() {
    const screenshotBase64 = await captureScreenshot();
    const systemMetrics = await getOptionalSystemMetrics();

    const messagePayload = {
        gpsData: gpsData,
        gpsdConnected: gpsdConnected,
        screenshot: screenshotBase64,
        systemMetrics
    };

    mqttClient.publish(config.mqttTopic, JSON.stringify(messagePayload), {}, (error) => {
        if (error) {
            console.error('Error sending data via MQTT:', error);
            }
            });
            }
            
            // Set the heartbeat interval based on config
            const heartbeatInterval = config.heartbeatInterval || 300000; // Default to 5 minutes if not specified
            setInterval(sendHeartbeat, heartbeatInterval);
            
            function handleActionMessage(message) {
            let actionMessage;
            try {
            actionMessage = JSON.parse(message);
            } catch (error) {
            console.error('Error parsing ACTION message:', error);
            return;
            }
            
            
            const { action, taskId } = actionMessage;
            if (actions[action]) {
                actions[action](taskId, (error, result) => {
                    const responseTopic = `ACTION_RESPONSE/${taskId}`;
                    if (error) {
                        mqttClient.publish(responseTopic, JSON.stringify({ error: error.message, taskId }), {}, (err) => {
                            if (err) {
                                console.error('Error sending action failure response:', err);
                            }
                        });
                    } else {
                        mqttClient.publish(responseTopic, JSON.stringify({ result, taskId }), {}, (err) => {
                            if (err) {
                                console.error('Error sending action success response:', err);
                            }
                        });
                    }
                });
            } else {
                console.error(`Received unknown action: ${action}`);
            }
        }

        process.on('uncaughtException', (error) => {
        console.error('Uncaught Exception:', error);
        });
        
        process.on('unhandledRejection', (reason, promise) => {
        console.error('Unhandled Rejection at:', promise, 'reason:', reason);
        });
    
        const port = process.env.PORT || 4000;
        server.listen(port, () => {
            console.log(`Server running at http://localhost:${port}`);

        });