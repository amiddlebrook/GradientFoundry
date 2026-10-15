-- Dataset edits must create a new dataset ID: existing experiment history is immutable.
CREATE TRIGGER IF NOT EXISTS immutable_dataset_records BEFORE UPDATE OF records ON datasets BEGIN
 SELECT RAISE(ABORT,'dataset records are immutable; import a new dataset');
END;
CREATE TABLE IF NOT EXISTS run_lineage(
 run_id TEXT PRIMARY KEY REFERENCES experiment_runs(id),
 dataset_sha256 TEXT NOT NULL CHECK(length(dataset_sha256)=64),
 metrics_sha256 TEXT NOT NULL CHECK(length(metrics_sha256)=64),
 source TEXT NOT NULL CHECK(source IN('user-reported')),
 created_at TEXT NOT NULL
);
CREATE TRIGGER IF NOT EXISTS immutable_run_lineage BEFORE UPDATE ON run_lineage BEGIN
 SELECT RAISE(ABORT,'run lineage is immutable');
END;
CREATE TRIGGER IF NOT EXISTS immutable_run_metrics BEFORE UPDATE ON experiment_runs BEGIN
 SELECT RAISE(ABORT,'training run metrics are immutable');
END;
