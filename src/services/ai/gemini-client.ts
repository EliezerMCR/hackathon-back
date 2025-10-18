/**
 * Gemini AI Client Service
 * Manages connection and communication with Google's Gemini AI
 */
import { GoogleGenerativeAI, Content } from '@google/generative-ai';

export class GeminiClient {
  private genAI?: GoogleGenerativeAI;
  private model?: any;

  /**
   * Initialize the client lazily (only when needed)
   */
  private initialize() {
    if (this.genAI) {
      return; // Already initialized
    }

    // Support both GEMINI_API_KEY and GOOGLE_API_KEY for compatibility
    const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;

    if (!apiKey) {
      throw new Error('GEMINI_API_KEY or GOOGLE_API_KEY is not defined in environment variables');
    }

    this.genAI = new GoogleGenerativeAI(apiKey);

    // Use gemini-1.5-pro for better function calling support
    // gemini-2.0-flash-exp has issues with function calling (generates code instead)
    const modelName = process.env.GEMINI_MODEL || 'gemini-2.5-flash-lite';

    this.model = this.genAI.getGenerativeModel({
      model: modelName,
      generationConfig: {
        temperature: 0.7,
        topP: 0.95,
        topK: 40,
        maxOutputTokens: 8192,
      },
    });
  }

  /**
   * Generates content with tool support (function calling)
   */
  async generateContentWithTools(
    prompt: string,
    tools: any[],
    history?: Content[]
  ) {
    this.initialize();

    const chat = this.model!.startChat({
      history,
      tools: [{ functionDeclarations: tools }],
    });

    const result = await chat.sendMessage(prompt);
    return {
      response: result.response,
      chat,
    };
  }

  /**
   * Simple text generation without tools
   */
  async generateContent(prompt: string) {
    this.initialize();

    const result = await this.model!.generateContent(prompt);
    return result.response.text();
  }

  /**
   * Get the model instance for advanced usage
   */
  getModel() {
    this.initialize();
    return this.model!;
  }
}
