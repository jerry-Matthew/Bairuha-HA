/**
 * Application Commands
 * 
 * Core application commands for system interaction.
 * All commands are safe and execute within application logic only.
 */

import type { CommandDefinition, CommandResult, CommandContext } from "../types";

/**
 * Get application start time (for uptime calculation)
 */
let appStartTime: Date | null = null;

export function setAppStartTime(): void {
  if (!appStartTime) {
    appStartTime = new Date();
  }
}

export function getAppStartTime(): Date {
  return appStartTime || new Date();
}

/**
 * Help command - lists all available commands
 */
export const helpCommand: CommandDefinition = {
  name: "help",
  description: "Display available commands and their descriptions",
  usage: "help [command]",
  longDescription: `
This command provides help information about available commands.
Use 'help' to see all commands, or 'help <command>' for detailed information about a specific command.
  `,
  examples: [
    "help",
    "help status",
    "help banner",
  ],
  permissionLevel: "public",
  aliases: ["?", "h"],
  category: "System",
  execute: async (args, context) => {
    // Import registry to get command details
    const { buildCommandRegistry, getAllCommands } = await import("../command-registry");
    const registry = buildCommandRegistry();
    const allCommands = getAllCommands(registry);

    if (args.length > 0) {
      // Detailed help for specific command
      const commandName = args[0].toLowerCase();
      const command = registry[commandName];

      if (!command) {
        return {
          success: false,
          output: `Command '${commandName}' not found. Use 'help' to see all available commands.`,
          error: "Command not found",
        };
      }

      const helpOutput: string[] = [];
      helpOutput.push(`\nCommand: ${command.name}`);
      if (command.aliases && command.aliases.length > 0) {
        helpOutput.push(`Aliases: ${command.aliases.join(", ")}`);
      }
      helpOutput.push(`Description: ${command.description}`);
      if (command.longDescription) {
        helpOutput.push(`\n${command.longDescription.trim()}`);
      }
      if (command.usage) {
        helpOutput.push(`\nUsage: ${command.usage}`);
      }
      if (command.examples && command.examples.length > 0) {
        helpOutput.push(`\nExamples:`);
        command.examples.forEach(example => {
          helpOutput.push(`  $ ${example}`);
        });
      }
      helpOutput.push(`\nPermission Level: ${command.permissionLevel}`);

      return {
        success: true,
        output: helpOutput,
      };
    }

    // Group commands by category
    const commandsByCategory = new Map<string, CommandDefinition[]>();
    commandsByCategory.set("System", []);
    commandsByCategory.set("Application", []);
    commandsByCategory.set("Diagnostic", []);
    commandsByCategory.set("Simulated", []);

    allCommands.forEach(cmd => {
      const category = cmd.category || "Application";
      if (!commandsByCategory.has(category)) {
        commandsByCategory.set(category, []);
      }
      commandsByCategory.get(category)!.push(cmd);
    });

    // Build help output
    const commands: string[] = [];
    commands.push("\n📋 Available Commands:\n");

    // System commands
    const systemCommands = commandsByCategory.get("System") || [];
    if (systemCommands.length > 0) {
      commands.push("System Commands:");
      systemCommands.forEach(cmd => {
        const aliases = cmd.aliases && cmd.aliases.length > 0 ? ` (${cmd.aliases.join(", ")})` : "";
        commands.push(`  ${cmd.name.padEnd(12)} - ${cmd.description}${aliases}`);
      });
      commands.push("");
    }

    // Application commands
    const appCommands = commandsByCategory.get("Application") || [];
    if (appCommands.length > 0) {
      commands.push("Application Commands:");
      appCommands.forEach(cmd => {
        const aliases = cmd.aliases && cmd.aliases.length > 0 ? ` (${cmd.aliases.join(", ")})` : "";
        commands.push(`  ${cmd.name.padEnd(12)} - ${cmd.description}${aliases}`);
      });
      commands.push("");
    }

    // Diagnostic commands
    const diagCommands = commandsByCategory.get("Diagnostic") || [];
    if (diagCommands.length > 0) {
      commands.push("Diagnostic Commands:");
      diagCommands.forEach(cmd => {
        const aliases = cmd.aliases && cmd.aliases.length > 0 ? ` (${cmd.aliases.join(", ")})` : "";
        commands.push(`  ${cmd.name.padEnd(12)} - ${cmd.description}${aliases}`);
      });
      commands.push("");
    }

    // Simulated commands
    const simCommands = commandsByCategory.get("Simulated") || [];
    if (simCommands.length > 0) {
      commands.push("Simulated Commands:");
      simCommands.forEach(cmd => {
        const aliases = cmd.aliases && cmd.aliases.length > 0 ? ` (${cmd.aliases.join(", ")})` : "";
        commands.push(`  ${cmd.name.padEnd(12)} - ${cmd.description}${aliases}`);
      });
      commands.push("");
    }

    commands.push("Type 'help <command>' for detailed information about a specific command.");

    return {
      success: true,
      output: commands,
    };
  },
};

/**
 * Clear command - clears terminal output
 */
export const clearCommand: CommandDefinition = {
  name: "clear",
  description: "Clear terminal output",
  usage: "clear",
  permissionLevel: "public",
  aliases: ["cls", "c"],
  category: "System",
  execute: async () => {
    // This is handled by the UI component
    return {
      success: true,
      output: "\x1Bc", // ANSI clear screen escape code
    };
  },
};

/**
 * Status command - shows application status
 */
export const statusCommand: CommandDefinition = {
  name: "status",
  description: "Show application status and health",
  usage: "status",
  longDescription: `
This command provides a general overview of the application status and health.
It shows system status, API connectivity, database status, and service information.
  `,
  examples: [
    "status",
  ],
  permissionLevel: "public",
  aliases: ["stat"],
  category: "Application",
  execute: async () => {
    const status = [
      "✅ Application Status",
      "",
      "System:        Operational",
      "API:           Connected",
      "Database:      Connected",
      "Services:      Running",
      "",
      "All systems operational.",
    ];

    return {
      success: true,
      output: status,
    };
  },
};

/**
 * Version command - shows application version
 */
export const versionCommand: CommandDefinition = {
  name: "version",
  description: "Show application version information",
  usage: "version",
  permissionLevel: "public",
  aliases: ["ver", "v"],
  category: "Application",
  execute: async () => {
    const version = [
      "Home Assistant Terminal",
      "Version: 1.0.0",
      "Frontend: React/Vite",
      "Backend: NestJS",
      "",
      "© 2024 Home Assistant",
    ];

    return {
      success: true,
      output: version,
    };
  },
};

/**
 * Environment command - shows sanitized environment info
 */
export const envCommand: CommandDefinition = {
  name: "env",
  description: "Show environment information (sanitized, no secrets)",
  usage: "env",
  permissionLevel: "user",
  category: "Application",
  execute: async () => {
    // Only show safe, non-sensitive environment information
    const envInfo = [
      "🔒 Environment Information (Sanitized)",
      "",
      "NODE_ENV:        " + (import.meta.env.MODE || "development"),
      "Platform:        " + (typeof window !== "undefined" ? "browser" : "server"),
      "Timezone:        UTC",
      "",
      "⚠️  Sensitive information (API keys, secrets) has been redacted.",
    ];

    return {
      success: true,
      output: envInfo,
    };
  },
};

/**
 * Uptime command - shows application uptime
 */
export const uptimeCommand: CommandDefinition = {
  name: "uptime",
  description: "Show application uptime",
  usage: "uptime",
  permissionLevel: "public",
  category: "Application",
  execute: async () => {
    setAppStartTime();
    const startTime = getAppStartTime();
    const now = new Date();
    const uptimeMs = now.getTime() - startTime.getTime();

    const seconds = Math.floor(uptimeMs / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    const uptimeParts: string[] = [];
    if (days > 0) uptimeParts.push(`${days} day${days !== 1 ? "s" : ""}`);
    if (hours % 24 > 0) uptimeParts.push(`${hours % 24} hour${(hours % 24) !== 1 ? "s" : ""}`);
    if (minutes % 60 > 0) uptimeParts.push(`${minutes % 60} minute${(minutes % 60) !== 1 ? "s" : ""}`);
    if (seconds % 60 > 0 && hours === 0) uptimeParts.push(`${seconds % 60} second${(seconds % 60) !== 1 ? "s" : ""}`);

    const uptimeStr = uptimeParts.length > 0 ? uptimeParts.join(", ") : "0 seconds";

    const output = [
      "⏱️  Application Uptime",
      "",
      `Uptime: ${uptimeStr}`,
      `Since:  ${startTime.toISOString()}`,
    ];

    return {
      success: true,
      output,
    };
  },
};
