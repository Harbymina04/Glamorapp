-- Add code column to departments and cities (schema was ahead of DB)

ALTER TABLE departments
  ADD COLUMN IF NOT EXISTS code VARCHAR(20);

-- Backfill with auto-generated codes from name
UPDATE departments SET code = LOWER(REGEXP_REPLACE(name, '[^a-zA-Z0-9]', '-', 'g')) WHERE code IS NULL;

-- Now make it not null with unique constraint
ALTER TABLE departments ALTER COLUMN code SET NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS departments_country_id_code_key ON departments(country_id, code);

-- Cities
ALTER TABLE cities
  ADD COLUMN IF NOT EXISTS code VARCHAR(20);

UPDATE cities SET code = LOWER(REGEXP_REPLACE(LEFT(name, 20), '[^a-zA-Z0-9]', '-', 'g')) WHERE code IS NULL;

ALTER TABLE cities ALTER COLUMN code SET NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS cities_department_id_code_key ON cities(department_id, code);
