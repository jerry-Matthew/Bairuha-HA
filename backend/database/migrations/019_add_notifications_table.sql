-- Notifications Table
-- Stores system notifications (alerts, warnings, informational messages) for users

-- Notifications table: stores notification records
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE, -- NULL = broadcast notification
  type TEXT NOT NULL CHECK (type IN ('info', 'success', 'warning', 'error')),
  title TEXT NOT NULL,
  message TEXT,
  action_url TEXT, -- Optional: URL to navigate when notification is clicked
  action_label TEXT, -- Optional: Label for action button
  read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  read_at TIMESTAMPTZ, -- Timestamp when notification was marked as read
  metadata JSONB, -- Optional: Additional data (entity_id, device_id, etc.)
  CONSTRAINT valid_notification_type CHECK (type IN ('info', 'success', 'warning', 'error'))
);

-- Indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_user_read ON notifications(user_id, read);
CREATE INDEX IF NOT EXISTS idx_notifications_type ON notifications(type);
