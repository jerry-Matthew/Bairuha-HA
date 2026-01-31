/**
 * Banner Command
 * 
 * Displays the Home Assistant banner with system information.
 * Similar to the HA CLI banner command.
 */

import type { CommandDefinition, CommandResult, CommandContext } from "../types";

const haBanner = `
       ▄██▄           _   _                                    
     ▄██████▄        | | | | ___  _ __ ___   ___               
   ▄████▀▀████▄      | |_| |/ _ \\| '_ \` _ \\ / _ \\              
 ▄█████    █████▄    |  _  | (_) | | | | | |  __/              
▄██████▄  ▄██████▄   |_| |_|\\___/|_| |_| |_|\\___|          _   
████████  ██▀  ▀██      / \\   ___ ___(_)___| |_ __ _ _ __ | |_ 
███▀▀███  ██   ▄██     / _ \\ / __/ __| / __| __/ _\` | '_ \\| __|
██    ██  ▀ ▄█████    / ___ \\\\__ \\__ \\ \\__ \\ || (_| | | | | |_ 
███▄▄ ▀█  ▄███████   /_/   \\_\\___/___/_|___/\\__\\__,_|_| |_|\\__|
▀█████▄   ███████▀

Welcome to the Home Assistant command line interface.
`;

export const bannerCommand: CommandDefinition = {
  name: "banner",
  description: "Prints the CLI Home Assistant banner along with system information",
  usage: "banner",
  longDescription: `
This command displays the Home Assistant banner and provides useful system information
including network addresses, OS version, and Home Assistant Core version.
  `,
  examples: [
    "banner",
    "banner --no-wait",
  ],
  permissionLevel: "public",
  aliases: ["ba"],
  category: "System",
  execute: async (args, context) => {
    const nowait = args.includes("--no-wait") || args.includes("-n");

    const output: string[] = [];
    output.push(haBanner);
    output.push("");

    if (!nowait) {
      output.push("Home Assistant Supervisor is running!");
      output.push("");
    }

    output.push("System information:");
    output.push(`  User:                    ${context.userRole === "admin" ? "Administrator" : "User"}`);
    output.push(`  Platform:                 ${typeof window !== "undefined" ? "Browser" : "Server"}`);
    output.push(`  Session Time:             ${new Date().toLocaleString()}`);
    output.push(`  Application Version:      1.0.0`);
    output.push(`  Terminal Version:         1.0.0`);
    output.push("");

    // Simulated network information
    output.push("Network information:");
    output.push(`  IPv4 addresses:          127.0.0.1, localhost`);
    output.push(`  IPv6 addresses:          ::1`);
    output.push("");

    output.push("Home Assistant URLs:");
    output.push(`  Home Assistant URL:      http://localhost:3000`);
    output.push(`  API Endpoint:            http://localhost:3000/api`);
    output.push("");
    output.push("System is ready! Use browser or app to configure.");

    return {
      success: true,
      output,
    };
  },
};
