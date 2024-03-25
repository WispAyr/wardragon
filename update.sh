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

# Function to check and install Node.js package if needed
check_and_install_node_package() {
    package=$1
    if ! npm list --depth 1 "$package" > /dev/null 2>&1; then
        echo "Installing $package..."
        npm install "$package" || handle_error "Failed to install $package"
    else
        echo "$package is already installed. Checking for updates..."
        npm update "$package"
    fi
}

# Function to check and install apt-get package if needed
check_and_install_apt_package() {
    package=$1
    if ! dpkg -l | grep -q "^ii  $package "; then
        echo "Installing $package..."
        sudo apt-get install "$package" -y || handle_error "Failed to install $package"
    else
        echo "$package is already installed. Checking for updates..."
    fi
}

# Step 1: Resetting and Cleaning Up Your Repository
display_message "Resetting git repository and cleaning up..."
git reset --hard HEAD || handle_error "Failed to reset git repository"
git clean -xffd || handle_error "Failed to clean up repository"
git pull || handle_error "Failed to pull latest changes"
echo "Repository reset and cleaned."

# Step 2: Installing Node.js dependencies
display_message "Installing Node.js dependencies..."
npm install || handle_error "Failed to install Node.js dependencies" # Initial install to ensure package.json is respected
# List all Node.js dependencies
packages=("express" "http" "socket.io" "fs" "path" "mqtt" "os" "os-utils" "node-disk-info" "screenshot-desktop" "sharp" "node-wifi")
for package in "${packages[@]}"; do
    check_and_install_node_package "$package"
done
echo "Dependencies installed."

# Step 3: Installing system packages with apt-get (Requires sudo privileges)
display_message "Installing system packages: imagemagick, make..."
sudo apt-get update || handle_error "Failed to update apt-get"
# List all system packages
apt_packages=("imagemagick" "make")
for package in "${apt_packages[@]}"; do
    check_and_install_apt_package "$package"
done
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
