/**
 * Terminal Module
 * 
 * Main export point for the terminal module.
 */

export { TerminalPanel } from "./terminal-panel";
export * from "./types";
export { executeCommand, getCommandSuggestions } from "./command-executor";
export { buildCommandRegistry, getCommand, getAllCommands } from "./command-registry";
