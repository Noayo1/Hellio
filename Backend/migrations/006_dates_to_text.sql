-- Change date columns from DATE to TEXT to support year-only formats (e.g., "2021" instead of "2021-01-01")

ALTER TABLE experiences ALTER COLUMN start_date TYPE TEXT USING TO_CHAR(start_date, 'YYYY-MM');
ALTER TABLE experiences ALTER COLUMN end_date TYPE TEXT USING CASE WHEN end_date IS NULL THEN NULL ELSE TO_CHAR(end_date, 'YYYY-MM') END;

ALTER TABLE education ALTER COLUMN start_date TYPE TEXT USING TO_CHAR(start_date, 'YYYY-MM');
ALTER TABLE education ALTER COLUMN end_date TYPE TEXT USING CASE WHEN end_date IS NULL THEN NULL ELSE TO_CHAR(end_date, 'YYYY-MM') END;
