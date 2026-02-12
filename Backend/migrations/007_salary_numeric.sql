-- Add numeric salary columns for proper comparisons
ALTER TABLE positions ADD COLUMN IF NOT EXISTS salary_min INTEGER;
ALTER TABLE positions ADD COLUMN IF NOT EXISTS salary_max INTEGER;

-- Create index for salary queries
CREATE INDEX IF NOT EXISTS idx_positions_salary ON positions (salary_min, salary_max);
