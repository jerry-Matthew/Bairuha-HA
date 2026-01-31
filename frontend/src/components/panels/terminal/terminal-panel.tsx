/**
 * Terminal Panel Component
 *
 * Main terminal UI component with dark theme, command history, and keyboard navigation.
 * Fully sandboxed - NO real system shell access.
 */

import { useState, useRef, useEffect, useCallback } from "react";
import {
  Box,
  Typography,
  TextField,
  IconButton,
  Tooltip,
} from "@mui/material";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import ClearIcon from "@mui/icons-material/Clear";
import { useAuth } from "@/contexts/auth-context";
import { useAppSelector } from "@/store/hooks";
import { selectUser } from "@/store/selectors";
import { executeCommand } from "./command-executor";
import type { TerminalOutput } from "./types";
import { setAppStartTime } from "./commands/app-commands";
import type { User } from "@/types";

interface TerminalPanelProps {
  // Add any props if needed in the future
}

/**
 * Welcome Banner Component
 * Displays the banner similar to the banner command output
 */
function WelcomeBanner({ user }: { user: User | null }) {
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

  const bannerLines = haBanner.trim().split("\n");

  return (
    <>
      {/* Banner ASCII Art */}
      {bannerLines.map((line, index) => (
        <Typography
          key={index}
          component="pre"
          sx={{
            fontFamily: "monospace",
            mb: index === bannerLines.length - 1 ? 2 : 1,
            color: "#9333ea",
            fontSize: index < 10 ? "0.7rem" : "0.85rem",
            whiteSpace: "pre",
            margin: 0,
            lineHeight: 1.2,
          }}
        >
          {line}
        </Typography>
      ))}

      <Typography
        component="pre"
        sx={{
          fontFamily: "monospace",
          mb: 1,
          color: "#CCCCCC",
          fontSize: "0.85rem",
          whiteSpace: "pre",
          margin: 0,
        }}
      >
        Home Assistant Supervisor is running!
      </Typography>
      <Typography
        component="pre"
        sx={{
          fontFamily: "monospace",
          mb: 2,
          color: "#CCCCCC",
          fontSize: "0.85rem",
          whiteSpace: "pre",
          margin: 0,
        }}
      >
        {""}
      </Typography>

      <Typography
        component="pre"
        sx={{
          fontFamily: "monospace",
          mb: 1,
          color: "#FFFFFF",
          fontSize: "0.85rem",
          whiteSpace: "pre",
          margin: 0,
        }}
      >
        System information:
      </Typography>
      <Typography
        component="pre"
        sx={{
          fontFamily: "monospace",
          mb: 0.5,
          color: "#FFFFFF",
          fontSize: "0.75rem",
          whiteSpace: "pre",
          margin: 0,
        }}
      >
        {`  User:                    ${user?.role === "admin" ? "Administrator" : "User"
          }`}
      </Typography>
      <Typography
        component="pre"
        sx={{
          fontFamily: "monospace",
          mb: 0.5,
          color: "#FFFFFF",
          fontSize: "0.75rem",
          whiteSpace: "pre",
          margin: 0,
        }}
      >
        {`  Platform:                 ${typeof window !== "undefined" ? "Browser" : "Server"
          }`}
      </Typography>
      <Typography
        component="pre"
        sx={{
          fontFamily: "monospace",
          mb: 0.5,
          color: "#FFFFFF",
          fontSize: "0.75rem",
          whiteSpace: "pre",
          margin: 0,
        }}
      >
        {`  Session Time:             ${new Date().toLocaleString()}`}
      </Typography>
      <Typography
        component="pre"
        sx={{
          fontFamily: "monospace",
          mb: 0.5,
          color: "#FFFFFF",
          fontSize: "0.75rem",
          whiteSpace: "pre",
          margin: 0,
        }}
      >
        {`  Application Version:      1.0.0`}
      </Typography>
      <Typography
        component="pre"
        sx={{
          fontFamily: "monospace",
          mb: 2,
          color: "#FFFFFF",
          fontSize: "0.75rem",
          whiteSpace: "pre",
          margin: 0,
        }}
      >
        {`  Terminal Version:         1.0.0`}
      </Typography>

      <Typography
        component="pre"
        sx={{
          fontFamily: "monospace",
          mb: 0.5,
          color: "#FFFFFF",
          fontSize: "0.85rem",
          whiteSpace: "pre",
          margin: 0,
        }}
      >
        Network information:
      </Typography>
      <Typography
        component="pre"
        sx={{
          fontFamily: "monospace",
          mb: 0.5,
          color: "#FFFFFF",
          fontSize: "0.75rem",
          whiteSpace: "pre",
          margin: 0,
        }}
      >
        {`  IPv4 addresses:          127.0.0.1, localhost`}
      </Typography>
      <Typography
        component="pre"
        sx={{
          fontFamily: "monospace",
          mb: 2,
          color: "#FFFFFF",
          fontSize: "0.75rem",
          whiteSpace: "pre",
          margin: 0,
        }}
      >
        {`  IPv6 addresses:          ::1`}
      </Typography>

      <Typography
        component="pre"
        sx={{
          fontFamily: "monospace",
          mb: 0.5,
          color: "#FFFFFF",
          fontSize: "0.85rem",
          whiteSpace: "pre",
          margin: 0,
        }}
      >
        Home Assistant URLs:
      </Typography>
      <Typography
        component="pre"
        sx={{
          fontFamily: "monospace",
          mb: 0.5,
          color: "#FFFFFF",
          fontSize: "0.75rem",
          whiteSpace: "pre",
          margin: 0,
        }}
      >
        {`  Home Assistant URL:      http://localhost:3000`}
      </Typography>
      <Typography
        component="pre"
        sx={{
          fontFamily: "monospace",
          mb: 2,
          color: "#FFFFFF",
          fontSize: "0.75rem",
          whiteSpace: "pre",
          margin: 0,
        }}
      >
        {`  API Endpoint:            http://localhost:3000/api`}
      </Typography>

      <Typography
        component="pre"
        sx={{
          fontFamily: "monospace",
          mb: 1,
          color: "#9333ea",
          fontSize: "0.85rem",
          whiteSpace: "pre",
          margin: 0,
        }}
      >
        System is ready! Use browser or app to configure.
      </Typography>
    </>
  );
}

export function TerminalPanel(_props: TerminalPanelProps) {
  const auth = useAuth();
  const user = useAppSelector(selectUser);
  const [output, setOutput] = useState<TerminalOutput[]>([]);
  const [input, setInput] = useState("");
  const [commandHistory, setCommandHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const outputRef = useRef<HTMLDivElement>(null);
  const [isExecuting, setIsExecuting] = useState(false);

  // Initialize app start time for uptime command
  useEffect(() => {
    setAppStartTime();
  }, []);

  // Check access permission - all authenticated users have access
  // Since the route is already protected by ProtectedRoute, any authenticated user can access
  const hasAccess = true;

  // Scroll to bottom when output changes
  useEffect(() => {
    if (outputRef.current) {
      outputRef.current.scrollTop = outputRef.current.scrollHeight;
    }
  }, [output]);

  // Focus input on mount
  useEffect(() => {
    if (inputRef.current && hasAccess) {
      inputRef.current.focus();
    }
  }, [hasAccess]);

  // Handle command execution
  const handleExecute = useCallback(
    async (commandInput: string) => {
      if (!commandInput.trim() || isExecuting || !user) return;

      setIsExecuting(true);

      // Add command to output
      const commandOutput: TerminalOutput = {
        type: "command",
        content: commandInput,
        timestamp: new Date(),
        command: commandInput,
      };

      setOutput((prev) => [...prev, commandOutput]);

      // Handle clear command specially
      if (commandInput.trim().toLowerCase() === "clear") {
        setOutput([]);
        setIsExecuting(false);
        return;
      }

      // Execute command
      try {
        const result = await executeCommand({
          input: commandInput,
          context: {
            userRole: (user?.role as "admin" | "user") || "user",
            userId: user?.id || "unknown",
            timestamp: new Date(),
          },
        });

        // Add result to output
        const resultOutput: TerminalOutput = {
          type: result.success ? "output" : "error",
          content: result.result?.output || result.error || "Unknown error",
          timestamp: new Date(),
          command: commandInput,
        };

        setOutput((prev) => [...prev, resultOutput]);

        // Add to command history (if not empty and not duplicate of last)
        setCommandHistory((prev) => {
          if (prev.length === 0 || prev[prev.length - 1] !== commandInput) {
            return [...prev, commandInput];
          }
          return prev;
        });
        setHistoryIndex(-1);
      } catch (error) {
        const errorOutput: TerminalOutput = {
          type: "error",
          content:
            error instanceof Error
              ? error.message
              : "An unexpected error occurred",
          timestamp: new Date(),
          command: commandInput,
        };
        setOutput((prev) => [...prev, errorOutput]);
      } finally {
        setIsExecuting(false);
        setInput("");
      }
    },
    [user, isExecuting]
  );

  // Handle keyboard shortcuts
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter") {
        e.preventDefault();
        handleExecute(input);
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        if (commandHistory.length > 0) {
          const newIndex =
            historyIndex < 0
              ? commandHistory.length - 1
              : Math.max(0, historyIndex - 1);
          setHistoryIndex(newIndex);
          setInput(commandHistory[newIndex]);
        }
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        if (historyIndex >= 0) {
          const newIndex = historyIndex + 1;
          if (newIndex >= commandHistory.length) {
            setHistoryIndex(-1);
            setInput("");
          } else {
            setHistoryIndex(newIndex);
            setInput(commandHistory[newIndex]);
          }
        }
      }
    },
    [input, commandHistory, historyIndex, handleExecute]
  );

  // Copy output to clipboard
  const handleCopyOutput = useCallback(() => {
    const text = output
      .map((line) => {
        const prefix = line.type === "command" ? "> " : "";
        const content = Array.isArray(line.content)
          ? line.content.join("\n")
          : line.content;
        return prefix + content;
      })
      .join("\n");
    navigator.clipboard.writeText(text);
  }, [output]);

  // Clear terminal
  const handleClear = useCallback(() => {
    setOutput([]);
  }, []);

  // Render output line
  const renderOutputLine = (line: TerminalOutput, index: number) => {
    const content = Array.isArray(line.content)
      ? line.content.join("\n")
      : line.content;
    const isCommand = line.type === "command";
    const isError = line.type === "error";

    return (
      <Box
        key={index}
        sx={{
          mb: 0.5,
          fontFamily: "monospace",
          fontSize: "0.875rem",
          lineHeight: 1.5,
        }}
      >
        {isCommand && (
          <Typography
            component="span"
            sx={{
              color: "#00FF00",
              fontWeight: 600,
              mr: 1,
            }}
          >
            &gt;
          </Typography>
        )}
        <Typography
          component="pre"
          sx={{
            display: "inline",
            color: isError ? "#FF6B6B" : isCommand ? "#FFFFFF" : "#CCCCCC",
            whiteSpace: "pre-wrap",
            wordBreak: "break-word",
            fontFamily: "monospace",
            fontSize: "0.875rem",
          }}
        >
          {content}
        </Typography>
      </Box>
    );
  };

  // Show loading state while auth is initializing
  if (auth.isLoading) {
    return (
      <Box
        sx={{
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#1E1E1E",
          color: "#CCCCCC",
        }}
      >
        <Typography variant="body1">Loading terminal...</Typography>
      </Box>
    );
  }



  return (
    <Box
      sx={{
        height: "100%",
        display: "flex",
        flexDirection: "column",
        backgroundColor: "#1E1E1E",
        color: "#FFFFFF",
        overflow: "hidden",
      }}
    >
      {/* Terminal Header */}
      <Box
        sx={{
          p: 1.5,
          borderBottom: "1px solid rgba(255, 255, 255, 0.1)",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          backgroundColor: "#252526",
        }}
      >
        <Typography
          variant="body2"
          sx={{
            fontFamily: "monospace",
            color: "#CCCCCC",
            fontSize: "0.75rem",
          }}
        >
          Home Assistant Terminal Console
        </Typography>
        <Box sx={{ display: "flex", gap: 0.5 }}>
          <Tooltip title="Copy Output">
            <IconButton
              size="small"
              onClick={handleCopyOutput}
              sx={{
                color: "#CCCCCC",
                "&:hover": { backgroundColor: "rgba(255, 255, 255, 0.1)" },
              }}
            >
              <ContentCopyIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="Clear Terminal">
            <IconButton
              size="small"
              onClick={handleClear}
              sx={{
                color: "#CCCCCC",
                "&:hover": { backgroundColor: "rgba(255, 255, 255, 0.1)" },
              }}
            >
              <ClearIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>

      {/* Terminal Output */}
      <Box
        ref={outputRef}
        sx={{
          flex: 1,
          overflowY: "auto",
          p: 2,
          fontFamily: "monospace",
          fontSize: "0.875rem",
          "&::-webkit-scrollbar": {
            width: "8px",
          },
          "&::-webkit-scrollbar-track": {
            backgroundColor: "#1E1E1E",
          },
          "&::-webkit-scrollbar-thumb": {
            backgroundColor: "#555555",
            borderRadius: "4px",
            "&:hover": {
              backgroundColor: "#666666",
            },
          },
        }}
      >
        {output.length === 0 && (
          <Box>
            <WelcomeBanner user={user} />
          </Box>
        )}
        {output.map((line, index) => renderOutputLine(line, index))}
        {isExecuting && (
          <Typography
            component="span"
            sx={{
              color: "#666666",
              fontFamily: "monospace",
            }}
          >
            Executing...
          </Typography>
        )}
      </Box>

      {/* Terminal Input */}
      <Box
        sx={{
          p: 1.5,
          borderTop: "1px solid rgba(255, 255, 255, 0.1)",
          backgroundColor: "#252526",
          display: "flex",
          alignItems: "center",
          gap: 1,
        }}
      >
        <Typography
          component="span"
          sx={{
            color: "#00FF00",
            fontFamily: "monospace",
            fontWeight: 600,
            fontSize: "0.875rem",
          }}
        >
          &gt;
        </Typography>
        <TextField
          inputRef={inputRef}
          fullWidth
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={isExecuting}
          placeholder="Type a command..."
          variant="standard"
          InputProps={{
            disableUnderline: true,
            sx: {
              color: "#FFFFFF",
              fontFamily: "monospace",
              fontSize: "0.875rem",
              "& input": {
                color: "#FFFFFF",
                fontFamily: "monospace",
              },
              "& input::placeholder": {
                color: "#666666",
                opacity: 1,
              },
            },
          }}
        />
      </Box>
    </Box>
  );
}
