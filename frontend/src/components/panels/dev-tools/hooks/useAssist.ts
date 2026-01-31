import { useState, useCallback } from "react";

interface ConversationMessage {
  message: string;
  language?: string;
  conversationId?: string;
}

interface ConversationResponse {
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

interface Conversation {
  conversationId: string;
  messages: Array<{
    role: 'user' | 'assistant';
    message: string;
    timestamp: string;
  }>;
}

interface AssistSettings {
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

interface AssistExamples {
  examples: Array<{
    category: string;
    commands: string[];
  }>;
}

export function useAssist() {
  const [processing, setProcessing] = useState(false);
  const [loadingSettings, setLoadingSettings] = useState(false);
  const [loadingExamples, setLoadingExamples] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [conversationResponse, setConversationResponse] = useState<ConversationResponse | null>(null);
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [settings, setSettings] = useState<AssistSettings | null>(null);
  const [examples, setExamples] = useState<AssistExamples | null>(null);
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);

  const processMessage = useCallback(async (params: ConversationMessage) => {
    try {
      setProcessing(true);
      setError(null);

      const response = await fetch('/api/dev-tools/assist/conversation', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...params,
          conversationId: params.conversationId || currentConversationId,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to process message');
      }

      const result: ConversationResponse = await response.json();
      setConversationResponse(result);
      
      if (result.conversationId) {
        setCurrentConversationId(result.conversationId);
        // Fetch updated conversation history
        await fetchConversation(result.conversationId);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to process message');
      setConversationResponse(null);
    } finally {
      setProcessing(false);
    }
  }, [currentConversationId]);

  const fetchConversation = useCallback(async (conversationId: string) => {
    try {
      const response = await fetch(`/api/dev-tools/assist/conversation/${conversationId}`);

      if (!response.ok) {
        if (response.status === 404) {
          // Conversation doesn't exist yet, that's okay
          return;
        }
        throw new Error('Failed to fetch conversation');
      }

      const result: Conversation = await response.json();
      setConversation(result);
    } catch (err) {
      console.error('Failed to fetch conversation:', err);
    }
  }, []);

  const clearConversation = useCallback(async (conversationId: string) => {
    try {
      const response = await fetch(`/api/dev-tools/assist/conversation/${conversationId}/clear`, {
        method: 'POST',
      });

      if (!response.ok) {
        throw new Error('Failed to clear conversation');
      }

      setConversation(null);
      setCurrentConversationId(null);
      setConversationResponse(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to clear conversation');
    }
  }, []);

  const fetchSettings = useCallback(async () => {
    try {
      setLoadingSettings(true);
      setError(null);

      const response = await fetch('/api/dev-tools/assist/settings');

      if (!response.ok) {
        throw new Error('Failed to fetch settings');
      }

      const result: AssistSettings = await response.json();
      setSettings(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch settings');
    } finally {
      setLoadingSettings(false);
    }
  }, []);

  const updateSettings = useCallback(async (newSettings: Partial<AssistSettings>) => {
    try {
      setLoadingSettings(true);
      setError(null);

      const response = await fetch('/api/dev-tools/assist/settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newSettings),
      });

      if (!response.ok) {
        throw new Error('Failed to update settings');
      }

      const data = await response.json();
      if (data.settings) {
        setSettings(data.settings);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update settings');
    } finally {
      setLoadingSettings(false);
    }
  }, []);

  const fetchExamples = useCallback(async () => {
    try {
      setLoadingExamples(true);
      setError(null);

      const response = await fetch('/api/dev-tools/assist/examples');

      if (!response.ok) {
        throw new Error('Failed to fetch examples');
      }

      const result: AssistExamples = await response.json();
      setExamples(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch examples');
    } finally {
      setLoadingExamples(false);
    }
  }, []);

  return {
    processing,
    loadingSettings,
    loadingExamples,
    error,
    conversationResponse,
    conversation,
    settings,
    examples,
    currentConversationId,
    processMessage,
    fetchConversation,
    clearConversation,
    fetchSettings,
    updateSettings,
    fetchExamples,
  };
}
