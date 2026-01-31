import React, { Component, type ErrorInfo, type ReactNode } from "react";
import { Box, Typography, Button, Container, Paper } from "@mui/material";

interface Props {
    children?: ReactNode;
}

interface State {
    hasError: boolean;
    error?: Error;
    errorInfo?: ErrorInfo;
}

export class ErrorBoundary extends Component<Props, State> {
    public state: State = {
        hasError: false,
    };

    public static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error };
    }

    public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.error("Uncaught error:", error, errorInfo);
        this.setState({ errorInfo });
    }

    public render() {
        if (this.state.hasError) {
            return (
                <Container maxWidth="md" sx={{ mt: 8 }}>
                    <Paper sx={{ p: 4, textAlign: 'center' }} elevation={3}>
                        <Typography variant="h4" color="error" gutterBottom>
                            Something went wrong
                        </Typography>
                        <Typography variant="body1" color="text.secondary" paragraph>
                            An unexpected error occurred. Please try reloading the page.
                        </Typography>
                        {this.state.error && (
                            <Box sx={{ mt: 2, mb: 4, bgcolor: 'grey.100', p: 2, borderRadius: 1, textAlign: 'left', overflow: 'auto' }}>
                                <Typography variant="caption" component="pre" sx={{ fontFamily: 'monospace' }}>
                                    {this.state.error.toString()}
                                </Typography>
                            </Box>
                        )}
                        <Button variant="contained" color="primary" onClick={() => window.location.reload()}>
                            Reload Application
                        </Button>
                    </Paper>
                </Container>
            );
        }

        return this.props.children;
    }
}
