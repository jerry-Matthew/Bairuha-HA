import { useState } from "react";

interface ServiceCallRequest {
  domain: string;
  service: string;
  serviceData?: Record<string, any>;
}

interface ServiceCallResponse {
  success: boolean;
  result?: any;
  error?: string;
}

export function useServiceCall() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ServiceCallResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const executeServiceCall = async (request: ServiceCallRequest) => {
    try {
      setLoading(true);
      setError(null);
      setResult(null);

      const response = await fetch("/api/dev-tools/service-call", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(request),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to execute service call");
      }

      setResult({
        success: true,
        result: data,
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to execute service call";
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
    loading,
    result,
    error,
    executeServiceCall,
    clearResult,
  };
}
