CREATE TABLE IF NOT EXISTS experiment_reviews(id TEXT PRIMARY KEY,baseline_id TEXT NOT NULL REFERENCES experiment_runs(id),challenger_id TEXT NOT NULL REFERENCES experiment_runs(id),rationale TEXT NOT NULL,deltas TEXT NOT NULL,created_at TEXT NOT NULL,dataset_id TEXT NOT NULL REFERENCES datasets(id));
CREATE INDEX IF NOT EXISTS idx_review_created ON experiment_reviews(created_at DESC);
