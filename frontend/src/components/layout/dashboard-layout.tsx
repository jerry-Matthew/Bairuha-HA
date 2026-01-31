import { useState, memo, useEffect } from "react";
import { useNavigate, Link as RouterLink } from "react-router-dom";
import {
  Drawer,
  AppBar,
  Toolbar,
  IconButton,
  Typography,
  Box,
  List,
  Avatar,
  Divider,
  Button,
  Menu,
  MenuItem,
  Tooltip,
} from "@mui/material";
import MenuIcon from "@mui/icons-material/Menu";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import LightModeIcon from "@mui/icons-material/LightMode";
import DarkModeIcon from "@mui/icons-material/DarkMode";
import PersonOutlinedIcon from "@mui/icons-material/PersonOutlined";
import KeyboardArrowUpIcon from "@mui/icons-material/KeyboardArrowUp";
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";
import AccountCircleOutlinedIcon from "@mui/icons-material/AccountCircleOutlined";
import LogoutOutlinedIcon from "@mui/icons-material/LogoutOutlined";
import {
  OverviewSidebarItem,
  MapSidebarItem,

  ActivitySidebarItem,
  SettingsSidebarItem,
  MediaSidebarItem,
  TerminalSidebarItem,
  HACSSidebarItem,
  GroupsSidebarItem,
  DeveloperToolsSidebarItem,
  EwelinkSidebarItem,
} from "./sidebar-items";
import { DRAWER_WIDTH, DRAWER_WIDTH_COLLAPSED } from "@/lib/constants";
import { useAppSelector, useAppDispatch } from "@/store/hooks";
import { selectUser, selectDarkMode } from "@/store/selectors";
import { updateSettings } from "@/store/slices/settings-slice";
import { capitalizeName } from "@/lib/utils";
import { useAuth } from "@/contexts/auth-context";
import GlobalAddEntry from "@/components/globalAdd/GlobalAddEntry";
import { NotificationBadge } from "@/components/notifications/notification-badge";

// Logo configuration - Update this path to match your image file
// Place your logo image in: public/images/logo.{svg|png|jpg|jpeg}
// Supported formats: SVG, PNG, JPG, JPEG
const LOGO_PATH = "/images/logo.png"; // Updated to match the actual file name
const LOGO_SIZE = 32; // Adjust size as needed

interface SidebarDrawerProps {
  collapsed: boolean;
  onToggleCollapse: () => void;
  darkMode: boolean;
  userName: string;
  userRole?: string;
}

// Memoized drawer component
const SidebarDrawer = memo(
  ({
    collapsed,
    onToggleCollapse,
    darkMode,
    userName,
    userRole,
  }: SidebarDrawerProps & { userName: string; userRole?: string }) => {
    return (
      <Box sx={{ display: "flex", flexDirection: "column", height: "100%" }}>
        <Toolbar
          sx={{
            px: collapsed ? 1 : 2,
            py: 1,
            borderBottom: 1,
            borderColor: "rgba(255, 255, 255, 0.2)",
            justifyContent: collapsed ? "center" : "space-between",
            minHeight: "64px !important",
          }}
        >
          {!collapsed && (
            <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
              <Box
                sx={{
                  width: LOGO_SIZE,
                  height: LOGO_SIZE,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                <img
                  src={LOGO_PATH}
                  alt="Logo"
                  width={LOGO_SIZE}
                  height={LOGO_SIZE}
                  style={{
                    objectFit: "contain",
                    width: "auto",
                    height: "auto",
                  }}
                />
              </Box>
              <Typography
                variant="h6"
                noWrap
                component="div"
                fontWeight={700}
                sx={{
                  color: "#ffffff",
                  fontFamily: "Inter, sans-serif",
                }}
              >
                Home Assistant
              </Typography>
            </Box>
          )}
          {collapsed && (
            <Box
              sx={{
                width: LOGO_SIZE,
                height: LOGO_SIZE,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              <img
                src={LOGO_PATH}
                alt="Logo"
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
          )}
          <IconButton
            onClick={onToggleCollapse}
            sx={{
              color: "#ffffff",
              p: 0.5,
              ml: collapsed ? 0 : "auto",
              "&:hover": {
                backgroundColor: "rgba(255, 255, 255, 0.1)",
              },
            }}
          >
            {collapsed ? <ChevronRightIcon /> : <ChevronLeftIcon />}
          </IconButton>
        </Toolbar>
        <List sx={{ flexGrow: 1, py: 1 }}>
          <OverviewSidebarItem collapsed={collapsed} />
          <MapSidebarItem collapsed={collapsed} />

          <ActivitySidebarItem collapsed={collapsed} />
          <GroupsSidebarItem collapsed={collapsed} />
          <MediaSidebarItem collapsed={collapsed} />
          <HACSSidebarItem collapsed={collapsed} />
          <EwelinkSidebarItem collapsed={collapsed} />
          <TerminalSidebarItem collapsed={collapsed} />
          <DeveloperToolsSidebarItem collapsed={collapsed} />
          <SettingsSidebarItem collapsed={collapsed} />
        </List>
        <Box
          sx={{
            p: collapsed ? 1 : 2,
            borderTop: 1,
            borderColor: "rgba(255, 255, 255, 0.2)",
          }}
        >
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              gap: collapsed ? 0 : 1,
              justifyContent: collapsed ? "center" : "flex-start",
            }}
          >
            <Avatar
              sx={{
                width: collapsed ? 32 : 40,
                height: collapsed ? 32 : 40,
                bgcolor: darkMode ? "rgba(255, 255, 255, 0.2)" : "#ffffff",
                color: darkMode ? "#ffffff" : "#666666",
                fontSize: collapsed ? "0.875rem" : "1rem",
                fontWeight: 600,
                fontFamily: "Inter, sans-serif",
              }}
            >
              {userName.charAt(0).toUpperCase()}
            </Avatar>
            {!collapsed && (
              <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                <Typography
                  variant="body2"
                  sx={{
                    color: "#ffffff",
                    fontWeight: 500,
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    fontFamily: "Inter, sans-serif",
                  }}
                >
                  {userName}
                </Typography>
                <Typography
                  variant="caption"
                  sx={{
                    color: "rgba(255, 255, 255, 0.7)",
                    fontSize: "0.7rem",
                    fontFamily: "Inter, sans-serif",
                    textTransform: "uppercase",
                  }}
                >
                  {userRole
                    ? userRole.charAt(0).toUpperCase() + userRole.slice(1)
                    : "User"}
                </Typography>
              </Box>
            )}
          </Box>
        </Box>
      </Box>
    );
  }
);

SidebarDrawer.displayName = "SidebarDrawer";

export function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [greeting, setGreeting] = useState("Welcome");
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const dispatch = useAppDispatch();
  const user = useAppSelector(selectUser);
  const darkMode = useAppSelector(selectDarkMode);
  const { logout } = useAuth();
  const navigate = useNavigate();

  const displayName = capitalizeName(user?.name || "User");
  const displayRole = user?.role || "user";

  // Client-side only: Calculate greeting after mount to avoid hydration mismatch
  // Server renders "Welcome" initially, then updates to time-based greeting on client
  useEffect(() => {
    const getGreeting = () => {
      const hour = new Date().getHours();
      if (hour < 12) return "Good Morning";
      if (hour < 18) return "Good Afternoon";
      return "Good Evening";
    };
    setGreeting(getGreeting());
  }, []);

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  const handleCollapseToggle = () => {
    setCollapsed(!collapsed);
  };

  const handleProfileMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleProfileMenuClose = () => {
    setAnchorEl(null);
  };

  const handleThemeToggle = () => {
    dispatch(updateSettings({ darkMode: !darkMode }));
  };

  /**
   * Handle logout with industry-standard practices:
   * - Shows loading state
   * - Prevents multiple simultaneous calls
   * - Handles errors gracefully
   * - Redirects to login page
   */
  const handleLogout = async () => {
    // Prevent multiple simultaneous logout calls
    if (isLoggingOut) {
      return;
    }

    try {
      setIsLoggingOut(true);
      handleProfileMenuClose(); // Close menu immediately

      // Call logout (handles token revocation and state cleanup)
      await logout();

      // Redirect to login page
      navigate("/login");
    } catch (error) {
      // Log error but still redirect (state is already cleared)
      console.error("Logout error:", error);
      navigate("/login");
    } finally {
      setIsLoggingOut(false);
    }
  };

  const drawerWidth = collapsed ? DRAWER_WIDTH_COLLAPSED : DRAWER_WIDTH;

  return (
    <Box sx={{ display: "flex", minHeight: "100vh" }}>
      <AppBar
        position="fixed"
        elevation={1}
        sx={{
          width: { md: `calc(100% - ${drawerWidth}px)` },
          ml: { md: `${drawerWidth}px` },
          transition: "width 0.3s, margin 0.3s",
          boxShadow:
            "0 1px 3px rgba(0, 0, 0, 0.06), 0 1px 2px rgba(0, 0, 0, 0.04)",
          backgroundColor: darkMode ? "#243447" : "#ffffff",
          color: darkMode ? "#ffffff" : "#1a1a1a",
        }}
      >
        <Toolbar
          sx={{ justifyContent: "space-between", px: { xs: 1, sm: 2, md: 3 } }}
        >
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              gap: { xs: 1, sm: 2 },
            }}
          >
            <IconButton
              color="inherit"
              aria-label="open drawer"
              edge="start"
              onClick={handleDrawerToggle}
              sx={{ mr: 1, display: { md: "none" } }}
            >
              <MenuIcon />
            </IconButton>
            <Typography
              variant="h6"
              sx={{
                fontFamily: "Inter, sans-serif",
                fontWeight: 400,
                fontSize: { xs: "0.875rem", sm: "0.9375rem", md: "1rem" },
                color: darkMode ? "#ffffff" : "#1a1a1a",
                display: { xs: "none", sm: "block" },
              }}
            >
              {greeting}, {displayName.split(" ")[0]}
            </Typography>
          </Box>
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              gap: { xs: 0.5, sm: 1 },
            }}
          >
            <GlobalAddEntry />
            {user?.id && (
              <NotificationBadge
                userId={user.id}
                onClick={() => navigate("/notifications")}
              />
            )}
            <Tooltip
              title={darkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
              componentsProps={{
                tooltip: {
                  sx: {
                    backgroundColor: darkMode
                      ? "rgba(0, 0, 0, 0.87)"
                      : "rgba(255, 255, 255, 0.9)",
                    color: darkMode ? "#ffffff" : "#1a2332",
                    fontSize: "0.75rem",
                    fontWeight: 500,
                    fontFamily: "Inter, sans-serif",
                  },
                },
              }}
            >
              <IconButton
                onClick={handleThemeToggle}
                sx={{
                  color: darkMode
                    ? "rgba(255, 255, 255, 0.7)"
                    : "text.secondary",
                  backgroundColor: darkMode
                    ? "rgba(255, 255, 255, 0.1)"
                    : "rgba(0, 0, 0, 0.04)",
                  "&:hover": {
                    backgroundColor: darkMode
                      ? "rgba(255, 255, 255, 0.15)"
                      : "rgba(0, 0, 0, 0.08)",
                  },
                }}
              >
                {darkMode ? <LightModeIcon /> : <DarkModeIcon />}
              </IconButton>
            </Tooltip>
            <Button
              onClick={handleProfileMenuOpen}
              startIcon={<PersonOutlinedIcon />}
              endIcon={
                anchorEl ? <KeyboardArrowUpIcon /> : <KeyboardArrowDownIcon />
              }
              sx={{
                background: "linear-gradient(to right, #2563eb, #9333ea)",
                backgroundColor: "transparent !important",
                color: "#ffffff",
                textTransform: "none",
                borderRadius: "8px",
                px: { xs: 1, sm: 2 },
                py: 1,
                fontWeight: 600,
                fontFamily: "Inter, sans-serif",
                minWidth: { xs: "auto", sm: "unset" },
                "& .MuiButton-startIcon": {
                  margin: { xs: 0, sm: "0 8px 0 -4px" },
                },
                "& .MuiButton-endIcon": {
                  margin: { xs: 0, sm: "0 -4px 0 8px" },
                  display: { xs: "none", sm: "flex" },
                },
                "&:hover": {
                  background: "linear-gradient(to right, #1d4ed8, #7e22ce)",
                  backgroundColor: "transparent !important",
                },
              }}
            >
              <Box
                component="span"
                sx={{ display: { xs: "none", sm: "inline" } }}
              >
                {displayName}
              </Box>
            </Button>
            <Menu
              anchorEl={anchorEl}
              open={Boolean(anchorEl)}
              onClose={handleProfileMenuClose}
              anchorOrigin={{
                vertical: "bottom",
                horizontal: "right",
              }}
              transformOrigin={{
                vertical: "top",
                horizontal: "right",
              }}
              PaperProps={{
                sx: {
                  mt: 1,
                  minWidth: 200,
                  borderRadius: "8px",
                  boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)",
                },
              }}
            >
              <MenuItem
                component={RouterLink}
                to="/profile"
                onClick={handleProfileMenuClose}
                sx={{
                  fontFamily: "Inter, sans-serif",
                  fontWeight: 400,
                  color: "text.secondary",
                  py: 1.5,
                }}
              >
                <AccountCircleOutlinedIcon
                  sx={{ mr: 1.5, fontSize: 20, color: "text.secondary" }}
                />
                My Account
              </MenuItem>
              <Divider />
              <MenuItem
                onClick={handleLogout}
                disabled={isLoggingOut}
                sx={{
                  fontFamily: "Inter, sans-serif",
                  fontWeight: 400,
                  color: "error.main",
                  py: 1.5,
                  opacity: isLoggingOut ? 0.6 : 1,
                }}
              >
                <LogoutOutlinedIcon
                  sx={{ mr: 1.5, fontSize: 20, color: "error.main" }}
                />
                {isLoggingOut ? "Logging out..." : "Logout"}
              </MenuItem>
            </Menu>
          </Box>
        </Toolbar>
      </AppBar>
      <Box
        component="nav"
        sx={{
          width: { md: drawerWidth },
          flexShrink: { md: 0 },
          transition: "width 0.3s",
        }}
      >
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={handleDrawerToggle}
          ModalProps={{
            keepMounted: true,
          }}
          sx={{
            display: { xs: "block", md: "none" },
            "& .MuiDrawer-paper": {
              boxSizing: "border-box",
              width: DRAWER_WIDTH,
              background: darkMode
                ? "#1a2332"
                : "linear-gradient(to bottom, #2563eb, #9333ea)",
              backgroundColor: darkMode ? "#1a2332" : "transparent !important",
              color: "#ffffff",
              transition: "background-color 0.3s ease",
            },
          }}
        >
          <SidebarDrawer
            collapsed={false}
            onToggleCollapse={handleCollapseToggle}
            darkMode={darkMode}
            userName={displayName}
            userRole={displayRole}
          />
        </Drawer>
        <Drawer
          variant="permanent"
          sx={{
            display: { xs: "none", md: "block" },
            "& .MuiDrawer-paper": {
              boxSizing: "border-box",
              width: drawerWidth,
              background: darkMode
                ? "#1a2332"
                : "linear-gradient(to bottom, #2563eb, #9333ea)",
              backgroundColor: darkMode ? "#1a2332" : "transparent !important",
              color: "#ffffff",
              transition: "width 0.3s, background-color 0.3s ease",
              overflowX: "hidden",
              // Hide scrollbar
              "&::-webkit-scrollbar": {
                display: "none",
              },
              "&::-webkit-scrollbar-thumb": {
                display: "none",
              },
              scrollbarWidth: "none", // Firefox
              msOverflowStyle: "none", // IE and Edge
            },
          }}
          open
        >
          <SidebarDrawer
            collapsed={collapsed}
            onToggleCollapse={handleCollapseToggle}
            darkMode={darkMode}
            userName={displayName}
            userRole={displayRole}
          />
        </Drawer>
      </Box>
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: { xs: 2, sm: 2.5, md: 3 },
          width: { md: `calc(100% - ${drawerWidth}px)` },
          mt: { xs: 7, sm: 8 },
          transition: "width 0.3s, background-color 0.3s",
          backgroundColor: darkMode ? "#1a2332" : "#f5f5f5",
          minHeight: "calc(100vh - 64px)",
        }}
      >
        {children}
      </Box>
    </Box>
  );
}
