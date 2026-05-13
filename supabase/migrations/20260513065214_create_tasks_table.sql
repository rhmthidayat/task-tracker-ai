/*
  # Create tasks table

  1. New Tables
    - `tasks`
      - `id` (uuid, primary key)
      - `user_session` (text, for anonymous session-based access)
      - `title` (text, task title)
      - `completed` (boolean, completion status)
      - `created_at` (timestamptz, creation timestamp)

  2. Security
    - Enable RLS on `tasks` table
    - Add policies for session-based access (anonymous users via session token)

  3. Notes
    - Uses session-based access pattern since no auth is required
    - Tasks are scoped to a session ID stored in localStorage
*/

CREATE TABLE IF NOT EXISTS tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_session text NOT NULL,
  title text NOT NULL,
  completed boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Session users can select own tasks"
  ON tasks FOR SELECT
  TO anon
  USING (user_session = current_setting('request.headers', true)::json->>'x-session-id');

CREATE POLICY "Session users can insert own tasks"
  ON tasks FOR INSERT
  TO anon
  WITH CHECK (user_session = current_setting('request.headers', true)::json->>'x-session-id');

CREATE POLICY "Session users can update own tasks"
  ON tasks FOR UPDATE
  TO anon
  USING (user_session = current_setting('request.headers', true)::json->>'x-session-id')
  WITH CHECK (user_session = current_setting('request.headers', true)::json->>'x-session-id');

CREATE POLICY "Session users can delete own tasks"
  ON tasks FOR DELETE
  TO anon
  USING (user_session = current_setting('request.headers', true)::json->>'x-session-id');

CREATE INDEX IF NOT EXISTS tasks_user_session_idx ON tasks (user_session);
CREATE INDEX IF NOT EXISTS tasks_created_at_idx ON tasks (created_at DESC);
