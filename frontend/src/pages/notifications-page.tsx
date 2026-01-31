import React from 'react';
import { Box } from '@mui/material';
import { NotificationsPanel } from '@/components/panels/notifications/notifications-panel';
import { useAuth } from '@/contexts/auth-context';

/**
 * Notifications Page
 * Displays the notifications panel for the authenticated user
 */
export const NotificationsPage: React.FC = () => {
    const { user } = useAuth();

    if (!user) {
        return null;
    }

    return (
        <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            <NotificationsPanel userId={user.id} />
        </Box>
    );
};
