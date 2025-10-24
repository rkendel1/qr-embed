-- Add a permissions column to the roles table to store an array of permission strings
ALTER TABLE roles
ADD COLUMN permissions TEXT[];