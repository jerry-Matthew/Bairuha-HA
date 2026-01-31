import { useState, useEffect } from "react";

interface EventTriggerRequest {
  eventType: string;
  eventData: Record<string, any>;
  metadata?: Record<string, any>;
}

interface EventTriggerResponse {
  success: boolean;
  eventId?: string;
  result?: any;
  error?: string;
}

export function useEventTrigger() {
  const [eventTypes, setEventTypes] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<EventTriggerResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loadingEventTypes, setLoadingEventTypes] = useState(false);

  const fetchEventTypes = async () => {
    try {
      setLoadingEventTypes(true);
      const response = await fetch("/api/dev-tools/events/types");
      if (!response.ok) {
        throw new Error("Failed to fetch event types");
      }
      const data = await response.json();
      setEventTypes(data.eventTypes || []);
    } catch (err) {
      console.error("Failed to fetch event types:", err);
    } finally {
      setLoadingEventTypes(false);
    }
  };

  useEffect(() => {
    fetchEventTypes();
  }, []);

  const triggerEvent = async (request: EventTriggerRequest) => {
    try {
      setLoading(true);
      setError(null);
      setResult(null);

      const response = await fetch("/api/dev-tools/events/trigger", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(request),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to trigger event");
      }

      setResult({
        success: true,
        eventId: data.eventId,
        result: data,
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to trigger event";
      setError(errorMessage);
      setResult({
        success: false,
        error: errorMessage,
      });
    } finally {
      setLoading(false);
    }
  };

  const clearResult = () => {
    setResult(null);
    setError(null);
  };

  return {
    eventTypes,
    loading,
    loadingEventTypes,
    result,
    error,
    triggerEvent,
    clearResult,
    refreshEventTypes: fetchEventTypes,
  };
}
