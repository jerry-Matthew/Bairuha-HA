
import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Box, Typography, Button, CircularProgress } from '@mui/material';
import DashboardRenderer from '@/components/dashboards/client/DashboardRenderer';
import { apiClient } from '@/lib/api-client';

interface Dashboard {
    id: string;
    title: string;
    url_path: string;
}

export function DashboardPage() {
    const { dashboardId } = useParams();
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [currentDashboard, setCurrentDashboard] = useState<Dashboard | null>(null);
    const navigate = useNavigate();

    useEffect(() => {
        async function resolveDashboard() {
            try {
                setLoading(true);
                // If no ID is provided, fetch the default 'overview' dashboard
                // In a real app, we might search by url_path or default order
                const dashboards = await apiClient.get<Dashboard[]>('/dashboards');

                let target: Dashboard | undefined;

                if (dashboardId) {
                    // If ID is actually a UUID
                    target = dashboards.find(d => d.id === dashboardId || d.url_path === dashboardId);
                } else {
                    // Default to first one
                    target = dashboards[0];
                }

                if (target) {
                    setCurrentDashboard(target);
                } else {
                    setError("Dashboard not found");
                }
            } catch (err: any) {
                setError(err.message || "Failed to load dashboard");
            } finally {
                setLoading(false);
            }
        }
        resolveDashboard();
    }, [dashboardId]);

    if (loading) {
        return (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 5 }}>
                <CircularProgress />
            </Box>
        );
    }

    if (error || !currentDashboard) {
        return (
            <Box sx={{ p: 4, textAlign: 'center' }}>
                <Typography variant="h5" color="error" gutterBottom>{error || "Dashboard not found"}</Typography>
                <Button variant="outlined" onClick={() => navigate('/')}>Go Home</Button>
            </Box>
        );
    }

    return <DashboardRenderer dashboardId={currentDashboard.id} />;
}
