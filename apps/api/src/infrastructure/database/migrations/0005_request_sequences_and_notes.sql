-- ============================================================================
-- Migracion 0005: numeracion transaccional de solicitudes y notas
-- Idempotente: migrate.ts reaplica todos los archivos .sql en cada arranque.
-- ============================================================================

ALTER TABLE payment_requests ADD COLUMN IF NOT EXISTS notes TEXT DEFAULT '';

CREATE TABLE IF NOT EXISTS request_sequences (
  year INTEGER PRIMARY KEY,
  last_number BIGINT NOT NULL DEFAULT 0
);

CREATE OR REPLACE FUNCTION next_request_number(p_year INTEGER)
RETURNS BIGINT AS $$
DECLARE
  v_next BIGINT;
  v_max_existing BIGINT;
BEGIN
  SELECT COALESCE(MAX(SUBSTRING(request_code FROM 10)::BIGINT), 0)
  INTO v_max_existing
  FROM payment_requests
  WHERE request_code ~ ('^SOL-' || p_year || '-[0-9]+$');

  INSERT INTO request_sequences (year, last_number)
  VALUES (p_year, GREATEST(1, v_max_existing + 1))
  ON CONFLICT (year) DO UPDATE
    SET last_number = GREATEST(request_sequences.last_number + 1, v_max_existing + 1)
  RETURNING last_number INTO v_next;

  RETURN v_next;
END;
$$ LANGUAGE plpgsql;

INSERT INTO request_sequences (year, last_number)
SELECT
  SUBSTRING(request_code FROM 5 FOR 4)::INTEGER AS year,
  MAX(SUBSTRING(request_code FROM 10)::BIGINT) AS last_number
FROM payment_requests
WHERE request_code ~ '^SOL-[0-9]{4}-[0-9]+$'
GROUP BY 1
ON CONFLICT (year) DO UPDATE
SET last_number = GREATEST(request_sequences.last_number, EXCLUDED.last_number);

COMMENT ON TABLE request_sequences IS 'Contador transaccional de numeracion correlativa de solicitudes de pago.';
