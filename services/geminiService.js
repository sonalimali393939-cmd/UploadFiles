const { GoogleGenAI } = require('@google/genai');

/**
 * Service to interact with Google Gemini AI via the official @google/genai SDK
 */
class GeminiService {
  constructor() {
    this.apiKey = process.env.GEMINI_API_KEY;
    this.modelName = process.env.GEMINI_MODEL || 'gemini-3-flash-preview';
  }

  /**
   * Lazily get or initialize the GoogleGenAI client
   */
  getClient() {
    const key = process.env.GEMINI_API_KEY || this.apiKey;
    if (!key) {
      throw new Error(
        'GEMINI_API_KEY is not configured in the environment variables. Please add your Google Gemini API key to .env'
      );
    }
    return new GoogleGenAI({ apiKey: key });
  }

  /**
   * Improve post content using Google Gemini AI
   * @param {Object} post - Original post document { title, description, content, category }
   * @returns {Promise<{ title: string, description: string, content: string }>}
   */
  async improvePostContent(post) {
    const ai = this.getClient();

    const prompt = `
You are an expert editorial assistant and professional content writer.
Please enhance and improve the following article draft.
Your goal is to:
1. Fix any grammatical, spelling, or structural errors.
2. Enhance engagement, clarity, narrative flow, and readability.
3. Keep the original topic, core message, meaning, and tone intact.
4. Provide a refined catchy title, a compelling meta description (under 200 characters), and an elevated version of the content.

Original Post Details:
- Category: ${post.category || 'General'}
- Current Title: ${post.title}
- Current Description: ${post.description}
- Current Content:
${post.content}

IMPORTANT: Respond ONLY with a valid JSON object matching the following structure (do NOT include markdown code blocks, backticks, or extra commentary):
{
  "title": "Refined and engaging title",
  "description": "Engaging, concise description under 200 characters",
  "content": "Fully rewritten, well-structured, polished content"
}
`;

    try {
      const modelsToTry = [
        process.env.GEMINI_MODEL || this.modelName,
        'gemini-3-flash-preview',
        'gemini-flash-latest',
        'gemini-3.8-flash',
      ].filter((m, i, arr) => m && arr.indexOf(m) === i);

      let responseText = null;
      let lastError = null;

      for (const model of modelsToTry) {
        try {
          const response = await ai.models.generateContent({
            model,
            contents: prompt,
          });
          if (response && response.text) {
            responseText = response.text;
            break;
          }
        } catch (err) {
          lastError = err;
        }
      }

      if (!responseText) {
        throw lastError || new Error('Received an empty response from Gemini AI.');
      }

      // Clean up possible markdown code blocks ```json ... ```
      responseText = responseText.trim();
      if (responseText.startsWith('```')) {
        responseText = responseText.replace(/^```(json)?\n?/, '').replace(/\n?```$/, '');
      }

      try {
        const parsed = JSON.parse(responseText);
        return {
          title: parsed.title || `[Improved] ${post.title}`,
          description: parsed.description || post.description,
          content: parsed.content || responseText,
        };
      } catch (parseError) {
        // Fallback if model didn't return pure JSON
        return {
          title: `[Improved] ${post.title}`,
          description: post.description,
          content: responseText,
        };
      }
    } catch (error) {
      console.error('Error invoking Gemini AI:', error.message);
      throw new Error(`Gemini AI service error: ${error.message}`);
    }
  }
}

module.exports = new GeminiService();
