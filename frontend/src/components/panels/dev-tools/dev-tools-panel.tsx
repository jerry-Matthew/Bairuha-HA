"use client";

import { useState } from "react";
import { Tabs, Tab, Box } from "@mui/material";
import { PanelHeader } from "@/components/ui/panel-header";
import { YAMLTab } from "./tabs/yaml-tab";
import { StateInspectionTab } from "./tabs/state-inspection-tab";
import { ServiceCallTab } from "./tabs/service-call-tab";
import { TemplateTestTab } from "./tabs/template-test-tab";
import { EventTriggerTab } from "./tabs/event-trigger-tab";
import { StatisticsTab } from "./tabs/statistics-tab";
import { AssistTab } from "./tabs/assist-tab";

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`dev-tools-tabpanel-${index}`}
      aria-labelledby={`dev-tools-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
}

export function DevToolsPanel() {
  const [activeTab, setActiveTab] = useState(0);

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
  };

  return (
    <Box>
      <PanelHeader
        title="Developer Tools"
        description="Debugging and internal inspection tools. ⚠️ High-risk actions - use with caution."
      />
      <Box sx={{ borderBottom: 1, borderColor: "divider", mt: 2 }}>
        <Tabs
          value={activeTab}
          onChange={handleTabChange}
          aria-label="developer tools tabs"
          variant="scrollable"
          scrollButtons="auto"
        >
          <Tab label="YAML" id="dev-tools-tab-0" aria-controls="dev-tools-tabpanel-0" />
          <Tab label="States" id="dev-tools-tab-1" aria-controls="dev-tools-tabpanel-1" />
          <Tab label="Actions" id="dev-tools-tab-2" aria-controls="dev-tools-tabpanel-2" />
          <Tab label="Template" id="dev-tools-tab-3" aria-controls="dev-tools-tabpanel-3" />
          <Tab label="Events" id="dev-tools-tab-4" aria-controls="dev-tools-tabpanel-4" />
          <Tab label="Statistics" id="dev-tools-tab-5" aria-controls="dev-tools-tabpanel-5" />
          <Tab label="Assist" id="dev-tools-tab-6" aria-controls="dev-tools-tabpanel-6" />
        </Tabs>
      </Box>
      <TabPanel value={activeTab} index={0}>
        <YAMLTab />
      </TabPanel>
      <TabPanel value={activeTab} index={1}>
        <StateInspectionTab />
      </TabPanel>
      <TabPanel value={activeTab} index={2}>
        <ServiceCallTab />
      </TabPanel>
      <TabPanel value={activeTab} index={3}>
        <TemplateTestTab />
      </TabPanel>
      <TabPanel value={activeTab} index={4}>
        <EventTriggerTab />
      </TabPanel>
      <TabPanel value={activeTab} index={5}>
        <StatisticsTab />
      </TabPanel>
      <TabPanel value={activeTab} index={6}>
        <AssistTab />
      </TabPanel>
    </Box>
  );
}
