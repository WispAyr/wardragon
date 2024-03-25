#!/bin/bash

# Function to display messages with formatting
display_message() {
    echo "===================================="
    echo "WARDRAGON UPDATE APPLICATION"
    echo "===================================="
    echo "$1"
    echo "===================================="
}

# Function to handle errors
handle_error() {
    echo "Error: $1"
    exit 1
}

# Step 1: Resetting and Cleaning Up Your Repository
display_message "Resetting git repository and cleaning up..."
git reset --hard HEAD || handle_error "Failed to reset git repository"
git clean -xffd || handle_error "Failed to clean up repository"
git pull || handle_error "Failed to pull latest changes"
echo "Repository reset and cleaned."

# Step 2: Installing Node.js dependencies
display_message "Installing Node.js dependencies..."
npm install express http socket.io fs path mqtt os os-utils node-disk-info screenshot-desktop sharp node-wifi || handle_error "Failed to install Node.js dependencies"
echo "Dependencies installed."

# Step 3: Installing system packages with apt-get (Requires sudo privileges)
display_message "Installing system packages: imagemagick, make..."
sudo apt-get update || handle_error "Failed to update apt-get"
sudo apt-get install imagemagick make -y || handle_error "Failed to install system packages"
echo "System packages installed."

# Optional: Additional setup steps
read -p "Do you want to proceed with additional setup steps? (y/n): " proceed
if [[ $proceed == "y" ]]; then
    echo "Proceeding with additional steps..."
    # Add your additional setup steps here
else
    echo "Skipping additional steps."
fi

display_message "WARDRAGON UPDATE APPLICATION script completed."
