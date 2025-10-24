// Import services
import ConfigService from './config.service.js';
import GeminiService from './gemini.service.js';

// Initialize services
const configService = new ConfigService();
const geminiService = new GeminiService(configService);

// Terminal state
const terminal = {
    history: [],
    historyIndex: -1,
    isProcessing: false,
    currentStreamingElement: null
};

// DOM elements
const outputElement = document.getElementById('output');
const inputElement = document.getElementById('input');
const promptElement = document.getElementById('prompt');
const terminalBody = document.getElementById('terminal');

// Helper function to scroll to bottom
function scrollToBottom() {
    // Try multiple methods to ensure scrolling works
    outputElement.scrollTop = outputElement.scrollHeight;
    terminalBody.scrollTop = terminalBody.scrollHeight;
    
    // Also try scrolling the window
    window.scrollTo(0, document.body.scrollHeight);
    
    // Force a reflow
    terminalBody.scrollTop = terminalBody.scrollHeight;
}

// Load configuration on startup
let configLoaded = false;
configService.loadConfig()
    .then(() => {
        configLoaded = true;
        if (configService.isConfigured()) {
            addOutput('✓ Configuration loaded successfully', 'info');
            addOutput('Ready to chat with Gemini AI!', 'info');
        } else {
            addOutput('⚠ Warning: API key not configured', 'warning');
            addOutput('Please update config.json with your Gemini API key', 'warning');
        }
        addOutput('');
    })
    .catch(error => {
        addOutput('✗ Failed to load configuration', 'error');
        addOutput('Please ensure config.json exists in the same directory', 'error');
        addOutput('');
    });

// Available commands
const commands = {
    help: {
        description: 'Display available commands',
        execute: () => {
            return `Available commands:
  help         - Display this help message
  clear        - Clear the terminal screen
  history      - Show conversation history
  reset        - Reset conversation context
  config       - Show configuration status
  model        - Show or set the Gemini model (e.g., model gemini-2.5-flash)
  about        - Display information about this terminal
  
You can also just type any message to chat with Gemini AI!
The AI will respond with streaming text in real-time.`;
        }
    },
    clear: {
        description: 'Clear the terminal screen',
        execute: () => {
            outputElement.innerHTML = '';
            return null;
        }
    },
    reset: {
        description: 'Reset conversation context',
        execute: () => {
            geminiService.clearHistory();
            return 'Conversation history cleared. Starting fresh!';
        }
    },
    config: {
        description: 'Show configuration status',
        execute: () => {
            if (!configLoaded) {
                return 'Configuration not loaded yet';
            }
            const configured = configService.isConfigured();
            return `Configuration Status:
  API Key: ${configured ? '✓ Configured' : '✗ Not configured'}
  Model: ${configService.getModel()}
  Endpoint: ${configService.getApiEndpoint()}
  
${!configured ? 'Please update config.json with your Gemini API key' : 'Ready to use!'}`;
        }
    },
    model: {
        description: 'Show or set the Gemini model',
        execute: (args) => {
            if (!configLoaded) {
                return 'Configuration not loaded yet';
            }
            
            if (args.length === 0) {
                // Show current model
                return `Current model: ${configService.getModel()}

Available models:
  - gemini-2.5-flash (fastest, recommended)
  - gemini-2.0-flash-exp (experimental)
  - gemini-pro
  - gemini-1.5-pro
  - gemini-1.5-flash

Usage: model <model-name>
Example: model gemini-2.5-flash`;
            } else {
                // Set new model
                const newModel = args[0];
                configService.config.geminiModel = newModel;
                geminiService.clearHistory(); // Clear history when changing models
                return `Model changed to: ${newModel}
Conversation history has been reset.`;
            }
        }
    },
    about: {
        description: 'Display information about this terminal',
        execute: () => {
            return `Gemini Terminal v1.0.0
A browser-based terminal interface powered by Google Gemini AI.
Built with HTML, CSS, and JavaScript.

Features:
- Real-time streaming responses from Gemini AI
- Command history navigation (↑/↓)
- Conversation context management
- Clean, modern terminal interface
- Direct API integration with Google Gemini`;
        }
    },
    history: {
        description: 'Show conversation history',
        execute: () => {
            const history = geminiService.getHistory();
            if (history.length === 0) return 'No conversation history';
            
            let output = 'Conversation History:\n';
            history.forEach((msg, i) => {
                const role = msg.role === 'user' ? 'You' : 'Gemini';
                const text = msg.parts[0]?.text || '';
                const preview = text.length > 100 ? text.substring(0, 100) + '...' : text;
                output += `\n${i + 1}. ${role}: ${preview}`;
            });
            return output;
        }
    }
};

// Add line to output
function addOutput(text, className = '') {
    if (text === null) return;
    
    const lines = text.split('\n');
    lines.forEach(line => {
        const lineElement = document.createElement('div');
        lineElement.className = `terminal-line ${className}`;
        lineElement.textContent = line;
        outputElement.appendChild(lineElement);
    });
    
    // Auto-scroll to bottom
    scrollToBottom();
}

// Process command
async function processCommand(input) {
    const trimmed = input.trim();
    if (!trimmed) return;
    
    // Disable input while processing
    terminal.isProcessing = true;
    inputElement.disabled = true;
    
    // Add to history
    terminal.history.push(trimmed);
    terminal.historyIndex = terminal.history.length;
    
    // Display command
    addOutput(`${promptElement.textContent} ${trimmed}`);
    
    // Parse command
    const parts = trimmed.split(' ');
    const command = parts[0].toLowerCase();
    const args = parts.slice(1);
    
    // Check if it's a built-in command
    if (commands[command]) {
        const result = commands[command].execute(args);
        if (result !== null) {
            addOutput(result);
        }
        terminal.isProcessing = false;
        inputElement.disabled = false;
        inputElement.focus();
    } else {
        // Treat as AI chat message
        if (!configLoaded) {
            addOutput('Please wait for configuration to load...', 'warning');
            terminal.isProcessing = false;
            inputElement.disabled = false;
            inputElement.focus();
            return;
        }

        if (!configService.isConfigured()) {
            addOutput('API key not configured. Please update config.json', 'error');
            terminal.isProcessing = false;
            inputElement.disabled = false;
            inputElement.focus();
            return;
        }

        // Show prompt with loading spinner
        const promptText = 'Gemini: ';
        const promptLine = document.createElement('div');
        promptLine.className = 'terminal-line info';
        promptLine.innerHTML = promptText + '<span class="loading-spinner"></span>';
        outputElement.appendChild(promptLine);
        
        // Create element for streaming response
        const responseElement = document.createElement('div');
        responseElement.className = 'terminal-line';
        responseElement.style.whiteSpace = 'pre-wrap';
        outputElement.appendChild(responseElement);
        terminal.currentStreamingElement = responseElement;

        // Stream response from Gemini
        await geminiService.streamChat(
            trimmed,
            // onChunk
            (chunk) => {
                // Remove spinner on first chunk
                const spinner = promptLine.querySelector('.loading-spinner');
                if (spinner) {
                    spinner.remove();
                }
                
                responseElement.textContent += chunk;
                responseElement.classList.add('streaming');
                
                // Aggressive scrolling to keep view at bottom
                scrollToBottom();
                setTimeout(() => scrollToBottom(), 0);
                requestAnimationFrame(() => scrollToBottom());
            },
            // onComplete
            (fullResponse) => {
                // Remove spinner if still present
                const spinner = promptLine.querySelector('.loading-spinner');
                if (spinner) {
                    spinner.remove();
                }
                
                responseElement.classList.remove('streaming');
                addOutput('');
                terminal.isProcessing = false;
                inputElement.disabled = false;
                inputElement.focus();
            },
            // onError
            (error) => {
                // Remove spinner on error
                const spinner = promptLine.querySelector('.loading-spinner');
                if (spinner) {
                    spinner.remove();
                }
                
                responseElement.classList.remove('streaming');
                addOutput(`\nError: ${error}`, 'error');
                terminal.isProcessing = false;
                inputElement.disabled = false;
                inputElement.focus();
            }
        );
    }
}

// Handle input
inputElement.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
        if (terminal.isProcessing) return;
        const input = inputElement.value;
        inputElement.value = '';
        processCommand(input);
    } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        if (terminal.historyIndex > 0) {
            terminal.historyIndex--;
            inputElement.value = terminal.history[terminal.historyIndex];
        }
    } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        if (terminal.historyIndex < terminal.history.length - 1) {
            terminal.historyIndex++;
            inputElement.value = terminal.history[terminal.historyIndex];
        } else {
            terminal.historyIndex = terminal.history.length;
            inputElement.value = '';
        }
    } else if (e.key === 'Tab') {
        e.preventDefault();
        // Simple tab completion for commands
        const input = inputElement.value;
        const matches = Object.keys(commands).filter(cmd => cmd.startsWith(input));
        if (matches.length === 1) {
            inputElement.value = matches[0];
        } else if (matches.length > 1) {
            addOutput(`${promptElement.textContent} ${input}`);
            addOutput(matches.join('  '), 'info');
        }
    } else if (e.key === 'l' && e.ctrlKey) {
        e.preventDefault();
        commands.clear.execute();
    }
});

// Keep input focused
terminalBody.addEventListener('click', () => {
    if (!terminal.isProcessing) {
        inputElement.focus();
    }
});

// Focus input on load
window.addEventListener('load', () => {
    inputElement.focus();
});
