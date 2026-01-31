

import { BrowserRouter as Router, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { Provider } from 'react-redux';
import { store } from '@/store';
import { AuthProvider } from '@/contexts/auth-context';
import { WebSocketProvider } from '@/contexts/websocket-context';
import { ErrorBoundary } from '@/components/error-boundary';
import { LoginForm } from '@/components/auth/login-form';
import { SignupForm } from '@/components/auth/signup-form';
import { ProtectedRoute } from '@/components/auth/protected-route';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { PlaceholderPage } from '@/pages/placeholder-page';
import { MapPanel } from '@/components/panels/map/map-panel';
import { DevicesPage } from '@/pages/devices-page';
import { DashboardPage } from '@/pages/dashboard-page';
import { OverviewPage } from '@/pages/overview-page';
import { NotificationsPage } from '@/pages/notifications-page';
import { ThemeWrapper } from '@/components/theme-wrapper';
// Lazy load GroupsPanel
import { lazy, Suspense } from 'react';
const GroupsPanel = lazy(() => import('@/components/panels/groups/groups-panel').then(module => ({ default: module.GroupsPanel })));
import { GeneralSettings } from '@/components/panels/settings/general-settings';
import { HacsPanel } from '@/components/hacs/client/HacsPanel.client';
import { ActivityPanel } from '@/components/panels/activity/activity-panel';
import { EwelinkPanel } from '@/components/panels/ewelink/ewelink-panel';
import { MediaPanel } from '@/components/panels/media/media-panel';
import { MyMediaPanel } from '@/components/panels/media/features/my-media-panel';
import { ImageUploadPanel } from '@/components/panels/media/features/image-upload-panel';
import { TerminalPanel } from '@/components/panels/terminal/terminal-panel';
import { DevToolsPanel } from '@/components/panels/dev-tools/dev-tools-panel';
import { ProfilePanel } from '@/components/panels/profile/profile-panel';
import './App.css';

// Simple page wrappers
const LoginPage = () => <LoginForm />;
const SignupPage = () => <SignupForm />;

const AppLayout = () => {
  return (
    <DashboardLayout>
      <Outlet />
    </DashboardLayout>
  );
};

function App() {
  return (
    <Provider store={store}>
      <ErrorBoundary>
        <ThemeWrapper>
          <AuthProvider>
            <WebSocketProvider>
              <Router>
                <Routes>
                  {/* Public Routes */}
                  <Route path="/login" element={<LoginPage />} />
                  <Route path="/signup" element={<SignupPage />} />

                  {/* Protected App Routes */}
                  <Route element={
                    <ProtectedRoute>
                      <AppLayout />
                    </ProtectedRoute>
                  }>
                    <Route path="/overview" element={<OverviewPage />} />
                    <Route path="/ewelink" element={<EwelinkPanel />} />
                    <Route path="/dashboard/:dashboardId" element={<DashboardPage />} />
                    <Route path="/map" element={<MapPanel />} />

                    <Route path="/activity" element={<ActivityPanel />} />
                    <Route path="/devices" element={<DevicesPage />} />

                    <Route path="/settings" element={<GeneralSettings />} />
                    <Route path="/profile" element={<ProfilePanel />} />
                    <Route path="/media" element={<MediaPanel />} />
                    <Route path="/media/library" element={<MyMediaPanel />} />
                    <Route path="/media/upload" element={<ImageUploadPanel />} />
                    <Route path="/media/camera" element={<PlaceholderPage />} />
                    <Route path="/media/radio" element={<PlaceholderPage />} />
                    <Route path="/media/recordings" element={<PlaceholderPage />} />
                    <Route path="/media/tts" element={<PlaceholderPage />} />
                    <Route path="/terminal" element={<TerminalPanel />} />
                    <Route path="/hacs" element={<HacsPanel />} />
                    <Route path="/groups" element={<Suspense fallback={<div>Loading...</div>}><GroupsPanel /></Suspense>} />
                    <Route path="/dev-tools" element={<DevToolsPanel />} />

                    <Route path="/notifications" element={<NotificationsPage />} />
                    <Route path="/" element={<Navigate to="/overview" replace />} />
                  </Route>

                  {/* Catch all */}
                  <Route path="*" element={<Navigate to="/overview" replace />} />
                </Routes>
              </Router>
            </WebSocketProvider>
          </AuthProvider>
        </ThemeWrapper>
      </ErrorBoundary>
    </Provider>
  );
}

export default App;
