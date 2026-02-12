-- Add department column to positions table for grouping/filtering
ALTER TABLE positions ADD COLUMN IF NOT EXISTS department VARCHAR(255);

-- Create index for efficient department-based queries
CREATE INDEX IF NOT EXISTS idx_positions_department ON positions(department);
