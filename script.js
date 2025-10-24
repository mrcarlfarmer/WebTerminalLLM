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
const ghostElement = document.getElementById('ghost');

let currentSuggestion = '';
let availableModels = [];

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

// Inline suggestion functions
function updateSuggestion(input) {
    if (!input.trim()) {
        ghostElement.textContent = '';
        ghostElement.setAttribute('data-suggestion', '');
        currentSuggestion = '';
        return;
    }

    const parts = input.split(' ');
    const command = parts[0].toLowerCase();
    
    // Command completion
    if (parts.length === 1) {
        const matches = Object.keys(commands).filter(cmd => 
            cmd.startsWith(command) && cmd !== command
        );
        
        if (matches.length > 0) {
            const suggestion = matches[0];
            currentSuggestion = suggestion;
            // Show the typed text invisibly, then the suggestion in grey
            ghostElement.textContent = input;
            ghostElement.setAttribute('data-suggestion', suggestion.substring(command.length));
            return;
        }
    }
    
    // Model command completion
    if (command === 'model' && parts.length === 2) {
        const modelInput = parts[1].toLowerCase();
        const matches = availableModels.filter(model => 
            model.toLowerCase().startsWith(modelInput) && model.toLowerCase() !== modelInput
        );
        
        if (matches.length > 0) {
            const suggestion = matches[0];
            currentSuggestion = suggestion;
            // Show the typed text invisibly, then the suggestion in grey
            ghostElement.textContent = input;
            ghostElement.setAttribute('data-suggestion', suggestion.substring(modelInput.length));
            return;
        }
    }
    
    ghostElement.textContent = '';
    ghostElement.setAttribute('data-suggestion', '');
    currentSuggestion = '';
}

function applySuggestion() {
    if (currentSuggestion) {
        const parts = inputElement.value.split(' ');
        
        if (parts.length === 1) {
            // Complete command
            inputElement.value = currentSuggestion + ' ';
        } else if (parts[0].toLowerCase() === 'model' && parts.length === 2) {
            // Complete model name
            inputElement.value = 'model ' + currentSuggestion;
        }
        
        suggestionElement.textContent = '';
        currentSuggestion = '';
        return true;
    }
    return false;
}

// Load configuration on startup
let configLoaded = false;
configService.loadConfig()
    .then(async () => {
        configLoaded = true;
        if (configService.isConfigured()) {
            addOutput('✓ Configuration loaded successfully', 'info');
            
            // Fetch available models from API
            addOutput('⟳ Fetching available models...', 'info');
            const models = await geminiService.fetchAvailableModels();
            if (models.length > 0) {
                availableModels = models.map(m => m.name);
                addOutput(`✓ Loaded ${models.length} available models`, 'info');
            } else {
                // Fallback to default list
                availableModels = [
                    'gemini-2.5-flash',
                    'gemini-2.0-flash-exp',
                    'gemini-1.5-pro',
                    'gemini-1.5-flash'
                ];
                addOutput('⚠ Using default model list', 'warning');
            }
            
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
                // Show current model and list available models
                const models = geminiService.getAvailableModels();
                let output = `Current model: ${configService.getModel()}\n\nAvailable models:\n`;
                
                if (models.length > 0) {
                    models.forEach(model => {
                        const isCurrent = model.name === configService.getModel() ? ' (current)' : '';
                        output += `  - ${model.name}${isCurrent}\n`;
                        if (model.description) {
                            output += `    ${model.description}\n`;
                        }
                    });
                } else {
                    output += `  - gemini-2.5-flash (fastest, recommended)
  - gemini-2.0-flash-exp (experimental)
  - gemini-1.5-pro (advanced reasoning)
  - gemini-1.5-flash (balanced speed and capability)`;
                }
                
                output += '\n\nUsage: model <model-name>\nExample: model gemini-1.5-pro';
                return output;
            } else {
                // Set new model
                const newModel = args[0];
                const models = geminiService.getAvailableModels();
                const validModels = models.length > 0 
                    ? models.map(m => m.name.toLowerCase())
                    : availableModels.map(m => m.toLowerCase());
                
                if (!validModels.includes(newModel.toLowerCase())) {
                    let output = `Invalid model: ${newModel}\n\nAvailable models:\n`;
                    if (models.length > 0) {
                        models.forEach(model => {
                            output += `  - ${model.name}\n`;
                        });
                    } else {
                        output += `  - gemini-2.5-flash
  - gemini-2.0-flash-exp
  - gemini-1.5-pro
  - gemini-1.5-flash`;
                    }
                    return output;
                }
                
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
        
        ghostElement.textContent = '';
        ghostElement.setAttribute('data-suggestion', '');
        currentSuggestion = '';
        const input = inputElement.value;
        inputElement.value = '';
        processCommand(input);
    } else if (e.key === 'Tab') {
        e.preventDefault();
        if (applySuggestion()) {
            updateSuggestion(inputElement.value);
        }
    } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        if (terminal.historyIndex > 0) {
            terminal.historyIndex--;
            inputElement.value = terminal.history[terminal.historyIndex];
            updateSuggestion(inputElement.value);
        }
    } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        if (terminal.historyIndex < terminal.history.length - 1) {
            terminal.historyIndex++;
            inputElement.value = terminal.history[terminal.historyIndex];
            updateSuggestion(inputElement.value);
        } else {
            terminal.historyIndex = terminal.history.length;
            inputElement.value = '';
            ghostElement.textContent = '';
            ghostElement.setAttribute('data-suggestion', '');
            currentSuggestion = '';
        }
    } else if (e.key === 'Escape') {
        ghostElement.textContent = '';
        ghostElement.setAttribute('data-suggestion', '');
        currentSuggestion = '';
    } else if (e.key === 'l' && e.ctrlKey) {
        e.preventDefault();
        commands.clear.execute();
        ghostElement.textContent = '';
        ghostElement.setAttribute('data-suggestion', '');
        currentSuggestion = '';
    }
});

// Show inline suggestion as user types
inputElement.addEventListener('input', (e) => {
    updateSuggestion(e.target.value);
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
