# Terminal Module

A secure, sandboxed terminal interface for the Home Assistant application.

## 🔐 Security & Safety

**IMPORTANT:** This terminal is **NOT** a real system shell. It is a fully sandboxed, controlled diagnostic console designed for safe interaction with the application.

### Security Features

- ✅ **Fully Sandboxed** - No OS-level command execution
- ✅ **Whitelisted Commands** - Only registered commands can execute
- ✅ **Input Validation** - All input is validated and sanitized
- ✅ **Permission-Based Access** - Admin-only access by default
- ✅ **Rate Limiting** - Prevents command execution abuse
- ✅ **No System Access** - Cannot access file system, execute processes, or modify system state

### What This Terminal CANNOT Do

- ❌ Execute OS-level commands (rm, sudo, cd, ls, etc.)
- ❌ Access the file system directly
- ❌ Use eval, exec, spawn, or child_process
- ❌ Execute shell commands
- ❌ Access sensitive system resources
- ❌ Modify system configuration

### What This Terminal CAN Do

- ✅ Execute whitelisted application commands
- ✅ Display diagnostic information (logs, health, status)
- ✅ Simulate common commands (docker, git, npm) with safe output
- ✅ Provide a developer-friendly interface for app interaction

## 📁 Module Structure

```
terminal/
├── commands/              # Command implementations
│   ├── app-commands.ts    # Core application commands
│   ├── diagnostic-commands.ts  # Diagnostic and monitoring commands
│   └── simulated-commands.ts   # Simulated shell commands
├── utils/                 # Utility functions
│   ├── command-parser.ts  # Command parsing and validation
│   ├── permissions.ts     # Permission checking
│   └── rate-limiter.ts    # Rate limiting
├── types.ts               # TypeScript type definitions
├── command-registry.ts    # Command registration system
├── command-executor.ts    # Command execution engine
├── terminal-panel.tsx     # Main UI component
├── index.ts               # Module exports
└── README.md              # This file
```

## 🚀 Usage

### Access Control

The terminal is restricted to administrators by default. Users with the `admin` role can access the terminal. Non-admin users will see an "Access Denied" message.

### Available Commands

#### Application Commands

- `help` - Display available commands and their descriptions
- `clear` - Clear terminal output
- `status` - Show application status and health
- `version` - Show application version information
- `env` - Show sanitized environment information (no secrets)
- `uptime` - Show application uptime

#### Diagnostic Commands (Admin Only)

- `logs [--last=N]` - View application logs (read-only, sanitized)
- `health` - Check system health and status
- `ping [api|database]` - Test API or database connectivity

#### Simulated Commands (Admin Only)

- `docker ps` - [SIMULATED] List containers
- `docker images` - [SIMULATED] List images
- `git status` - [SIMULATED] Show git status
- `git branch` - [SIMULATED] List branches
- `npm run build` - [SIMULATED] Run build command
- `npm run dev` - [SIMULATED] Run dev command

### Keyboard Shortcuts

- `Enter` - Execute command
- `Arrow Up` - Navigate command history (previous command)
- `Arrow Down` - Navigate command history (next command)

## 🧩 Adding New Commands

To add a new command to the terminal:

### 1. Create Command Definition

Create a command definition in the appropriate command file:

```typescript
import { CommandDefinition } from "../types";

export const myCommand: CommandDefinition = {
  name: "mycommand",
  description: "Description of what the command does",
  usage: "mycommand [args]",
  permissionLevel: "admin", // or "user" or "public"
  aliases: ["mc", "mycmd"], // optional
  execute: async (args, context) => {
    // Command logic here
    return {
      success: true,
      output: "Command output here",
    };
  },
};
```

### 2. Register Command

Add the command to the registry in `command-registry.ts`:

```typescript
import { myCommand } from "./commands/your-command-file";

const allCommands: CommandDefinition[] = [
  // ... existing commands
  myCommand,
];
```

### 3. Command Execution Context

Commands receive:

- `args: string[]` - Parsed command arguments
- `context: CommandContext` - Execution context with user info

### 4. Command Result

Commands must return a `CommandResult`:

```typescript
{
  success: boolean;
  output: string | string[];
  error?: string;
}
```

## 🔒 Permission Levels

- `"public"` - Available to all authenticated users
- `"user"` - Available to regular users and admins
- `"admin"` - Available only to administrators

## ⚡ Rate Limiting

Commands are rate-limited to prevent abuse:

- Maximum 50 commands per minute per user
- Rate limit is automatically enforced
- Users will receive a message if they exceed the limit

## 🎨 UI Features

- **Dark Theme** - Terminal-style dark interface
- **Monospace Font** - Traditional terminal appearance
- **Command History** - Navigate previous commands with arrow keys
- **Scrollable Output** - Auto-scrolls to latest output
- **Copy Output** - Copy terminal output to clipboard
- **Clear Terminal** - Clear all output
- **Input Prompt** - Visual ">" prompt indicator
- **Error Highlighting** - Errors displayed in red

## 🛡️ Security Constraints

### Input Validation

All input is validated before processing:

- Maximum length: 1000 characters
- Dangerous patterns are blocked (eval, exec, spawn, etc.)
- Shell injection patterns are prevented

### Command Execution

- Commands are executed asynchronously
- Errors are caught and displayed safely
- No system resources are accessed
- All output is sanitized

### Best Practices

1. **Never execute user input directly** - Always use the command registry
2. **Always validate input** - Use the provided validation functions
3. **Sanitize output** - Never expose sensitive data
4. **Check permissions** - Verify user has required permission level
5. **Handle errors gracefully** - Never crash the application

## 🧪 Testing

When testing commands:

1. Ensure commands are registered in the registry
2. Test with different permission levels
3. Test rate limiting behavior
4. Test error handling
5. Verify input validation works correctly

## 📝 Notes

- The terminal uses client-side execution only
- All commands are stateless and safe to run multiple times
- Commands should never mutate global state
- Simulated commands clearly indicate they are simulated
- Real system commands (docker, git, npm) are intentionally simulated for security

## 🚨 Important Reminders

1. **This is NOT a real shell** - Do not attempt to execute real system commands
2. **All commands are whitelisted** - Unknown commands will show an error
3. **Admin-only by default** - Regular users cannot access the terminal
4. **Production-safe** - Designed to be safe for production use
5. **Read-only diagnostics** - Diagnostic commands do not modify system state

---

**For questions or issues, contact the development team.**

