
import DashboardOutlinedIcon from "@mui/icons-material/DashboardOutlined";
import LocationOnOutlinedIcon from "@mui/icons-material/LocationOnOutlined";

import TimelineOutlinedIcon from "@mui/icons-material/TimelineOutlined";
import SettingsOutlinedIcon from "@mui/icons-material/SettingsOutlined";
import PersonOutlinedIcon from "@mui/icons-material/PersonOutlined";
import PlayArrowOutlinedIcon from "@mui/icons-material/PlayArrowOutlined";
import TerminalIcon from "@mui/icons-material/Terminal";
import BusinessIcon from "@mui/icons-material/Business";
import GroupIcon from "@mui/icons-material/Group";
import CodeIcon from "@mui/icons-material/Code";
import FlashOnIcon from "@mui/icons-material/FlashOn";
import { SidebarItem } from "./sidebar-item";

interface SidebarItemWrapperProps {
  collapsed?: boolean;
}

export const OverviewSidebarItem = ({ collapsed }: SidebarItemWrapperProps) => (
  <SidebarItem label="Overview" path="/overview" icon={DashboardOutlinedIcon} collapsed={collapsed} />
);

export const MapSidebarItem = ({ collapsed }: SidebarItemWrapperProps) => (
  <SidebarItem label="Map" path="/map" icon={LocationOnOutlinedIcon} collapsed={collapsed} />
);



export const ActivitySidebarItem = ({ collapsed }: SidebarItemWrapperProps) => (
  <SidebarItem label="Activity" path="/activity" icon={TimelineOutlinedIcon} collapsed={collapsed} />
);

export const SettingsSidebarItem = ({ collapsed }: SidebarItemWrapperProps) => (
  <SidebarItem label="Settings" path="/settings" icon={SettingsOutlinedIcon} collapsed={collapsed} />
);

export const ProfileSidebarItem = ({ collapsed }: SidebarItemWrapperProps) => (
  <SidebarItem label="Profile" path="/profile" icon={PersonOutlinedIcon} collapsed={collapsed} />
);

export const MediaSidebarItem = ({ collapsed }: SidebarItemWrapperProps) => (
  <SidebarItem label="Media" path="/media" icon={PlayArrowOutlinedIcon} collapsed={collapsed} />
);

export const TerminalSidebarItem = ({ collapsed }: SidebarItemWrapperProps) => (
  <SidebarItem label="Terminal" path="/terminal" icon={TerminalIcon} collapsed={collapsed} />
);

export const HACSSidebarItem = ({ collapsed }: SidebarItemWrapperProps) => (
  <SidebarItem label="HACS" path="/hacs" icon={BusinessIcon} collapsed={collapsed} />
);

export const GroupsSidebarItem = ({ collapsed }: SidebarItemWrapperProps) => (
  <SidebarItem label="Groups" path="/groups" icon={GroupIcon} collapsed={collapsed} />
);

export const DeveloperToolsSidebarItem = ({ collapsed }: SidebarItemWrapperProps) => (
  <SidebarItem label="Developer Tools" path="/dev-tools" icon={CodeIcon} collapsed={collapsed} />
);



export const EwelinkSidebarItem = ({ collapsed }: SidebarItemWrapperProps) => (
  <SidebarItem label="eWeLink Smart Home" path="/ewelink" icon={FlashOnIcon} collapsed={collapsed} />
);
