CREATE TABLE IF NOT EXISTS dataset_profiling(id TEXT PRIMARY KEY,dataset_id TEXT NOT NULL REFERENCES datasets(id),fingerprint TEXT NOT NULL,sample_count INTEGER NOT NULL,distinct_count INTEGER NOT NULL,duplicate_count INTEGER NOT NULL,label_distribution TEXT NOT NULL,warnings TEXT NOT NULL,created_at TEXT NOT NULL);
CREATE INDEX IF NOT EXISTS idx_profile_dataset ON dataset_profiling(dataset_id,created_at DESC);
CREATE TABLE IF NOT EXISTS model_promotions(id TEXT PRIMARY KEY,model_id TEXT NOT NULL REFERENCES models(id),from_stage TEXT NOT NULL,to_stage TEXT NOT NULL,reason TEXT NOT NULL,accuracy REAL NOT NULL,created_at TEXT NOT NULL);
CREATE INDEX IF NOT EXISTS idx_promotion_model ON model_promotions(model_id,created_at DESC);
