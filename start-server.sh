#!/bin/bash

# Simple HTTP server startup script for WSL
# This script will try to start a web server using available tools

PORT=8000

echo "Starting web server on port $PORT..."
echo "Open your browser to: http://localhost:$PORT"
echo ""
echo "Press Ctrl+C to stop the server"
echo ""

# Try Python 3 first
if command -v python3 &> /dev/null; then
    echo "Using Python 3..."
    python3 -m http.server $PORT
# Try Python 2
elif command -v python &> /dev/null; then
    echo "Using Python 2..."
    python -m SimpleHTTPServer $PORT
# Try Node.js
elif command -v node &> /dev/null; then
    echo "Using Node.js..."
    node server.js
# Try PHP
elif command -v php &> /dev/null; then
    echo "Using PHP..."
    php -S localhost:$PORT
else
    echo "Error: No suitable HTTP server found."
    echo "Please install one of the following:"
    echo "  - Python 3: sudo apt install python3"
    echo "  - Node.js: sudo apt install nodejs"
    echo "  - PHP: sudo apt install php"
    exit 1
fi
