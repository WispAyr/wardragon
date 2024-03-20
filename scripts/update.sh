#!/bin/bash

# Display ASCII art header for "WARDRAGON UPDATE APPLICATION"
echo " _    _               _____           _     _             _   _                 _      _             _             "
echo "| |  | |             |  __ \         | |   | |           | | | |               | |    | |           | |            "
echo "| |  | | ___  _ __ __| |  | | __ _ ___| | __| |_   _  ___| |_| |_ ___ _ __ __ _| | ___| |_ _ __ __ _| |_ ___  _ __ "
echo "| |/\| |/ _ \| '__/ _ \ |  | |/ _` / __| |/ /| | | |/ _ \ __| __/ _ \ '__/ _\` | |/ _ \ __| '__/ _\` | __/ _ \| '__|"
echo "\  /\  / (_) | | |  __/ |__| | (_| \__ \   < | | | |  __/ |_| ||  __/ | | (_| | |  __/ |_| | | (_| | || (_) | |   "
echo " \/  \/ \___/|_|  \___|_____/ \__,_|___/_|\_\/ |_|\___|\__|\__\___|_|  \__,_|_|\___|\__|_|  \__,_|\__\___/|_|   "
echo "================================================================================================================="

# Step 1: Resetting and Cleaning Up Your Repository
echo "Resetting git repository and cleaning up..."
git reset --hard HEAD
git clean -xffd
git pull
echo "Repository reset and cleaned."

# Step 2: Installing Node.js dependencies
echo "Installing Node.js dependencies..."
npm install express http socket.io fs path mqtt os os-utils node-disk-info screenshot-desktop sharp
npm install
echo "Dependencies installed."

# Step 3: Installing system packages with apt-get (Requires sudo privileges)
echo "Installing system packages: imagemagick, make. Please enter your password if prompted."
sudo apt-get update
sudo apt-get install imagemagick make -y
echo "System packages installed."

# Optional: Interactive dialogue example
echo "Do you want to proceed with additional setup steps? (y/n)"
read proceed

if [[ $proceed == "y" ]]; then
    echo "Proceeding with additional steps..."
    # Place additional script steps here
else
    echo "Skipping additional steps."
fi

echo "WARDRAGON UPDATE APPLICATION script completed."
