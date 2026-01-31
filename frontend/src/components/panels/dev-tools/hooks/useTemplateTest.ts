import { useState } from "react";

interface TemplateTestRequest {
  template: string;
  variables?: Record<string, any>;
}

interface TemplateTestResponse {
  success: boolean;
  result?: string;
  error?: string;
}

interface TemplateValidationResponse {
  valid: boolean;
  error?: string;
}

export function useTemplateTest() {
  const [testing, setTesting] = useState(false);
  const [validating, setValidating] = useState(false);
  const [testResult, setTestResult] = useState<TemplateTestResponse | null>(null);
  const [validationResult, setValidationResult] = useState<TemplateValidationResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const testTemplate = async (request: TemplateTestRequest) => {
    try {
      setTesting(true);
      setError(null);
      setTestResult(null);

      const response = await fetch("/api/dev-tools/templates/test", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(request),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to test template");
      }

      setTestResult({
        success: true,
        result: data.result,
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to test template";
      setError(errorMessage);
      setTestResult({
        success: false,
        error: errorMessage,
      });
    } finally {
      setTesting(false);
    }
  };

  const validateTemplate = async (template: string) => {
    try {
      setValidating(true);
      setError(null);
      setValidationResult(null);

      const response = await fetch("/api/dev-tools/templates/validate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ template }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to validate template");
      }

      setValidationResult({
        valid: data.valid !== false,
        error: data.error,
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to validate template";
      setError(errorMessage);
      setValidationResult({
        valid: false,
        error: errorMessage,
      });
    } finally {
      setValidating(false);
    }
  };

  const clearResults = () => {
    setTestResult(null);
    setValidationResult(null);
    setError(null);
  };

  return {
    testing,
    validating,
    testResult,
    validationResult,
    error,
    testTemplate,
    validateTemplate,
    clearResults,
  };
}
