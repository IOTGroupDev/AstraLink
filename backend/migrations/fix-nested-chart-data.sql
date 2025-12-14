-- Migration to fix deeply nested chart data
-- Unwraps data.data.data... structure to proper single-level data

DO $$
DECLARE
  chart_record RECORD;
  unwrapped_data jsonb;
  current_data jsonb;
  depth integer;
  max_depth integer := 20;
BEGIN
  -- Iterate through all charts
  FOR chart_record IN SELECT id, data FROM charts LOOP
    current_data := chart_record.data;
    depth := 0;

    -- Unwrap nested data levels until we find planets or reach max depth
    WHILE
      current_data ? 'data' AND
      NOT (current_data ? 'planets') AND
      depth < max_depth
    LOOP
      current_data := current_data -> 'data';
      depth := depth + 1;
    END LOOP;

    -- Only update if we found nested data (depth > 0)
    IF depth > 0 THEN
      RAISE NOTICE 'Unwrapping chart % from depth %', chart_record.id, depth;

      UPDATE charts
      SET
        data = current_data,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = chart_record.id;
    END IF;
  END LOOP;

  RAISE NOTICE 'Chart data unwrapping completed';
END $$;
