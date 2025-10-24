// Configuration Service
class ConfigService {
    constructor() {
        this.config = null;
    }

    async loadConfig() {
        try {
            const response = await fetch('./config.json');
            if (!response.ok) {
                throw new Error('Failed to load config file');
            }
            this.config = await response.json();
            return this.config;
        } catch (error) {
            console.error('Error loading config:', error);
            throw error;
        }
    }

    getApiKey() {
        return this.config?.geminiApiKey;
    }

    getModel() {
        return this.config?.geminiModel || 'gemini-2.5-flash';
    }

    getApiEndpoint() {
        return this.config?.apiEndpoint;
    }

    isConfigured() {
        return this.config && this.config.geminiApiKey && this.config.geminiApiKey !== 'YOUR_API_KEY_HERE';
    }
}

export default ConfigService;
