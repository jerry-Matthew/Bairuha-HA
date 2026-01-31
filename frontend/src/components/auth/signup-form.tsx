
import React, { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
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
  FormHelperText,
} from "@mui/material";
import { Visibility, VisibilityOff } from "@mui/icons-material";
import {
  validateEmail,
  validatePassword,
  validatePasswordConfirmation,
  validateName,
  validateSignupForm,
  type SignupFormData,
} from "@/lib/auth/validation";

// Logo configuration - matches dashboard
const LOGO_PATH = "/images/logo.png";
const LOGO_SIZE = 40;

interface FieldErrors {
  email: string[];
  password: string[];
  confirmPassword: string[];
  name: string[];
}

export function SignupForm() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState<SignupFormData>({
    email: "",
    password: "",
    confirmPassword: "",
    name: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({
    email: [],
    password: [],
    confirmPassword: [],
    name: [],
  });
  const [serverError, setServerError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  // Real-time validation on field blur
  const validateField = (field: keyof SignupFormData, value: string) => {
    const errors: string[] = [];

    switch (field) {
      case "email":
        errors.push(...validateEmail(value).errors);
        break;
      case "password":
        errors.push(...validatePassword(value).errors);
        // Re-validate confirm password if it has a value
        if (formData.confirmPassword) {
          const confirmErrors = validatePasswordConfirmation(
            value,
            formData.confirmPassword
          ).errors;
          setFieldErrors((prev) => ({
            ...prev,
            confirmPassword: confirmErrors,
          }));
        }
        break;
      case "confirmPassword":
        errors.push(
          ...validatePasswordConfirmation(formData.password, value).errors
        );
        break;
      case "name":
        errors.push(...validateName(value).errors);
        break;
    }

    setFieldErrors((prev) => ({
      ...prev,
      [field]: errors,
    }));
  };

  // Validate entire form
  const isFormValid = (): boolean => {
    const validation = validateSignupForm(formData);
    if (!validation.valid) {
      // Set all field errors
      const emailErrors = validateEmail(formData.email).errors;
      const passwordErrors = validatePassword(formData.password).errors;
      const confirmErrors = validatePasswordConfirmation(
        formData.password,
        formData.confirmPassword
      ).errors;
      const nameErrors = validateName(formData.name).errors;

      setFieldErrors({
        email: emailErrors,
        password: passwordErrors,
        confirmPassword: confirmErrors,
        name: nameErrors,
      });
      return false;
    }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setServerError(null);

    // Validate form
    if (!isFormValid()) {
      return;
    }

    setIsSubmitting(true);

    try {
      // Adjusted API endpoint for NestJS if needed, usually same relative path
      const response = await fetch("/api/auth/signup", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: formData.email.trim(),
          password: formData.password,
          confirmPassword: formData.confirmPassword,
          name: formData.name?.trim() || undefined,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        // Handle validation errors from server
        if (data.details && Array.isArray(data.details)) {
          setFieldErrors((prev) => ({
            ...prev,
            password: data.details,
          }));
        } else {
          setServerError(
            data.error || "Unable to create account. Please try again."
          );
        }
        return;
      }

      // Success!
      setSuccess(true);

      // Redirect to login page after 2 seconds
      setTimeout(() => {
        navigate("/login");
      }, 2000);
    } catch (err: any) {
      setServerError("Unable to create account. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFieldChange =
    (field: keyof SignupFormData) =>
      (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        setFormData((prev) => ({ ...prev, [field]: value }));
        setServerError(null); // Clear server error on input change

        // Clear field errors when user starts typing
        setFieldErrors((prev) => ({ ...prev, [field]: [] }));
      };

  const handleFieldBlur = (field: keyof SignupFormData) => () => {
    validateField(field, formData[field] || "");
  };

  // Check if form is valid for submit button state
  const canSubmit =
    formData.email.trim().length > 0 &&
    formData.password.length > 0 &&
    formData.confirmPassword.length > 0 &&
    Object.values(fieldErrors).every((errors) => errors.length === 0) &&
    !isSubmitting;

  if (success) {
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
            textAlign: "center",
            borderRadius: 2,
            boxShadow: (theme) =>
              theme.palette.mode === "dark"
                ? "0 2px 8px rgba(0, 0, 0, 0.3)"
                : "0 2px 8px rgba(0, 0, 0, 0.1)",
          }}
        >
          <Box
            sx={{
              width: LOGO_SIZE,
              height: LOGO_SIZE,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              mx: "auto",
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
          <Alert
            severity="success"
            sx={{ mb: 2, fontFamily: "Inter, sans-serif" }}
          >
            Account created successfully! Redirecting to login...
          </Alert>
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{ fontFamily: "Inter, sans-serif" }}
          >
            You will be redirected to the login page shortly.
          </Typography>
        </Paper>
      </Box>
    );
  }

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
          maxWidth: 450,
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
            Create Account
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
            Sign up to get started with Home Assistant
          </Typography>
        </Box>

        <form onSubmit={handleSubmit}>
          {serverError && (
            <Alert
              severity="error"
              sx={{
                mb: 2,
                fontFamily: "Inter, sans-serif",
                borderRadius: 1,
              }}
              onClose={() => setServerError(null)}
            >
              {serverError}
            </Alert>
          )}

          {/* Name Field (Optional) */}
          <TextField
            fullWidth
            label="Name (Optional)"
            type="text"
            value={formData.name}
            onChange={handleFieldChange("name")}
            onBlur={handleFieldBlur("name")}
            margin="normal"
            autoComplete="name"
            disabled={isSubmitting}
            error={fieldErrors.name.length > 0}
            helperText={fieldErrors.name[0] || ""}
            sx={{
              "& .MuiOutlinedInput-root": {
                borderRadius: 1,
                fontFamily: "Inter, sans-serif",
              },
            }}
          />

          {/* Email Field */}
          <TextField
            fullWidth
            label="Email"
            type="email"
            value={formData.email}
            onChange={handleFieldChange("email")}
            onBlur={handleFieldBlur("email")}
            margin="normal"
            required
            autoComplete="email"
            autoFocus
            disabled={isSubmitting}
            error={fieldErrors.email.length > 0}
            helperText={fieldErrors.email[0] || ""}
            sx={{
              "& .MuiOutlinedInput-root": {
                borderRadius: 1,
                fontFamily: "Inter, sans-serif",
              },
            }}
          />

          {/* Password Field */}
          <TextField
            fullWidth
            label="Password"
            type={showPassword ? "text" : "password"}
            value={formData.password}
            onChange={handleFieldChange("password")}
            onBlur={handleFieldBlur("password")}
            margin="normal"
            required
            autoComplete="new-password"
            disabled={isSubmitting}
            error={fieldErrors.password.length > 0}
            helperText={fieldErrors.password[0] || ""}
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
                    disabled={isSubmitting}
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

          {/* Password Requirements Helper Text */}
          {formData.password.length > 0 && fieldErrors.password.length > 0 && (
            <FormHelperText
              error
              sx={{
                mt: -1,
                mb: 1,
                fontFamily: "Inter, sans-serif",
                fontSize: "0.75rem",
              }}
            >
              Password must be at least 8 characters with uppercase, lowercase,
              number, and special character
            </FormHelperText>
          )}

          {/* Confirm Password Field */}
          <TextField
            fullWidth
            label="Confirm Password"
            type={showConfirmPassword ? "text" : "password"}
            value={formData.confirmPassword}
            onChange={handleFieldChange("confirmPassword")}
            onBlur={handleFieldBlur("confirmPassword")}
            margin="normal"
            required
            autoComplete="new-password"
            disabled={isSubmitting}
            error={fieldErrors.confirmPassword.length > 0}
            helperText={fieldErrors.confirmPassword[0] || ""}
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
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    edge="end"
                    disabled={isSubmitting}
                    sx={{
                      color: "text.secondary",
                    }}
                  >
                    {showConfirmPassword ? <VisibilityOff /> : <Visibility />}
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
            disabled={!canSubmit}
          >
            {isSubmitting ? (
              <CircularProgress size={24} color="inherit" />
            ) : (
              "Create Account"
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
              to="/login"
              style={{
                background: "linear-gradient(to right, #2563eb, #9333ea)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
                textDecoration: "none",
                fontWeight: 500,
              }}
            >
              Sign in
            </Link>
          </Typography>
        </form>
      </Paper>
    </Box>
  );
}
