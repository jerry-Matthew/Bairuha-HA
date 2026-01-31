"use client";

import { useState } from "react";
import {
  Box,
  TextField,
  Button,
  Paper,
  Typography,
  Alert,
  CircularProgress,
  Grid,
  Tabs,
  Tab,
  Divider,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Card,
  CardContent,
} from "@mui/material";
import { useTemplateTest } from "../hooks/useTemplateTest";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";

const EXAMPLE_TEMPLATES = [
  {
    name: "Entity State",
    template: "{{ states('light.living_room') }}",
    variables: "{}",
    description: "Get current state of an entity",
  },
  {
    name: "Entity Attribute",
    template: "{{ state_attr('sensor.temperature', 'temperature') }}",
    variables: "{}",
    description: "Get attribute value from an entity",
  },
  {
    name: "Conditional",
    template: "{% if states('switch.example') == 'on' %}On{% else %}Off{% endif %}",
    variables: "{}",
    description: "Conditional template expression",
  },
  {
    name: "With Variables",
    template: "Hello {{ name }}, the temperature is {{ temperature }}°F",
    variables: '{"name": "World", "temperature": 72}',
    description: "Template with variables",
  },
];

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;
  return (
    <div role="tabpanel" hidden={value !== index} {...other}>
      {value === index && <Box sx={{ pt: 2 }}>{children}</Box>}
    </div>
  );
}

export function TemplateTestTab() {
  const [template, setTemplate] = useState("");
  const [variables, setVariables] = useState("{}");
  const [resultTab, setResultTab] = useState(0);

  const { testing, validating, testResult, validationResult, error, testTemplate, validateTemplate, clearResults } = useTemplateTest();

  const handleTest = () => {
    let parsedVariables: Record<string, any> = {};

    if (variables.trim()) {
      try {
        parsedVariables = JSON.parse(variables);
      } catch (e) {
        return; // Will be caught by validation
      }
    }

    testTemplate({
      template,
      variables: Object.keys(parsedVariables).length > 0 ? parsedVariables : undefined,
    });
    setResultTab(0);
  };

  const handleValidate = () => {
    validateTemplate(template);
    setResultTab(1);
  };

  const handleExampleClick = (example: typeof EXAMPLE_TEMPLATES[0]) => {
    setTemplate(example.template);
    setVariables(example.variables);
    clearResults();
  };

  const handleCopyResult = () => {
    if (resultTab === 0 && testResult) {
      navigator.clipboard.writeText(JSON.stringify(testResult, null, 2));
    } else if (resultTab === 1 && validationResult) {
      navigator.clipboard.writeText(JSON.stringify(validationResult, null, 2));
    }
  };

  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        Template Testing
      </Typography>
      <Typography variant="body2" color="text.secondary" paragraph>
        Test and validate Home Assistant template expressions. Templates use Jinja2 syntax.
      </Typography>

      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="subtitle1" gutterBottom fontWeight="bold">
              Template Editor
            </Typography>

            <Box sx={{ display: "flex", flexDirection: "column", gap: 2, mt: 2 }}>
              <TextField
                label="Template"
                value={template}
                onChange={(e) => setTemplate(e.target.value)}
                placeholder='{{ states("light.example") }}'
                multiline
                rows={8}
                fullWidth
                InputProps={{
                  sx: { fontFamily: "monospace", fontSize: "0.875rem" },
                }}
              />

              <Accordion>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Typography variant="body2">Variables (Optional)</Typography>
                </AccordionSummary>
                <AccordionDetails>
                  <TextField
                    label="Variables (JSON)"
                    value={variables}
                    onChange={(e) => setVariables(e.target.value)}
                    placeholder='{"name": "World", "temperature": 72}'
                    multiline
                    rows={4}
                    fullWidth
                    helperText="JSON object with variables to use in template"
                    InputProps={{
                      sx: { fontFamily: "monospace", fontSize: "0.875rem" },
                    }}
                  />
                </AccordionDetails>
              </Accordion>

              <Box sx={{ display: "flex", gap: 1 }}>
                <Button
                  variant="contained"
                  color="primary"
                  startIcon={testing ? <CircularProgress size={20} color="inherit" /> : <PlayArrowIcon />}
                  onClick={handleTest}
                  disabled={testing || validating || !template}
                  sx={{ flex: 1 }}
                >
                  {testing ? "Testing..." : "Test Template"}
                </Button>
                <Button
                  variant="outlined"
                  startIcon={validating ? <CircularProgress size={20} /> : <CheckCircleIcon />}
                  onClick={handleValidate}
                  disabled={testing || validating || !template}
                  sx={{ flex: 1 }}
                >
                  {validating ? "Validating..." : "Validate"}
                </Button>
              </Box>

              {(testResult || validationResult) && (
                <Button
                  variant="outlined"
                  startIcon={<ContentCopyIcon />}
                  onClick={handleCopyResult}
                  fullWidth
                >
                  Copy Result
                </Button>
              )}
            </Box>
          </Paper>

          <Paper sx={{ p: 3, mt: 3 }}>
            <Typography variant="subtitle1" gutterBottom fontWeight="bold">
              Example Templates
            </Typography>
            <Box sx={{ display: "flex", flexDirection: "column", gap: 1, mt: 2 }}>
              {EXAMPLE_TEMPLATES.map((example, idx) => (
                <Card
                  key={idx}
                  variant="outlined"
                  sx={{ cursor: "pointer" }}
                  onClick={() => handleExampleClick(example)}
                >
                  <CardContent sx={{ py: 1.5, "&:last-child": { pb: 1.5 } }}>
                    <Typography variant="subtitle2" gutterBottom>
                      {example.name}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" paragraph sx={{ fontFamily: "monospace", fontSize: "0.75rem" }}>
                      {example.template}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {example.description}
                    </Typography>
                  </CardContent>
                </Card>
              ))}
            </Box>
          </Paper>
        </Grid>

        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3, minHeight: 400 }}>
            <Box sx={{ borderBottom: 1, borderColor: "divider", mb: 2 }}>
              <Tabs value={resultTab} onChange={(_, v) => setResultTab(v)}>
                <Tab label="Test Results" />
                <Tab label="Validation Results" />
              </Tabs>
            </Box>

            {error && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {error}
              </Alert>
            )}

            <TabPanel value={resultTab} index={0}>
              {testing && (
                <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: 200 }}>
                  <CircularProgress />
                </Box>
              )}

              {!testing && testResult && (
                <Box>
                  <Alert
                    severity={testResult.success ? "success" : "error"}
                    sx={{ mb: 2 }}
                  >
                    {testResult.success ? "Template evaluated successfully" : "Template evaluation failed"}
                  </Alert>

                  <TextField
                    fullWidth
                    multiline
                    label="Result"
                    value={testResult.result !== undefined ? String(testResult.result) : ""}
                    InputProps={{
                      readOnly: true,
                      sx: { fontFamily: "monospace", fontSize: "0.875rem" },
                    }}
                    variant="outlined"
                    minRows={8}
                  />

                  <Box sx={{ mt: 2 }}>
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      Full Response:
                    </Typography>
                    <TextField
                      fullWidth
                      multiline
                      value={JSON.stringify(testResult, null, 2)}
                      InputProps={{
                        readOnly: true,
                        sx: { fontFamily: "monospace", fontSize: "0.75rem" },
                      }}
                      variant="outlined"
                      minRows={6}
                    />
                  </Box>
                </Box>
              )}

              {!testing && !testResult && !error && (
                <Box
                  sx={{
                    display: "flex",
                    justifyContent: "center",
                    alignItems: "center",
                    minHeight: 200,
                    color: "text.secondary",
                  }}
                >
                  <Typography variant="body2">Test a template to see results here</Typography>
                </Box>
              )}
            </TabPanel>

            <TabPanel value={resultTab} index={1}>
              {validating && (
                <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: 200 }}>
                  <CircularProgress />
                </Box>
              )}

              {!validating && validationResult && (
                <Box>
                  <Alert
                    severity={validationResult.valid ? "success" : "error"}
                    sx={{ mb: 2 }}
                  >
                    {validationResult.valid ? "Template is valid" : "Template validation failed"}
                  </Alert>

                  {validationResult.error && (
                    <Alert severity="error" sx={{ mb: 2 }}>
                      {validationResult.error}
                    </Alert>
                  )}

                  <TextField
                    fullWidth
                    multiline
                    value={JSON.stringify(validationResult, null, 2)}
                    InputProps={{
                      readOnly: true,
                      sx: { fontFamily: "monospace", fontSize: "0.875rem" },
                    }}
                    variant="outlined"
                    minRows={10}
                  />
                </Box>
              )}

              {!validating && !validationResult && !error && (
                <Box
                  sx={{
                    display: "flex",
                    justifyContent: "center",
                    alignItems: "center",
                    minHeight: 200,
                    color: "text.secondary",
                  }}
                >
                  <Typography variant="body2">Validate a template to see results here</Typography>
                </Box>
              )}
            </TabPanel>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
}
