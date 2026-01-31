import { memo } from "react";
import { useLocation, Link as RouterLink } from "react-router-dom";
import {
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Tooltip,
} from "@mui/material";
import { useAppSelector } from "@/store/hooks";
import { selectDarkMode } from "@/store/selectors";

interface SidebarItemProps {
  label: string;
  path: string;
  icon: React.ComponentType;
  collapsed?: boolean;
}

export const SidebarItem = memo(
  ({ label, path, icon: Icon, collapsed = false }: SidebarItemProps) => {
    const location = useLocation();
    const darkMode = useAppSelector(selectDarkMode);
    const isActive = location.pathname === path;

    const buttonContent = (
      <ListItemButton
        component={RouterLink}
        to={path}
        selected={isActive}
        sx={{
          minHeight: 48,
          justifyContent: collapsed ? "center" : "flex-start",
          px: collapsed ? 1.5 : 2,
          borderRadius: isActive ? "8px" : collapsed ? "8px" : 0,
          // Apply consistent margins to all items to prevent jumping on hover
          mx: collapsed ? 1 : 1.5,
          my: 0.5,
          backgroundColor: isActive
            ? darkMode
              ? "rgba(255, 255, 255, 0.25)"
              : "#ffffff"
            : "transparent",
          color: isActive ? (darkMode ? "#ffffff" : "#1a1a1a") : "#ffffff",
          transition: "all 0.2s ease-in-out",
          position: "relative",
          // Add left border indicator for selected items - primary color in light mode, white in dark mode
          borderLeft: isActive
            ? darkMode
              ? "3px solid #ffffff"
              : "3px solid #9333ea"
            : "3px solid transparent",
          "&.Mui-selected": {
            backgroundColor: darkMode ? "rgba(255, 255, 255, 0.25)" : "#ffffff",
            color: darkMode ? "#ffffff" : "#1a1a1a",
            boxShadow: darkMode
              ? "0 2px 8px rgba(255, 255, 255, 0.1)"
              : "0 2px 8px rgba(0, 0, 0, 0.08)",
            transform: "scale(1.02)",
            "&:hover": {
              backgroundColor: darkMode
                ? "rgba(255, 255, 255, 0.3)"
                : "#f5f5f5",
              boxShadow: darkMode
                ? "0 4px 12px rgba(255, 255, 255, 0.15)"
                : "0 4px 12px rgba(0, 0, 0, 0.12)",
            },
            "& .MuiListItemIcon-root": {
              color: darkMode ? "#ffffff" : "#1a1a1a",
              transform: "scale(1.1)",
              transition: "transform 0.2s ease-in-out",
            },
            "& .MuiListItemText-primary": {
              color: darkMode ? "#ffffff" : "#1a1a1a",
              fontWeight: 700,
              fontSize: "0.9rem",
            },
          },
          "&:hover": {
            backgroundColor: isActive
              ? darkMode
                ? "rgba(255, 255, 255, 0.3)"
                : "#f5f5f5"
              : "rgba(255, 255, 255, 0.18)",
            color: isActive ? (darkMode ? "#ffffff" : "#1a1a1a") : "#ffffff",
            borderRadius: "8px",
            transform: isActive ? "scale(1.02)" : "scale(1.01)",
            boxShadow: isActive
              ? darkMode
                ? "0 4px 12px rgba(255, 255, 255, 0.15)"
                : "0 4px 12px rgba(0, 0, 0, 0.12)"
              : darkMode
                ? "0 2px 6px rgba(255, 255, 255, 0.1)"
                : "0 2px 6px rgba(0, 0, 0, 0.08)",
            "& .MuiListItemIcon-root": {
              color: isActive ? (darkMode ? "#ffffff" : "#1a1a1a") : "#ffffff",
              transform: isActive ? "scale(1.1)" : "scale(1.05)",
              transition: "transform 0.2s ease-in-out",
            },
            "& .MuiListItemText-primary": {
              color: isActive ? (darkMode ? "#ffffff" : "#1a1a1a") : "#ffffff",
              fontWeight: isActive ? 700 : 500,
            },
          },
        }}
      >
        <ListItemIcon
          sx={{
            color: isActive ? (darkMode ? "#ffffff" : "#1a1a1a") : "#ffffff",
            minWidth: collapsed ? 0 : 40,
            justifyContent: "center",
          }}
        >
          <Icon />
        </ListItemIcon>
        {!collapsed && (
          <ListItemText
            primary={label}
            primaryTypographyProps={{
              sx: {
                color: isActive
                  ? darkMode
                    ? "#ffffff"
                    : "#1a1a1a"
                  : "#ffffff",
                fontSize: "0.875rem",
                fontWeight: isActive ? 600 : 400,
                fontFamily: "Inter, sans-serif",
              },
            }}
          />
        )}
      </ListItemButton>
    );

    return (
      <ListItem disablePadding>
        {collapsed ? (
          <Tooltip title={label} placement="right" arrow>
            {buttonContent}
          </Tooltip>
        ) : (
          buttonContent
        )}
      </ListItem>
    );
  }
);

SidebarItem.displayName = "SidebarItem";
