# Wardragon Heartbeat Node.js Application

This Node.js application serves as a heartbeat mechanism for Wardragon units, leveraging the MQTT protocol to continuously monitor and report the status of each unit. It is designed specifically for Linux-based systems running DragonOS, using the unique system UUID to ensure each heartbeat message is uniquely identifiable to its corresponding unit. This allows for real-time monitoring and management of Wardragon units across a network, with a focus on security and reliability in Software-Defined Radio (SDR)-centric applications.

## Key Features

- **Unique Identification:** Utilizes the system's UUID on DragonOS environments for precise unit identification.
- **Continuous Monitoring:** Sends a status message every second to an MQTT server, indicating the unit's active presence and current timestamp.
- **Real-time Management:** Facilitates efficient monitoring and management of Wardragon units, emphasizing operational integrity.
- **SDR-Centric Design:** Tailored for applications involving Software-Defined Radio, ensuring reliability and security.
- **Configurable Settings:** Enables customization of MQTT server details and operational parameters through an external configuration file.

## Installation Instructions

Ensure you have a recent version of Node.js installed before proceeding.

1. **Clone the repository:**
   ```bash
   git clone https://github.com/WispAyr/wardragon/
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Configure the application:**
   - Locate the `config.json` file in the project root.
   - Edit the file to set your MQTT server URL, heartbeat message interval, and server port number:
     ```json
     {
       "mqttServer": "mqtt://192.168.10.254",
       "heartbeatInterval": 1000,
       "serverPort": 3000
     }
     ```
   - Save the changes to apply your configuration.

4. **Start the application:**
   ```bash
   npm start
   ```

This simple yet effective approach is designed for seamless integration and ease of use, standing as a cornerstone for maintaining the operational integrity of Wardragon deployments.

## Configuration File Details

The `config.json` file is a crucial component that allows for the easy adjustment of operational parameters. It contains the following settings:

- **mqttServer:** The URL of the MQTT server to which the application connects. It should be in the format `mqtt://[IP Address]`.
- **heartbeatInterval:** The interval, in milliseconds, at which the heartbeat messages are sent. For example, `1000` for a 1-second interval.
- **serverPort:** The port number on which the Node.js server will listen for incoming connections.

Adjusting these settings in the `config.json` file allows for quick reconfiguration of the application according to the network setup or operational requirements, without the need to directly modify the source code.
