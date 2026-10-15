CREATE INDEX IF NOT EXISTS idx_catalog_datasets_cursor ON datasets(created_at DESC,id DESC);
CREATE INDEX IF NOT EXISTS idx_catalog_experiment_runs_cursor ON experiment_runs(created_at DESC,id DESC);
CREATE INDEX IF NOT EXISTS idx_catalog_experiments_cursor ON experiments(created_at DESC,id DESC);
CREATE INDEX IF NOT EXISTS idx_catalog_models_cursor ON models(created_at DESC,id DESC);
