#!/bin/bash

# Display ASCII art header for "WARDRAGON UPDATE APPLICATION"
echo "WARDRAGON UPDATE APPLICATION"
echo "============================"

# Step 1: Resetting and Cleaning Up Your Repository
echo "Resetting git repository and cleaning up..."
git reset --hard HEAD
git clean -xffd
git pull
echo "Repository reset and cleaned."





# Step 2: Installing Node.js dependencies
echo "Installing Node.js dependencies..."
sudo npm install express http socket.io fs path mqtt os os-utils node-disk-info screenshot-desktop sharp
sudo npm install express mqtt screenshot-desktop sharp node-disk-info
sudo npm install --include=optional sharp
sudo npm install node-wifi
sudo npm install @abandonware/noble

sudo npm install
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
bluetoothctl power on
sudo setcap cap_net_raw+eip $(eval readlink -f `which node`)
echo "WARDRAGON UPDATE APPLICATION script completed."
