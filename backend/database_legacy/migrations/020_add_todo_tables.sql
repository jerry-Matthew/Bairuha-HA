-- Todo Lists Tables
-- Stores todo lists and todo items for users

-- Todo lists table: stores list metadata
CREATE TABLE IF NOT EXISTS todo_lists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  icon TEXT, -- Material Design icon name
  color TEXT, -- Color for UI theming (hex code or color name)
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, name) -- Prevent duplicate list names per user
);

-- Todo items table: stores individual todo items
CREATE TABLE IF NOT EXISTS todo_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  list_id UUID NOT NULL REFERENCES todo_lists(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  completed BOOLEAN DEFAULT false NOT NULL,
  due_date TIMESTAMPTZ,
  priority TEXT CHECK (priority IN ('low', 'medium', 'high')), -- Priority level
  "order" INTEGER DEFAULT 0 NOT NULL, -- For manual sorting
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ -- Timestamp when item was completed
);

-- Indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_todo_lists_user_id ON todo_lists(user_id);
CREATE INDEX IF NOT EXISTS idx_todo_lists_name ON todo_lists(name);
CREATE INDEX IF NOT EXISTS idx_todo_items_list_id ON todo_items(list_id);
CREATE INDEX IF NOT EXISTS idx_todo_items_completed ON todo_items(completed);
CREATE INDEX IF NOT EXISTS idx_todo_items_due_date ON todo_items(due_date);
CREATE INDEX IF NOT EXISTS idx_todo_items_order ON todo_items(list_id, "order");

-- Trigger functions to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_todo_list_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE OR REPLACE FUNCTION update_todo_item_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    -- Auto-set completed_at when completed is set to true
    IF NEW.completed = true AND OLD.completed = false THEN
        NEW.completed_at = now();
    ELSIF NEW.completed = false AND OLD.completed = true THEN
        NEW.completed_at = NULL;
    END IF;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers
CREATE TRIGGER update_todo_lists_updated_at BEFORE UPDATE ON todo_lists
    FOR EACH ROW EXECUTE FUNCTION update_todo_list_updated_at();

CREATE TRIGGER update_todo_items_updated_at BEFORE UPDATE ON todo_items
    FOR EACH ROW EXECUTE FUNCTION update_todo_item_updated_at();
