-- Enable pg_trgm extension for fuzzy search
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- GIN index on exercise name for fast trigram lookups
CREATE INDEX exercises_name_trgm_idx ON exercises USING GIN (name gin_trgm_ops);
