-- Scienpay Database Migration 0004
-- Fase 4.6: numeración transaccional de solicitudes de pago (SOL-YYYY-NNN) y persistencia de notas.
-- Referencias: HANDOFF 4.6.1, 4.6.2, ADR-003.

-- =========================================================================
-- 1. Secuencia transaccional de solicitudes de pago (SOL-YYYY-NNN)
-- =========================================================================
CREATE TABLE IF NOT EXISTS request_sequences (
  year INTEGER PRIMARY KEY,
  last_number BIGINT NOT NULL DEFAULT 0
);

CREATE OR REPLACE FUNCTION next_request_number(p_year INTEGER)
RETURNS BIGINT AS $$
DECLARE
  v_next BIGINT;
BEGIN
  INSERT INTO request_sequences (year, last_number)
  VALUES (p_year, 1)
  ON CONFLICT (year) DO UPDATE
    SET last_number = request_sequences.last_number + 1
  RETURNING last_number INTO v_next;

  RETURN v_next;
END;
$$ LANGUAGE plpgsql;

-- Sembrar el contador desde las solicitudes existentes con formato SOL-YYYY-NNN.
INSERT INTO request_sequences (year, last_number)
SELECT
  SUBSTRING(request_code FROM 5 FOR 4)::INTEGER AS year,
  MAX(SUBSTRING(request_code FROM 10)::BIGINT) AS last_number
FROM payment_requests
WHERE request_code ~ '^SOL-[0-9]{4}-[0-9]+$'
GROUP BY 1
ON CONFLICT (year) DO UPDATE
SET last_number = GREATEST(request_sequences.last_number, EXCLUDED.last_number);

COMMENT ON TABLE request_sequences IS 'Contador transaccional de numeracion correlativa de solicitudes de pago (SOL-YYYY-NNN).';

-- =========================================================================
-- 2. Persistencia de campo notes en payment_requests
-- =========================================================================
ALTER TABLE payment_requests
  ADD COLUMN IF NOT EXISTS notes TEXT;
