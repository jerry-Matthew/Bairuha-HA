import { Box } from "@mui/material";
import { TerminalPanel } from "@/components/panels/terminal/terminal-panel";

export default function TerminalPage() {
  return (
    <Box
      sx={{
        height: "calc(100vh - 112px)", // Account for app bar (64px) + padding (48px)
        width: "100%",
        margin: "-24px", // Negative margin to offset parent padding (3 * 8px = 24px)
        "@media (max-width: 960px)": {
          margin: "-12px", // Smaller margin on mobile
        },
      }}
    >
      <TerminalPanel />
    </Box>
  );
}
