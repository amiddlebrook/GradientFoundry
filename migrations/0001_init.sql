CREATE TABLE IF NOT EXISTS datasets (id TEXT PRIMARY KEY,name TEXT NOT NULL,description TEXT NOT NULL,records TEXT NOT NULL,created_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS experiments (id TEXT PRIMARY KEY,dataset_id TEXT NOT NULL REFERENCES datasets(id),name TEXT NOT NULL,algorithm TEXT NOT NULL,hyperparameters TEXT NOT NULL,status TEXT NOT NULL,created_at TEXT NOT NULL,updated_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS experiment_runs (id TEXT PRIMARY KEY,experiment_id TEXT NOT NULL REFERENCES experiments(id),seed INTEGER NOT NULL,accuracy REAL NOT NULL,precision_score REAL NOT NULL,recall_score REAL NOT NULL,history TEXT NOT NULL,weights TEXT NOT NULL,notes TEXT NOT NULL,created_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS models(id TEXT PRIMARY KEY,experiment_run_id TEXT NOT NULL REFERENCES experiment_runs(id),name TEXT NOT NULL,stage TEXT NOT NULL,created_at TEXT NOT NULL);
CREATE INDEX IF NOT EXISTS idx_experiment_runs ON experiment_runs(experiment_id,created_at);
