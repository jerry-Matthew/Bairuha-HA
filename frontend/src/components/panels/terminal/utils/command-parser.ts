/**
 * Command Parser
 * 
 * Parses user input into command name and arguments.
 * Handles quoted strings and special characters safely.
 */

export interface ParsedCommand {
  command: string;
  subcommand?: string;
  args: string[];
}

/**
 * Parse command string into command name, optional subcommand, and arguments
 * Handles quoted strings and escapes special characters
 * Supports hierarchical commands like "core info" or "supervisor restart"
 */
export function parseCommand(input: string): ParsedCommand {
  const trimmed = input.trim();

  if (!trimmed) {
    return { command: "", args: [] };
  }

  const parts: string[] = [];
  let current = "";
  let inQuotes = false;
  let quoteChar = '';

  for (let i = 0; i < trimmed.length; i++) {
    const char = trimmed[i];

    if ((char === '"' || char === "'") && !inQuotes) {
      inQuotes = true;
      quoteChar = char;
      continue;
    }

    if (char === quoteChar && inQuotes) {
      inQuotes = false;
      quoteChar = '';
      if (current) {
        parts.push(current);
        current = "";
      }
      continue;
    }

    if (char === " " && !inQuotes) {
      if (current) {
        parts.push(current);
        current = "";
      }
      continue;
    }

    current += char;
  }

  if (current) {
    parts.push(current);
  }

  const command = parts[0] || "";
  // Check if second part is a subcommand or an argument
  // Subcommands are typically single words without special characters
  const subcommand = parts.length > 1 && /^[a-zA-Z][a-zA-Z0-9_-]*$/.test(parts[1])
    ? parts[1]
    : undefined;
  const args = subcommand ? parts.slice(2) : parts.slice(1);

  return { command, subcommand, args };
}

/**
 * Validate command input for security
 * Prevents potentially dangerous input patterns
 */
export function validateInput(input: string): { valid: boolean; error?: string } {
  // Block common shell injection patterns
  const dangerousPatterns = [
    /[;&|`$(){}[\]<>]/,
    /eval\s*\(/i,
    /exec\s*\(/i,
    /spawn/i,
    /child_process/i,
    /process\./i,
    /require\s*\(/i,
    /import\s*\(/i,
  ];

  for (const pattern of dangerousPatterns) {
    if (pattern.test(input)) {
      return {
        valid: false,
        error: "Input contains potentially unsafe characters or patterns.",
      };
    }
  }

  // Limit input length
  if (input.length > 1000) {
    return {
      valid: false,
      error: "Input too long. Maximum length is 1000 characters.",
    };
  }

  return { valid: true };
}
