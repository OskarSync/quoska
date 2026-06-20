-- Migration: 007_public_holidays
-- Pre-computed public holidays per Bundesland.
-- Seeded by scripts/seed-holidays.ts using Gauss Easter algorithm.
-- bundesland='all' means nationwide (applies to all states).

CREATE TABLE public_holidays (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date DATE NOT NULL,
  name TEXT NOT NULL,
  bundesland TEXT NOT NULL,
  source TEXT NOT NULL DEFAULT 'Feiertagsgesetz',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Primary lookup: is this date a holiday for this bundesland?
CREATE INDEX idx_holidays_date_bundesland
  ON public_holidays (date, bundesland);

-- Find all holidays in a year (for seed validation)
CREATE INDEX idx_holidays_year
  ON public_holidays (date);

COMMENT ON TABLE public_holidays IS 'Public holidays per Bundesland. bundesland=''all'' = nationwide. Seeded annually.';
COMMENT ON COLUMN public_holidays.bundesland IS 'Bundesland name or ''all'' for nationwide holidays.';
