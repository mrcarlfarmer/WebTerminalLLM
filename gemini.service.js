// Gemini API Service
class GeminiService {
    constructor(configService) {
        this.configService = configService;
        this.conversationHistory = [];
        this.availableModels = [];
    }

    async fetchAvailableModels() {
        try {
            const apiKey = this.configService.getApiKey();
            if (!apiKey || apiKey === 'YOUR_API_KEY_HERE') {
                console.warn('Cannot fetch models: API key not configured');
                return [];
            }

            const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;
            const response = await fetch(url);
            
            if (!response.ok) {
                console.error('Failed to fetch models:', response.status);
                return [];
            }

            const data = await response.json();
            
            // Filter to only include models that support generateContent
            this.availableModels = data.models
                .filter(model => {
                    const methods = model.supportedGenerationMethods || [];
                    return methods.includes('generateContent');
                })
                .map(model => ({
                    name: model.name.replace('models/', ''),
                    displayName: model.displayName,
                    description: model.description
                }))
                .sort((a, b) => b.name.localeCompare(a.name)); // Newest first
            
            console.log('Fetched available models:', this.availableModels);
            return this.availableModels;
        } catch (error) {
            console.error('Error fetching models:', error);
            return [];
        }
    }

    getAvailableModels() {
        return this.availableModels;
    }

    async streamChat(message, onChunk, onComplete, onError) {
        if (!this.configService.isConfigured()) {
            onError('API key not configured. Please update config.json with your Gemini API key.');
            return;
        }

        try {
            // Add user message to history
            this.conversationHistory.push({
                role: 'user',
                parts: [{ text: message }]
            });

            const apiKey = this.configService.getApiKey();
            const model = this.configService.getModel();
            const endpoint = this.configService.getApiEndpoint();
            const url = `${endpoint}/${model}:streamGenerateContent?key=${apiKey}`;

            const requestBody = {
                contents: this.conversationHistory,
                systemInstruction: {
                    parts: [{
                        text: `You are an AI assistant in a terminal interface. 

CRITICAL FORMATTING RULES:
- Use ONLY plain text - no Markdown, HTML, or special formatting
- NO tables, bullet points with symbols, or complex layouts
- Use simple line breaks and spacing for structure
- For lists: use simple numbered lists (1., 2., 3.) or plain dashes (-)
- For emphasis: use UPPERCASE or *asterisks* sparingly
- Keep responses concise and terminal-friendly
- Use simple ASCII art if diagrams are needed
- Break long content into readable paragraphs with blank lines

Your responses will be displayed in a monospace terminal with green text on black background.`
                    }]
                },
                generationConfig: {
                    temperature: 0.9,
                    topK: 40,
                    topP: 0.95,
                    maxOutputTokens: 8192,
                }
            };

            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(requestBody)
            });

            if (!response.ok) {
                const errorData = await response.json();
                const errorMsg = errorData.error?.message || `API request failed with status ${response.status}`;
                console.error('API Error:', errorData);
                throw new Error(`${errorMsg}\n\nModel: ${model}\nEndpoint: ${url}`);
            }

            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let fullResponse = '';
            let buffer = '';

            while (true) {
                const { done, value } = await reader.read();
                
                if (done) {
                    break;
                }

                buffer += decoder.decode(value, { stream: true });
                
                // Try to parse complete JSON objects from buffer
                let startIndex = 0;
                
                // Remove array brackets if present
                buffer = buffer.replace(/^\[/, '').replace(/\]$/, '');
                
                while (true) {
                    // Find the next complete JSON object
                    const openBrace = buffer.indexOf('{', startIndex);
                    if (openBrace === -1) break;
                    
                    let braceCount = 0;
                    let closeBrace = -1;
                    
                    for (let i = openBrace; i < buffer.length; i++) {
                        if (buffer[i] === '{') braceCount++;
                        if (buffer[i] === '}') braceCount--;
                        if (braceCount === 0) {
                            closeBrace = i;
                            break;
                        }
                    }
                    
                    if (closeBrace === -1) {
                        // Incomplete JSON object, keep it in buffer
                        buffer = buffer.substring(openBrace);
                        break;
                    }
                    
                    // Extract complete JSON object
                    const jsonStr = buffer.substring(openBrace, closeBrace + 1);
                    
                    try {
                        const data = JSON.parse(jsonStr);
                        
                        if (data.candidates && data.candidates[0]?.content?.parts) {
                            const text = data.candidates[0].content.parts[0]?.text || '';
                            if (text) {
                                fullResponse += text;
                                onChunk(text);
                            }
                        } else if (data.error) {
                            throw new Error(data.error.message || 'API error in stream');
                        }
                    } catch (e) {
                        console.error('Error parsing JSON:', e);
                    }
                    
                    startIndex = closeBrace + 1;
                    
                    // Skip commas and whitespace
                    while (startIndex < buffer.length && (buffer[startIndex] === ',' || buffer[startIndex] === '\n' || buffer[startIndex] === ' ')) {
                        startIndex++;
                    }
                    
                    if (startIndex >= buffer.length) {
                        buffer = '';
                        break;
                    }
                }
            }

            // Add assistant response to history
            if (fullResponse) {
                this.conversationHistory.push({
                    role: 'model',
                    parts: [{ text: fullResponse }]
                });
            }

            onComplete(fullResponse);

        } catch (error) {
            console.error('Error streaming chat:', error);
            onError(error.message);
        }
    }

    clearHistory() {
        this.conversationHistory = [];
    }

    getHistory() {
        return this.conversationHistory;
    }
}

export default GeminiService;
