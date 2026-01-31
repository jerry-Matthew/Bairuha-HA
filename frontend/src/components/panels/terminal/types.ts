/**
 * Terminal Command System Types
 * 
 * This file defines the types and interfaces for the sandboxed terminal command system.
 * All commands are whitelisted and execute within application logic only.
 */

export type PermissionLevel = "admin" | "user" | "public";

export interface CommandResult {
  success: boolean;
  output: string | string[];
  error?: string;
}

export interface CommandContext {
  userRole: "admin" | "user";
  userId: string;
  timestamp: Date;
}

export interface CommandDefinition {
  name: string;
  description: string;
  usage?: string;
  longDescription?: string;
  examples?: string[];
  permissionLevel: PermissionLevel;
  execute: (args: string[], context: CommandContext) => Promise<CommandResult> | CommandResult;
  aliases?: string[];
  subcommands?: CommandDefinition[];
  category?: string;
}

export interface CommandRegistry {
  [commandName: string]: CommandDefinition;
}

export interface TerminalOutput {
  type: "command" | "output" | "error" | "system";
  content: string | string[];
  timestamp: Date;
  command?: string;
}

export interface TerminalState {
  history: TerminalOutput[];
  commandHistory: string[];
  historyIndex: number;
  currentInput: string;
}
