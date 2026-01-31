/**
 * Command Executor
 * 
 * Handles command execution with security checks, rate limiting, and error handling.
 */

import type { CommandRegistry, CommandContext, CommandResult } from "./types";
import { parseCommand, validateInput } from "./utils/command-parser";
import { hasPermission } from "./utils/permissions";
import { checkRateLimit } from "./utils/rate-limiter";
import { getCommand, buildCommandRegistry } from "./command-registry";

// Initialize registry
let commandRegistry: CommandRegistry | null = null;

function getRegistry(): CommandRegistry {
  if (!commandRegistry) {
    commandRegistry = buildCommandRegistry();
  }
  return commandRegistry;
}

export interface ExecuteCommandOptions {
  input: string;
  context: CommandContext;
}

export interface ExecuteCommandResult {
  success: boolean;
  result?: CommandResult;
  error?: string;
  command?: string;
  rateLimited?: boolean;
  retryAfter?: number;
}

/**
 * Execute a command with full security checks
 */
export async function executeCommand(
  options: ExecuteCommandOptions
): Promise<ExecuteCommandResult> {
  const { input, context } = options;

  // Validate input
  const validation = validateInput(input);
  if (!validation.valid) {
    return {
      success: false,
      error: validation.error || "Invalid input",
    };
  }

  // Check rate limiting
  const rateLimit = checkRateLimit(context.userId);
  if (!rateLimit.allowed) {
    return {
      success: false,
      error: `Rate limit exceeded. Please wait ${rateLimit.retryAfter} seconds before trying again.`,
      rateLimited: true,
      retryAfter: rateLimit.retryAfter,
    };
  }

  // Parse command
  const parsed = parseCommand(input);
  if (!parsed.command) {
    return {
      success: false,
      error: "No command provided",
    };
  }

  // Get command definition
  const registry = getRegistry();
  const commandDef = getCommand(parsed.command, registry);

  if (!commandDef) {
    return {
      success: false,
      error: `Command not found: ${parsed.command}. Type 'help' to see available commands.`,
      command: parsed.command,
    };
  }

  // Check permissions
  if (!hasPermission(commandDef.permissionLevel, context)) {
    return {
      success: false,
      error: `Permission denied. This command requires ${commandDef.permissionLevel} access.`,
      command: parsed.command,
    };
  }

  // Execute command with error handling
  try {
    const result = await commandDef.execute(parsed.args, context);
    return {
      success: result.success,
      result,
      command: parsed.command,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "An unexpected error occurred",
      command: parsed.command,
    };
  }
}

/**
 * Get command suggestions for autocomplete
 */
export function getCommandSuggestions(input: string): string[] {
  const registry = getRegistry();
  const suggestions: string[] = [];

  if (!input) {
    return suggestions;
  }

  const lowerInput = input.toLowerCase();

  for (const commandName of Object.keys(registry)) {
    if (commandName.startsWith(lowerInput)) {
      suggestions.push(registry[commandName].name);
    }
  }

  return suggestions.slice(0, 10); // Limit to 10 suggestions
}
