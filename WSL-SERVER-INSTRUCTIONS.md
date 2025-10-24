# Web Terminal LLM - Server Instructions

## Running the server in WSL

### Option 1: Using Python (Recommended)
```bash
# Navigate to the project directory in WSL
cd /mnt/host/c/source/repos/WebTerminalLLM

# Start Python HTTP server on port 8000
python3 -m http.server 8000
```

Then open your browser to: **http://localhost:8000**

### Option 2: Using Node.js
If you have Node.js installed in WSL:
```bash
cd /mnt/host/c/source/repos/WebTerminalLLM
node server.js
```

Then open your browser to: **http://localhost:3000**

### Option 3: Install Python in WSL (if not available)
```bash
sudo apt update
sudo apt install python3
```

Then use Option 1 above.

### To stop the server
Press `Ctrl+C` in the terminal

---

## Quick Start Command
Copy and paste this into your WSL terminal:
```bash
cd /mnt/host/c/source/repos/WebTerminalLLM && python3 -m http.server 8000
```
