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
const actions = require('./actions');

const app = express();
const server = http.createServer(app);
const configPath = path.join(__dirname, 'config.json');

let config;

try {
    config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    console.log('Configuration loaded:', config);
} catch (error) {
    console.error('Failed to load configuration:', error);
    process.exit(1);
}

const mqttClient = mqtt.connect(config.mqttServer, {
    clientId: config.uniqueID
});

const wifi = require('node-wifi');

// Initialize wifi module
// Absolutely necessary even to set interface to null
wifi.init({
    iface: null // network interface, choose a random wifi interface if set to null
  });
  

const wifiScanInterval = config.wifiScanInterval || 60000;
setInterval(scanWifi, wifiScanInterval);

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
    const messages = data.toString().split('\n');

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

// Increase the maximum number of listeners for the Noble instance
noble.setMaxListeners(20); // Adjust the number based on your needs

// Singleton listener for Bluetooth scanning events
noble.on('scanStart', () => console.log('Bluetooth scanning started'));
noble.on('scanStop', () => console.log('Bluetooth scanning stopped'));

async function scanBluetooth() {
    return new Promise((resolve, reject) => {
        let devices = [];

        const handleDiscover = (peripheral) => {
            devices.push({
                id: peripheral.id,
                address: peripheral.address,
                localName: peripheral.advertisement.localName,
                txPowerLevel: peripheral.advertisement.txPowerLevel,
                rssi: peripheral.rssi
            });
        };

        // Add discover listener
        noble.on('discover', handleDiscover);

        noble.startScanning([], true, (error) => {
            if (error) {
                noble.removeListener('discover', handleDiscover);
                reject(error);
            }
        });

        // Stop scanning after a predetermined duration and remove the discover listener
        setTimeout(() => {
            noble.stopScanning();
            noble.removeListener('discover', handleDiscover);
            resolve(devices);
        }, config.bluetoothScanDuration || 10000); // Default to 10 seconds if not specified
    });
}


gpsdClient.on('close', () => {
    console.log('Connection to gpsd closed');
    gpsdConnected = false;
});

gpsdClient.on('error', (error) => {
    console.error('GPSD connection error:', error);
    gpsdConnected = false;
});

async function scanWifi() {
    try {
        const networks = await wifi.scan();
        return networks;
    } catch (error) {
        console.error('Error scanning WiFi networks:', error);
        return [];
    }
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

async function getSystemMetrics() {
    const totalMemory = os.totalmem();
    const freeMemory = os.freemem();
    const cpuModel = os.cpus()[0].model;
    const cpuSpeed = os.cpus()[0].speed;
    const unitID = config.uniqueID;
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
        unitID,
        totalMemory,
        freeMemory,
        cpuModel,
        cpuSpeed,
        disks,
        networks
    };
}

async function getOptionalSystemMetrics() {
    if (!config.transferSystemMetrics) return {};

    return await getSystemMetrics();
}

async function sendHeartbeat() {
    const screenshotBase64 = await captureScreenshot();
    const systemMetrics = await getOptionalSystemMetrics();
    const wifiNetworks = config.wifiScanEnabled ? await scanWifi() : [];
    let bluetoothDevices = [];

    // Include Bluetooth scan results if enabled
    if (config.bluetoothScanEnabled) {
        bluetoothDevices = await scanBluetooth(); // Make sure this matches the duration in the config
    }

    const unitID = config.uniqueID;
    let bluetoothDevices = [];
    if (config.bluetoothScanEnabled) {
        bluetoothDevices = await scanBluetooth(); // Ensure Bluetooth scanning is properly managed
    }

    const messagePayload = {
        unitID: unitID,
        gpsData: gpsData,
        gpsdConnected: gpsdConnected,
        screenshot: screenshotBase64,
        systemMetrics,
        wifiNetworks, // Include WiFi scan results
        bluetoothDevices // Include Bluetooth scan results
    };

    mqttClient.publish(config.mqttTopic, JSON.stringify(messagePayload), {}, (error) => {
        if (error) {
            console.error('Error sending data via MQTT:', error);
        }
    });
}


mqttClient.on('connect', () => {
    console.log('Connected to MQTT server');
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

mqttClient.on('message', function(topic, message) {
    if (topic === 'ACTION') {
        handleActionMessage(message.toString());
    }
});

const heartbeatInterval = config.heartbeatInterval || 300000;
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
    const responseTopic = `ACTION_RESPONSE/${taskId}`;

    if (actions[action]) {
        actions[action](taskId, (error, result) => {
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
