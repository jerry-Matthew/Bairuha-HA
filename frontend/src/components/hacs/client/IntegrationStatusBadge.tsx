"use client";

import React from "react";
import { Chip } from "@mui/material";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";

interface IntegrationStatusBadgeProps {
    domain?: string;
    installedOnHA: string[];
}

export function IntegrationStatusBadge({
    domain,
    installedOnHA,
}: IntegrationStatusBadgeProps) {
    if (!domain || !installedOnHA.includes(domain)) {
        return null;
    }

    return (
        <Chip
            label="Installed on HA"
            color="success"
            size="small"
            icon={<CheckCircleIcon />}
            sx={{ ml: 1 }}
        />
    );
}
