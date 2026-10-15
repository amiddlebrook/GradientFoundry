export default {
  "title": "RESEARCH LINEAGE",
  "headline": "A transparent path to release.",
  "tag": "Datasets, experiments, measured runs, and registered models.",
  "layout": "lineage",
  "layers": [
    [
      "datasets",
      "datasets",
      "Datasets"
    ],
    [
      "experiments",
      "experiments",
      "Experiments"
    ],
    [
      "runs",
      "runs",
      "Training runs"
    ],
    [
      "models",
      "models",
      "Models"
    ]
  ],
  "links": [
    [
      "experiments",
      "datasets",
      [
        "dataset_id",
        "dataset"
      ],
      [
        "id",
        "name"
      ]
    ],
    [
      "runs",
      "experiments",
      [
        "experiment_id",
        "experiment"
      ],
      [
        "id",
        "name"
      ]
    ],
    [
      "models",
      "runs",
      [
        "experiment_run_id",
        "run_id"
      ],
      [
        "id"
      ]
    ],
    [
      "models",
      "experiments",
      [
        "experiment_id",
        "experiment"
      ],
      [
        "id",
        "name"
      ]
    ]
  ]
};
