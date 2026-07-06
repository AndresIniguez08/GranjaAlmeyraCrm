ALTER TABLE commercial_contacts
ADD COLUMN IF NOT EXISTS provincia text,
ADD COLUMN IF NOT EXISTS localidad text,
ADD COLUMN IF NOT EXISTS mapa_coords jsonb;
