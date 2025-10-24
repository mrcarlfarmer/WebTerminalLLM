# Gemini Terminal LLM

A web-based terminal interface that connects to Google's Gemini API for real-time AI conversations.

## Features

- 🤖 **Real-time AI Chat**: Stream responses from Google Gemini AI directly in your terminal
- 💬 **Conversation Context**: Maintains conversation history for contextual responses
- ⚡ **Streaming Responses**: See AI responses appear in real-time, character by character
- 🎨 **Modern Terminal UI**: Beautiful terminal interface with a retro aesthetic and dynamic parallax background
- 🌊 **Interactive Parallax**: Background gradients react to your typing with smooth animations
- 📝 **Command History**: Navigate through previous commands with arrow keys
- 🔄 **Model Switching**: Switch between different Gemini models on the fly
- 💡 **Auto-complete**: Ghost text suggestions as you type commands
- 🔧 **Easy Configuration**: Simple JSON config file for API setup

## Setup

1. **Get a Gemini API Key**
   - Visit [Google AI Studio](https://makersuite.google.com/app/apikey)
   - Create a new API key

2. **Configure the Application**
   - Open `config.json`
   - Replace `YOUR_API_KEY_HERE` with your actual API key:
   ```json
   {
     "geminiApiKey": "your-actual-api-key-here",
     "geminiModel": "gemini-pro",
     "apiEndpoint": "https://generativelanguage.googleapis.com/v1beta/models"
   }
   ```

3. **Run the Application**
   - Open `index.html` in a modern web browser
   - Or serve with a local HTTP server:
     ```bash
     python -m http.server 8000
     # Then open http://localhost:8000
     ```

## Usage

### Built-in Commands

- `help` - Display available commands
- `clear` - Clear the terminal screen
- `history` - Show conversation history
- `reset` - Reset conversation context
- `config` - Show configuration status
- `about` - Display information about this terminal
- `model` - List available models or switch models
- `model -v` - Show detailed model descriptions

### Chat with AI

Simply type any message (that isn't a built-in command) and press Enter. The AI will respond with streaming text in real-time.

**Example:**
```
user@gemini:~$ What is quantum computing?
Gemini: [streaming response appears here...]
```

### Keyboard Shortcuts

- `↑` / `↓` - Navigate command history
- `Tab` - Auto-complete commands
- `Ctrl+L` - Clear screen
- `Enter` - Submit command/message

## Architecture

The application uses a modular service-based architecture:

- **ConfigService** (`config.service.js`) - Handles loading and managing configuration
- **GeminiService** (`gemini.service.js`) - Manages API communication and streaming
- **Main App** (`script.js`) - Terminal UI and command processing
- **Styles** (`style.css`) - Terminal styling and animations

## Browser Compatibility

Requires a modern browser with support for:
- ES6 Modules
- Fetch API
- Streams API
- Async/Await

Tested on:
- Chrome 90+
- Firefox 89+
- Edge 90+
- Safari 14+

## Notes

- The application makes direct API calls from the browser (no backend server)
- API key is loaded from a local config file
- Conversation history is stored in memory (resets on page reload)
- Streaming uses the Gemini API's streaming endpoint

## Security Considerations

⚠️ **Important**: This is a client-side application. Your API key will be visible in the config file and network requests. For production use, consider:

- Implementing a backend proxy to hide the API key
- Adding rate limiting and authentication
- Using environment variables instead of config files
- Implementing proper error handling and validation

## License

MIT License - feel free to modify and use as needed!
