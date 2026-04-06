-- Auto-create the E2E test database alongside the dev database.
-- This runs once when the Postgres container is first initialized.
SELECT 'CREATE DATABASE workout_app_test OWNER workout'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'workout_app_test')\gexec
