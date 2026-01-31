/**
 * Assist Service
 * 
 * Provides Home Assistant Assist (conversational AI) integration
 * for developer tools and debugging.
 */

import { createHARestClient } from '@/lib/home-assistant/rest-client';
import { HARestClientError } from '@/lib/home-assistant/rest-client';

export interface ConversationMessage {
  message: string;
  language?: string;
  conversationId?: string;
}

export interface ConversationResponse {
  success: boolean;
  response?: {
    speech?: {
      plain?: {
        speech: string;
      };
    };
    data?: {
      conversation_id?: string;
      slots?: Record<string, any>;
    };
  };
  conversationId: string;
  error?: string;
}

export interface Conversation {
  conversationId: string;
  messages: Array<{
    role: 'user' | 'assistant';
    message: string;
    timestamp: string;
  }>;
}

export interface AssistSettings {
  enabled: boolean;
  language: string;
  supportedLanguages: string[];
  voiceEnabled: boolean;
  conversationAgents: Array<{
    id: string;
    name: string;
    enabled: boolean;
  }>;
}

export interface AssistExamples {
  examples: Array<{
    category: string;
    commands: string[];
  }>;
}

/**
 * Assist Service
 */
export class AssistService {
  // In-memory conversation storage (for demo purposes)
  // In production, this could be stored in database
  private conversations: Map<string, Conversation> = new Map();

  /**
   * Process a conversation message with Home Assistant Assist
   */
  async processMessage(params: ConversationMessage): Promise<ConversationResponse> {
    try {
      const haClient = createHARestClient();
      const { baseUrl, accessToken } = await (haClient as any).getCredentials();
      
      // Normalize URL
      const normalizedUrl = baseUrl.replace(/\/$/, '');
      
      // Prepare request body for HA conversation API
      const requestBody: any = {
        text: params.message,
      };

      if (params.language) {
        requestBody.language = params.language;
      }

      if (params.conversationId) {
        requestBody.conversation_id = params.conversationId;
      }

      // Call Home Assistant's conversation API
      // POST /api/conversation/process
      const response = await fetch(`${normalizedUrl}/api/conversation/process`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new HARestClientError(
          errorData.message || `HTTP ${response.status}: ${response.statusText}`,
          response.status,
          false
        );
      }

      const data = await response.json();
      const conversationId = data.conversation_id || params.conversationId || this.generateConversationId();

      // Store conversation message
      this.storeMessage(conversationId, 'user', params.message);
      
      // Extract speech response
      const speechText = data.speech?.plain?.speech || data.response?.speech?.plain?.speech || 'No response';
      if (speechText && speechText !== 'No response') {
        this.storeMessage(conversationId, 'assistant', speechText);
      }

      return {
        success: true,
        response: data,
        conversationId,
      };
    } catch (error: any) {
      const conversationId = params.conversationId || this.generateConversationId();
      
      return {
        success: false,
        conversationId,
        error: error.message || 'Failed to process conversation message',
      };
    }
  }

  /**
   * Get conversation history
   */
  async getConversation(conversationId: string): Promise<Conversation | null> {
    return this.conversations.get(conversationId) || null;
  }

  /**
   * Clear conversation
   */
  async clearConversation(conversationId: string): Promise<{ success: boolean }> {
    this.conversations.delete(conversationId);
    return { success: true };
  }

  /**
   * Get Assist settings
   */
  async getSettings(): Promise<AssistSettings> {
    try {
      const haClient = createHARestClient();
      const { baseUrl, accessToken } = await (haClient as any).getCredentials();
      
      const normalizedUrl = baseUrl.replace(/\/$/, '');
      
      // Try to get Assist settings from HA
      // This endpoint may not exist in all HA versions
      try {
        const response = await fetch(`${normalizedUrl}/api/assist_pipeline/list`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
        });

        if (response.ok) {
          const data = await response.json();
          return {
            enabled: true,
            language: 'en',
            supportedLanguages: ['en', 'es', 'fr', 'de'],
            voiceEnabled: false,
            conversationAgents: Array.isArray(data) ? data.map((pipeline: any) => ({
              id: pipeline.id || 'default',
              name: pipeline.name || 'Default',
              enabled: true,
            })) : [],
          };
        }
      } catch {
        // Endpoint not available, return defaults
      }

      // Return default settings
      return {
        enabled: true,
        language: 'en',
        supportedLanguages: ['en', 'es', 'fr', 'de'],
        voiceEnabled: false,
        conversationAgents: [
          {
            id: 'homeassistant',
            name: 'Home Assistant',
            enabled: true,
          },
        ],
      };
    } catch (error: any) {
      // Return default settings on error
      return {
        enabled: false,
        language: 'en',
        supportedLanguages: ['en'],
        voiceEnabled: false,
        conversationAgents: [],
      };
    }
  }

  /**
   * Update Assist settings
   */
  async updateSettings(settings: Partial<AssistSettings>): Promise<AssistSettings> {
    // In a real implementation, this would update HA settings
    // For now, just return the updated settings
    const currentSettings = await this.getSettings();
    return {
      ...currentSettings,
      ...settings,
    };
  }

  /**
   * Get example commands
   */
  getExamples(): AssistExamples {
    return {
      examples: [
        {
          category: 'Light Control',
          commands: [
            'Turn on the living room light',
            'Turn off all lights',
            'Set bedroom light to 50%',
            'Dim the kitchen lights',
          ],
        },
        {
          category: 'Climate',
          commands: [
            "What's the temperature?",
            'Set thermostat to 72 degrees',
            'Turn on the air conditioning',
            'What is the humidity?',
          ],
        },
        {
          category: 'Switches',
          commands: [
            'Turn on the coffee maker',
            'Turn off the TV',
            'Toggle the garage door',
          ],
        },
        {
          category: 'Information',
          commands: [
            'What devices are online?',
            'Show me the status of all lights',
            'What is the current time?',
          ],
        },
      ],
    };
  }

  /**
   * Store a message in conversation history
   */
  private storeMessage(conversationId: string, role: 'user' | 'assistant', message: string): void {
    if (!this.conversations.has(conversationId)) {
      this.conversations.set(conversationId, {
        conversationId,
        messages: [],
      });
    }

    const conversation = this.conversations.get(conversationId)!;
    conversation.messages.push({
      role,
      message,
      timestamp: new Date().toISOString(),
    });

    // Limit conversation history to last 50 messages
    if (conversation.messages.length > 50) {
      conversation.messages = conversation.messages.slice(-50);
    }
  }

  /**
   * Generate a new conversation ID
   */
  private generateConversationId(): string {
    return `conv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

/**
 * Singleton instance
 */
let assistService: AssistService | null = null;

/**
 * Get or create singleton instance
 */
export function getAssistService(): AssistService {
  if (!assistService) {
    assistService = new AssistService();
  }
  return assistService;
}
