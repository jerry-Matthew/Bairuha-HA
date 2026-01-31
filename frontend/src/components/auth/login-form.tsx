
import React, { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/contexts/auth-context";
import {
  Box,
  Button,
  TextField,
  Typography,
  Alert,
  CircularProgress,
  Paper,
  InputAdornment,
  IconButton,
} from "@mui/material";
import { Visibility, VisibilityOff } from "@mui/icons-material";

// Logo configuration - matches dashboard
const LOGO_PATH = "/images/logo.png";
const LOGO_SIZE = 40;

export function LoginForm() {
  const { login, isLoading, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Redirect to overview if already authenticated
  useEffect(() => {
    if (isAuthenticated && !isLoading) {
      navigate("/overview");
    }
  }, [isAuthenticated, isLoading, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      await login({ email, password });
      // Redirect to overview page on successful login
      navigate("/overview");
    } catch (err: any) {
      setError(err.message || "Login failed. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEmail(e.target.value);
    setError(null); // Clear error on input change
  };

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPassword(e.target.value);
    setError(null); // Clear error on input change
  };

  return (
    <Box
      sx={{
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        minHeight: "100vh",
        backgroundColor: "background.default",
        padding: 2,
      }}
    >
      <Paper
        elevation={0}
        sx={{
          padding: 4,
          width: "100%",
          maxWidth: 420,
          borderRadius: 2,
          boxShadow: (theme) =>
            theme.palette.mode === "dark"
              ? "0 2px 8px rgba(0, 0, 0, 0.3)"
              : "0 2px 8px rgba(0, 0, 0, 0.1)",
        }}
      >
        {/* Logo and Title */}
        <Box
          sx={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            mb: 3,
          }}
        >
          <Box
            sx={{
              width: LOGO_SIZE,
              height: LOGO_SIZE,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              mb: 2,
            }}
          >
            <img
              src={LOGO_PATH}
              alt="Home Assistant Logo"
              width={LOGO_SIZE}
              height={LOGO_SIZE}
              style={{
                objectFit: "contain",
                maxWidth: "100%",
                width: "auto",
                height: "auto",
              }}
            />
          </Box>
          <Typography
            variant="h4"
            component="h1"
            gutterBottom
            align="center"
            sx={{
              fontFamily: "Inter, sans-serif",
              fontWeight: 700,
              color: "primary.main",
            }}
          >
            Sign In
          </Typography>
          <Typography
            variant="body2"
            color="text.secondary"
            align="center"
            sx={{
              fontFamily: "Inter, sans-serif",
              mt: 0.5,
            }}
          >
            Enter your credentials to access Home Assistant
          </Typography>
        </Box>

        <form onSubmit={handleSubmit}>
          {error && (
            <Alert
              severity="error"
              sx={{
                mb: 2,
                fontFamily: "Inter, sans-serif",
                borderRadius: 1,
              }}
              onClose={() => setError(null)}
            >
              {error}
            </Alert>
          )}

          <TextField
            fullWidth
            label="Email"
            type="email"
            value={email}
            onChange={handleEmailChange}
            margin="normal"
            required
            autoComplete="email"
            autoFocus
            disabled={isSubmitting || isLoading}
            error={!!error}
            sx={{
              "& .MuiOutlinedInput-root": {
                borderRadius: 1,
                fontFamily: "Inter, sans-serif",
              },
            }}
          />

          <TextField
            fullWidth
            label="Password"
            type={showPassword ? "text" : "password"}
            value={password}
            onChange={handlePasswordChange}
            margin="normal"
            required
            autoComplete="current-password"
            disabled={isSubmitting || isLoading}
            error={!!error}
            sx={{
              "& .MuiOutlinedInput-root": {
                borderRadius: 1,
                fontFamily: "Inter, sans-serif",
              },
            }}
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton
                    onClick={() => setShowPassword(!showPassword)}
                    edge="end"
                    disabled={isSubmitting || isLoading}
                    sx={{
                      color: "text.secondary",
                    }}
                  >
                    {showPassword ? <VisibilityOff /> : <Visibility />}
                  </IconButton>
                </InputAdornment>
              ),
            }}
          />

          <Button
            type="submit"
            fullWidth
            variant="contained"
            sx={{
              mt: 3,
              mb: 2,
              background: "linear-gradient(to right, #2563eb, #9333ea)",
              backgroundColor: "transparent !important",
              color: "#ffffff",
              textTransform: "none",
              borderRadius: 1,
              py: 1.5,
              fontFamily: "Inter, sans-serif",
              fontWeight: 600,
              fontSize: "1rem",
              "&:hover": {
                background: "linear-gradient(to right, #1d4ed8, #7e22ce)",
                backgroundColor: "transparent !important",
              },
              "&:disabled": {
                background:
                  "linear-gradient(to right, rgba(37, 99, 235, 0.5), rgba(147, 51, 234, 0.5))",
                backgroundColor: "transparent !important",
                color: "#ffffff",
              },
            }}
            disabled={isSubmitting || isLoading || !email || !password}
          >
            {isSubmitting || isLoading ? (
              <CircularProgress size={24} color="inherit" />
            ) : (
              "Sign In"
            )}
          </Button>

          <Typography
            variant="body2"
            align="center"
            color="text.secondary"
            sx={{
              fontFamily: "Inter, sans-serif",
            }}
          >
            Don't have an account?{" "}
            <Link
              to="/signup"
              style={{
                background: "linear-gradient(to right, #2563eb, #9333ea)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
                textDecoration: "none",
                fontWeight: 500,
              }}
            >
              Sign up
            </Link>
          </Typography>
        </form>
      </Paper>
    </Box>
  );
}
