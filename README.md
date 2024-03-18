# wardragon
This Node.js application serves as a heartbeat mechanism for Wardragon units, leveraging the MQTT protocol to continuously monitor and report the status of each unit. By extracting the unique system UUID of Linux-based systems, specifically tailored for DragonOS environments, the application ensures each heartbeat message is uniquely identifiable to the corresponding unit. Once every second, it sends a concise status message to an MQTT server, indicating the unit's active presence and current timestamp. This simple yet effective approach facilitates real-time monitoring and management of Wardragon units across a network, emphasizing security and reliability in SDR-centric applications. Designed for seamless integration and ease of use, it stands as a cornerstone for maintaining the operational integrity of Wardragon deployments.



++Instructions
==Requires recent version of node js
git clone this repo
npm install //isntall all related dependancies
npm start
