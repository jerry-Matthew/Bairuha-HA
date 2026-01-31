import { useState } from "react";

interface YAMLValidationParams {
  yaml: string;
  fileType?: 'configuration' | 'automation' | 'script' | 'scene' | 'group' | 'custom';
}

interface YAMLValidationResult {
  valid: boolean;
  errors: Array<{ message: string; line?: number; column?: number; detail?: string }>;
  warnings: Array<{ message: string; line?: number }>;
  data?: any;
}

interface ConfigCheckResult {
  valid: boolean;
  errors: Array<{ message: string; line?: number; detail?: string }>;
  warnings: Array<{ message: string; line?: number }>;
}

interface ReloadResult {
  success: boolean;
  reloaded: string[];
  errors: Array<{ message: string }>;
}

export function useYAMLValidator() {
  const [validating, setValidating] = useState(false);
  const [checking, setChecking] = useState(false);
  const [reloading, setReloading] = useState(false);
  const [validationResult, setValidationResult] = useState<YAMLValidationResult | null>(null);
  const [checkResult, setCheckResult] = useState<ConfigCheckResult | null>(null);
  const [reloadResult, setReloadResult] = useState<ReloadResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const validateYAML = async (params: YAMLValidationParams) => {
    try {
      setValidating(true);
      setError(null);

      const response = await fetch('/api/dev-tools/yaml/validate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(params),
      });

      if (!response.ok) {
        throw new Error('Failed to validate YAML');
      }

      const result: YAMLValidationResult = await response.json();
      setValidationResult(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to validate YAML');
      setValidationResult(null);
    } finally {
      setValidating(false);
    }
  };

  const checkConfiguration = async (params: YAMLValidationParams) => {
    try {
      setChecking(true);
      setError(null);

      const response = await fetch('/api/dev-tools/yaml/check-config', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(params),
      });

      if (!response.ok) {
        throw new Error('Failed to check configuration');
      }

      const result: ConfigCheckResult = await response.json();
      setCheckResult(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to check configuration');
      setCheckResult(null);
    } finally {
      setChecking(false);
    }
  };

  const reloadConfiguration = async (domain: string) => {
    try {
      setReloading(true);
      setError(null);

      const response = await fetch('/api/dev-tools/yaml/reload', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ domain }),
      });

      if (!response.ok) {
        throw new Error('Failed to reload configuration');
      }

      const result: ReloadResult = await response.json();
      setReloadResult(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to reload configuration');
      setReloadResult(null);
    } finally {
      setReloading(false);
    }
  };

  const clearResults = () => {
    setValidationResult(null);
    setCheckResult(null);
    setReloadResult(null);
    setError(null);
  };

  return {
    validating,
    checking,
    reloading,
    validationResult,
    checkResult,
    reloadResult,
    error,
    validateYAML,
    checkConfiguration,
    reloadConfiguration,
    clearResults,
  };
}
