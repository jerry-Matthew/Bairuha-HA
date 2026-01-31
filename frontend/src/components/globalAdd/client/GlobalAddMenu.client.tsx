"use client";

import React, { useState } from "react";
import {
  IconButton,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Tooltip,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import DevicesIcon from "@mui/icons-material/Devices";
import SmartToyIcon from "@mui/icons-material/SmartToy";
import HomeIcon from "@mui/icons-material/Home";
import PersonAddIcon from "@mui/icons-material/PersonAdd";
import AddDeviceEntry from "@/components/addDevice/AddDeviceEntry";
import { CreateAutomationFlow } from "./CreateAutomationFlow.client";
import { CreateAreaFlow } from "./CreateAreaFlow.client";
import { AddPersonFlow } from "./AddPersonFlow.client";

type FlowType = "device" | "automation" | "area" | "person" | null;

import { useSearchParams } from "react-router-dom";

// ... existing imports

export function GlobalAddMenu() {
  const [searchParams] = useSearchParams();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [activeFlow, setActiveFlow] = useState<FlowType>(null);
  const open = Boolean(anchorEl);

  // Check for OAuth callback params to auto-open device flow
  React.useEffect(() => {
    if (searchParams.has("flowId") || searchParams.has("oauth_error")) {
      setActiveFlow("device");
    }
  }, [searchParams]);

  const handleClick = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleFlowOpen = (flow: FlowType) => {
    setActiveFlow(flow);
    handleClose();
  };

  const handleFlowClose = () => {
    setActiveFlow(null);
  };

  return (
    <>
      <Tooltip title="Add">
        <IconButton
          onClick={handleClick}
          sx={{
            color: "primary.main",
            backgroundColor: "rgba(0, 206, 209, 0.1)",
            "&:hover": {
              backgroundColor: "rgba(0, 206, 209, 0.2)",
            },
          }}
        >
          <AddIcon />
        </IconButton>
      </Tooltip>

      <Menu
        anchorEl={anchorEl}
        open={open}
        onClose={handleClose}
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
        <MenuItem onClick={() => handleFlowOpen("device")}>
          <ListItemIcon>
            <DevicesIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Add device</ListItemText>
        </MenuItem>

        <MenuItem onClick={() => handleFlowOpen("automation")}>
          <ListItemIcon>
            <SmartToyIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Create automation</ListItemText>
        </MenuItem>

        <MenuItem onClick={() => handleFlowOpen("area")}>
          <ListItemIcon>
            <HomeIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Create area</ListItemText>
        </MenuItem>

        <MenuItem onClick={() => handleFlowOpen("person")}>
          <ListItemIcon>
            <PersonAddIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Add person</ListItemText>
        </MenuItem>
      </Menu>

      {activeFlow === "device" && <AddDeviceEntry open={true} onClose={handleFlowClose} />}
      {activeFlow === "automation" && <CreateAutomationFlow open onClose={handleFlowClose} />}
      {activeFlow === "area" && <CreateAreaFlow open onClose={handleFlowClose} />}
      {activeFlow === "person" && <AddPersonFlow open onClose={handleFlowClose} />}
    </>
  );
}

