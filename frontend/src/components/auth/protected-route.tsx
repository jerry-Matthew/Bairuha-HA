/**
 * Protected Route Component
 * Wraps routes that require authentication
 * 
 * CRITICAL: Server and client MUST render the SAME HTML structure on first render.
 * The wrapper div always exists - only inner content changes conditionally.
 */

"use client";

import { useAuth } from "@/contexts/auth-context";
import { LoginForm } from "./login-form";
import { Box, CircularProgress } from "@mui/material";

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const auth = useAuth();

  // ALWAYS render the same wrapper structure - this is the key fix
  // Server and client both render <div id="protected-root"> with conditional content inside
  // This ensures hydration succeeds because the DOM tree structure matches exactly
  return (
    <div id="protected-root" suppressHydrationWarning>
      {auth.isLoading && (
        <Box
          sx={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            minHeight: "100vh",
          }}
        >
          <CircularProgress />
        </Box>
      )}
      {!auth.isLoading && !auth.isAuthenticated && <LoginForm />}
      {!auth.isLoading && auth.isAuthenticated && children}
    </div>
  );
}

