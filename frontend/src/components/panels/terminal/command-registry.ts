/**
 * Command Registry
 * 
 * Central registry for all available terminal commands.
 * Commands are registered here and validated before execution.
 */

import type { CommandDefinition, CommandRegistry } from "./types";
import * as appCommands from "./commands/app-commands";
import * as diagnosticCommands from "./commands/diagnostic-commands";
import * as simulatedCommands from "./commands/simulated-commands";
import { bannerCommand } from "./commands/banner-command";

// Import all command definitions
const allCommands: CommandDefinition[] = [
  // System commands
  bannerCommand,

  // Application commands
  appCommands.helpCommand,
  appCommands.clearCommand,
  appCommands.statusCommand,
  appCommands.versionCommand,
  appCommands.envCommand,
  appCommands.uptimeCommand,

  // Diagnostic commands
  diagnosticCommands.logsCommand,
  diagnosticCommands.healthCommand,
  diagnosticCommands.pingCommand,

  // Simulated commands
  simulatedCommands.dockerCommand,
  simulatedCommands.gitCommand,
  simulatedCommands.npmCommand,
];

/**
 * Build the command registry from all command definitions
 * Supports both command names and aliases
 */
export function buildCommandRegistry(): CommandRegistry {
  const registry: CommandRegistry = {};

  for (const command of allCommands) {
    // Register main command name
    registry[command.name.toLowerCase()] = command;

    // Register aliases if they exist
    if (command.aliases) {
      for (const alias of command.aliases) {
        registry[alias.toLowerCase()] = command;
      }
    }
  }

  return registry;
}

/**
 * Get command by name (case-insensitive)
 */
export function getCommand(commandName: string, registry: CommandRegistry): CommandDefinition | undefined {
  return registry[commandName.toLowerCase()];
}

/**
 * Get all available commands (for help, autocomplete, etc.)
 */
export function getAllCommands(registry: CommandRegistry): CommandDefinition[] {
  const commandMap = new Map<string, CommandDefinition>();

  for (const [key, command] of Object.entries(registry)) {
    // Only include main command names, not aliases
    if (command.name.toLowerCase() === key) {
      commandMap.set(command.name, command);
    }
  }

  return Array.from(commandMap.values());
}
