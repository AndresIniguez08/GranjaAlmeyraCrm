ALTER TABLE client_delivery_zones
ADD COLUMN IF NOT EXISTS radius integer DEFAULT 8000;
