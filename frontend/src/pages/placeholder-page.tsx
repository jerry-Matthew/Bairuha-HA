import React from 'react';
import { Box, Typography, Paper } from '@mui/material';
import { useLocation } from 'react-router-dom';

export const PlaceholderPage: React.FC = () => {
    const location = useLocation();
    const pageName = location.pathname.split('/')[1] || 'Overview';
    const title = pageName.charAt(0).toUpperCase() + pageName.slice(1);

    return (
        <Box sx={{ p: 3 }}>
            <Paper sx={{ p: 4, textAlign: 'center' }}>
                <Typography variant="h4" gutterBottom>
                    {title}
                </Typography>
                <Typography variant="body1" color="text.secondary">
                    This page is currently under construction as part of the migration.
                </Typography>
            </Paper>
        </Box>
    );
};
