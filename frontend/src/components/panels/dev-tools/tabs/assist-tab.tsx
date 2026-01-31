"use client";

import { useState, useEffect, useRef } from "react";
import {
  Box,
  TextField,
  Button,
  Paper,
  Typography,
  Alert,
  CircularProgress,
  Grid,
  Card,
  CardContent,
  Divider,
  List,
  ListItem,
  ListItemText,
  Chip,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from "@mui/material";
import { useAssist } from "../hooks/useAssist";
import SendIcon from "@mui/icons-material/Send";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import ClearIcon from "@mui/icons-material/Clear";

export function AssistTab() {
  const [message, setMessage] = useState("");
  const [language, setLanguage] = useState("en");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const {
    processing,
    loadingSettings,
    loadingExamples,
    error,
    conversationResponse,
    conversation,
    settings,
    examples,
    currentConversationId,
    processMessage,
    fetchConversation,
    clearConversation,
    fetchSettings,
    updateSettings,
    fetchExamples,
  } = useAssist();

  useEffect(() => {
    fetchSettings();
    fetchExamples();
  }, []);

  useEffect(() => {
    if (currentConversationId) {
      fetchConversation(currentConversationId);
    }
  }, [currentConversationId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [conversation?.messages]);

  const handleSend = () => {
    if (!message.trim()) return;

    processMessage({
      message: message.trim(),
      language,
      conversationId: currentConversationId || undefined,
    });
    setMessage("");
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleClearConversation = () => {
    if (currentConversationId) {
      clearConversation(currentConversationId);
    }
  };

  const handleExampleClick = (command: string) => {
    setMessage(command);
  };

  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        Home Assistant Assist
      </Typography>
      <Typography variant="body2" color="text.secondary" paragraph>
        Interact with Home Assistant using natural language commands.
      </Typography>

      <Grid container spacing={3}>
        <Grid item xs={12} md={8}>
          <Paper sx={{ p: 3, height: 600, display: "flex", flexDirection: "column" }}>
            <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2 }}>
              <Typography variant="subtitle1" fontWeight="bold">
                Conversation
              </Typography>
              {currentConversationId && (
                <Button
                  size="small"
                  startIcon={<ClearIcon />}
                  onClick={handleClearConversation}
                  color="error"
                >
                  Clear
                </Button>
              )}
            </Box>

            <Box
              sx={{
                flex: 1,
                overflow: "auto",
                border: "1px solid",
                borderColor: "divider",
                borderRadius: 1,
                p: 2,
                mb: 2,
                bgcolor: "background.default",
              }}
            >
              {conversation && conversation.messages.length > 0 ? (
                <List>
                  {conversation.messages.map((msg, idx) => (
                    <ListItem
                      key={idx}
                      sx={{
                        flexDirection: msg.role === "user" ? "row-reverse" : "row",
                        alignItems: "flex-start",
                      }}
                    >
                      <Box
                        sx={{
                          maxWidth: "70%",
                          bgcolor: msg.role === "user" ? "primary.main" : "grey.300",
                          color: msg.role === "user" ? "white" : "text.primary",
                          p: 1.5,
                          borderRadius: 2,
                          wordBreak: "break-word",
                        }}
                      >
                        <Typography variant="body2">{msg.message}</Typography>
                        <Typography variant="caption" sx={{ opacity: 0.7, display: "block", mt: 0.5 }}>
                          {new Date(msg.timestamp).toLocaleTimeString()}
                        </Typography>
                      </Box>
                    </ListItem>
                  ))}
                </List>
              ) : (
                <Box
                  sx={{
                    display: "flex",
                    justifyContent: "center",
                    alignItems: "center",
                    height: "100%",
                    color: "text.secondary",
                  }}
                >
                  <Typography>Start a conversation by sending a message</Typography>
                </Box>
              )}
              <div ref={messagesEndRef} />
            </Box>

            {error && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {error}
              </Alert>
            )}

            {conversationResponse && !conversationResponse.success && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {conversationResponse.error || "Failed to process message"}
              </Alert>
            )}

            <Box sx={{ display: "flex", gap: 1 }}>
              <TextField
                fullWidth
                placeholder="Type your message..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                disabled={processing}
                multiline
                maxRows={3}
              />
              <Button
                variant="contained"
                onClick={handleSend}
                disabled={!message.trim() || processing}
                startIcon={processing ? <CircularProgress size={20} /> : <SendIcon />}
                sx={{ minWidth: 100 }}
              >
                Send
              </Button>
            </Box>

            <Box sx={{ display: "flex", gap: 2, mt: 2 }}>
              <FormControl sx={{ minWidth: 150 }}>
                <InputLabel>Language</InputLabel>
                <Select
                  value={language}
                  onChange={(e) => setLanguage(e.target.value)}
                  label="Language"
                  size="small"
                >
                  <MenuItem value="en">English</MenuItem>
                  <MenuItem value="es">Spanish</MenuItem>
                  <MenuItem value="fr">French</MenuItem>
                  <MenuItem value="de">German</MenuItem>
                </Select>
              </FormControl>
            </Box>
          </Paper>
        </Grid>

        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="subtitle1" gutterBottom fontWeight="bold">
              Example Commands
            </Typography>
            {loadingExamples ? (
              <Box sx={{ display: "flex", justifyContent: "center", p: 2 }}>
                <CircularProgress size={24} />
              </Box>
            ) : examples ? (
              <Box sx={{ mt: 2 }}>
                {examples.examples.map((category, idx) => (
                  <Accordion key={idx}>
                    <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                      <Typography variant="subtitle2">{category.category}</Typography>
                    </AccordionSummary>
                    <AccordionDetails>
                      <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
                        {category.commands.map((cmd, cmdIdx) => (
                          <Card
                            key={cmdIdx}
                            variant="outlined"
                            sx={{ cursor: "pointer", "&:hover": { bgcolor: "action.hover" } }}
                            onClick={() => handleExampleClick(cmd)}
                          >
                            <CardContent sx={{ py: 1, "&:last-child": { pb: 1 } }}>
                              <Typography variant="body2">{cmd}</Typography>
                            </CardContent>
                          </Card>
                        ))}
                      </Box>
                    </AccordionDetails>
                  </Accordion>
                ))}
              </Box>
            ) : (
              <Typography variant="body2" color="text.secondary">
                No examples available
              </Typography>
            )}
          </Paper>

          {settings && (
            <Paper sx={{ p: 3, mt: 3 }}>
              <Typography variant="subtitle1" gutterBottom fontWeight="bold">
                Assist Settings
              </Typography>
              <Box sx={{ mt: 2 }}>
                <Box sx={{ mb: 2 }}>
                  <Typography variant="body2" color="text.secondary">
                    Status
                  </Typography>
                  <Chip
                    label={settings.enabled ? "Enabled" : "Disabled"}
                    color={settings.enabled ? "success" : "default"}
                    size="small"
                  />
                </Box>
                <Box sx={{ mb: 2 }}>
                  <Typography variant="body2" color="text.secondary">
                    Language
                  </Typography>
                  <Typography variant="body1">{settings.language}</Typography>
                </Box>
                <Box>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    Conversation Agents
                  </Typography>
                  {settings.conversationAgents.map((agent) => (
                    <Chip
                      key={agent.id}
                      label={agent.name}
                      size="small"
                      sx={{ mr: 1, mb: 1 }}
                      color={agent.enabled ? "primary" : "default"}
                    />
                  ))}
                </Box>
              </Box>
            </Paper>
          )}
        </Grid>
      </Grid>
    </Box>
  );
}
