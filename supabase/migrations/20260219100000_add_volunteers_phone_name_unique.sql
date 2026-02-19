-- Deduplicate volunteers with same (phone, name), keeping the earliest record.
-- Reassign related records before deleting duplicates.

-- Step 1: Trim whitespace from names for consistency
UPDATE volunteers SET name = trim(name) WHERE name != trim(name);

-- Step 2: For each duplicate group, keep the earliest row (lowest created_at).
-- Move availability records from duplicate to kept volunteer (skip conflicts).
WITH keep AS (
  SELECT DISTINCT ON (phone, name) id, phone, name
  FROM volunteers
  ORDER BY phone, name, created_at ASC
),
dupes AS (
  SELECT v.id AS dupe_id, k.id AS keep_id
  FROM volunteers v
  JOIN keep k ON k.phone = v.phone AND k.name = v.name AND k.id != v.id
)
INSERT INTO volunteer_availability (volunteer_id, drive_id, source)
SELECT d.keep_id, va.drive_id, va.source
FROM dupes d
JOIN volunteer_availability va ON va.volunteer_id = d.dupe_id
ON CONFLICT (volunteer_id, drive_id) DO NOTHING;

-- Step 3: Delete duplicate volunteer rows (cascade removes their availability/assignments)
WITH keep AS (
  SELECT DISTINCT ON (phone, name) id
  FROM volunteers
  ORDER BY phone, name, created_at ASC
)
DELETE FROM volunteers
WHERE id NOT IN (SELECT id FROM keep);

-- Step 4: Add unique constraint on (phone, name)
CREATE UNIQUE INDEX volunteers_phone_name_unique ON volunteers (phone, name);
