/**
 * Simulated Commands
 * 
 * These commands simulate common shell commands but are completely sandboxed.
 * They return mocked output and clearly indicate they are simulated.
 */

import type { CommandDefinition, CommandResult, CommandContext } from "../types";

/**
 * Docker command - simulated docker ps
 */
export const dockerCommand: CommandDefinition = {
  name: "docker",
  description: "[SIMULATED] Docker container management",
  usage: "docker ps",
  permissionLevel: "admin",
  category: "Simulated",
  execute: async (args) => {
    if (args[0] === "ps") {
      return {
        success: true,
        output: [
          "[SIMULATED OUTPUT]",
          "",
          "CONTAINER ID   IMAGE                STATUS         PORTS     NAMES",
          "a1b2c3d4e5f6   homeassistant/core   Up 2 days      8123/tcp  homeassistant",
          "f6e5d4c3b2a1   postgres:15          Up 2 days      5432/tcp  postgres",
          "",
          "⚠️  This is simulated output. No actual Docker commands were executed.",
        ],
      };
    } else if (args[0] === "images") {
      return {
        success: true,
        output: [
          "[SIMULATED OUTPUT]",
          "",
          "REPOSITORY            TAG       IMAGE ID       CREATED        SIZE",
          "homeassistant/core   latest    abc123def456   2 days ago     1.2GB",
          "postgres             15        def456ghi789   1 week ago     450MB",
          "",
          "⚠️  This is simulated output. No actual Docker commands were executed.",
        ],
      };
    } else {
      return {
        success: false,
        output: "Usage: docker ps | docker images",
        error: "Invalid docker command",
      };
    }
  },
};

/**
 * Git command - simulated git status
 */
export const gitCommand: CommandDefinition = {
  name: "git",
  description: "[SIMULATED] Git version control",
  usage: "git status",
  permissionLevel: "admin",
  category: "Simulated",
  execute: async (args) => {
    if (args[0] === "status") {
      return {
        success: true,
        output: [
          "[SIMULATED OUTPUT]",
          "",
          "On branch main",
          "Your branch is up to date with 'origin/main'.",
          "",
          "Changes not staged for commit:",
          "  (use \"git add <file>...\" to update what will be committed)",
          "  modified:   components/terminal/terminal-panel.tsx",
          "",
          "no changes added to commit (use \"git add\" to track)",
          "",
          "⚠️  This is simulated output. No actual Git commands were executed.",
        ],
      };
    } else if (args[0] === "branch") {
      return {
        success: true,
        output: [
          "[SIMULATED OUTPUT]",
          "",
          "* main",
          "  develop",
          "  feature/terminal",
          "",
          "⚠️  This is simulated output. No actual Git commands were executed.",
        ],
      };
    } else {
      return {
        success: false,
        output: "Usage: git status | git branch",
        error: "Invalid git command",
      };
    }
  },
};

/**
 * NPM command - simulated npm commands
 */
export const npmCommand: CommandDefinition = {
  name: "npm",
  description: "[SIMULATED] NPM package manager",
  usage: "npm run <script>",
  permissionLevel: "admin",
  category: "Simulated",
  execute: async (args) => {
    if (args[0] === "run" && args[1]) {
      const script = args[1];

      if (script === "build") {
        return {
          success: true,
          output: [
            "[SIMULATED OUTPUT]",
            "",
            `> home-assistant-frontend@1.0.0 build`,
            `> vite build`,
            "",
            "✓ Compiled successfully",
            "✓ Linting and checking validity of types",
            "✓ Collecting page data",
            "✓ Generating static pages (5/5)",
            "",
            "Route (app)                              Size     First Load JS",
            "┌ ○ /                                   123 B        85.2 kB",
            "└ ○ /overview                           234 B        85.3 kB",
            "",
            "⚠️  This is simulated output. No actual NPM commands were executed.",
          ],
        };
      } else if (script === "dev") {
        return {
          success: true,
          output: [
            "[SIMULATED OUTPUT]",
            "",
            "> home-assistant-frontend@1.0.0 dev",
            "> vite",
            "",
            "✓ Ready in 1.2s",
            "○ Local:        http://localhost:3000",
            "",
            "⚠️  This is simulated output. No actual NPM commands were executed.",
          ],
        };
      } else {
        return {
          success: false,
          output: `Unknown script: ${script}. Available scripts: build, dev`,
          error: "Invalid script",
        };
      }
    } else {
      return {
        success: false,
        output: "Usage: npm run <script>",
        error: "Invalid npm command",
      };
    }
  },
};
