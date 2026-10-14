export default {
  "name": "GradientFoundry",
  "tagline": "Reproducible ML experiment registry",
  "accent": "#b99bf0",
  "icon": "✺",
  "sections": [
    {
      "id": "datasets",
      "label": "Datasets",
      "endpoint": "/api/datasets",
      "fields": [
        {
          "name": "name",
          "type": "text",
          "default": "Text classification sample"
        },
        {
          "name": "description",
          "type": "textarea"
        },
        {
          "name": "records",
          "type": "json",
          "default": [
            {
              "text": "please refund purchase",
              "label": "refund"
            },
            {
              "text": "money back please",
              "label": "refund"
            },
            {
              "text": "return my item",
              "label": "refund"
            },
            {
              "text": "send receipt",
              "label": "billing"
            },
            {
              "text": "invoice question",
              "label": "billing"
            },
            {
              "text": "billing issue",
              "label": "billing"
            }
          ]
        }
      ],
      "columns": [
        "name",
        "description",
        "record_count",
        "created_at"
      ]
    },
    {
      "id": "experiments",
      "label": "Experiments",
      "endpoint": "/api/experiments",
      "fields": [
        {
          "name": "dataset_id",
          "type": "reference",
          "source": "/api/datasets"
        },
        {
          "name": "name",
          "type": "text",
          "default": "Softmax baseline"
        },
        {
          "name": "algorithm",
          "type": "select",
          "options": [
            "hashed_softmax_sgd"
          ]
        },
        {
          "name": "hyperparameters",
          "type": "json",
          "default": {
            "epochs": 40,
            "learning_rate": 0.15,
            "buckets": 128
          }
        }
      ],
      "columns": [
        "name",
        "dataset",
        "algorithm",
        "status"
      ],
      "action": {
        "title": "Export experiment JSON",
        "method": "GET",
        "endpoint": "/api/experiments/{id}/export",
        "input": [],
        "download": true
      }
    },
    {
      "id": "runs",
      "label": "Training Runs",
      "endpoint": "/api/runs",
      "columns": [
        "experiment",
        "seed",
        "accuracy",
        "precision_score",
        "recall_score",
        "created_at"
      ]
    },
    {
      "id": "record",
      "label": "Import Results",
      "custom": "record"
    },
    {
      "id": "models",
      "label": "Model Registry",
      "endpoint": "/api/models",
      "fields": [
        {
          "name": "experiment_run_id",
          "type": "reference",
          "source": "/api/runs"
        },
        {
          "name": "name",
          "type": "text",
          "default": "Version 1"
        },
        {
          "name": "stage",
          "type": "select",
          "options": [
            "candidate"
          ]
        }
      ],
      "columns": [
        "name",
        "experiment",
        "accuracy",
        "stage"
      ],
      "action": {
        "title": "Promote model",
        "endpoint": "/api/models/{id}/promote",
        "input": [
          {
            "name": "stage",
            "type": "select",
            "options": [
              "staging",
              "production",
              "archived"
            ]
          },
          {
            "name": "reason",
            "type": "textarea",
            "default": "Reviewed measured holdout metrics and approved transition."
          }
        ]
      }
    },
    {
      "id": "dataset-profiles",
      "label": "Dataset Quality",
      "endpoint": "/api/dataset-profiles",
      "columns": [
        "dataset",
        "sample_count",
        "distinct_count",
        "duplicate_count",
        "warnings",
        "created_at"
      ]
    },
    {
      "id": "promotion-audit",
      "label": "Model Governance",
      "endpoint": "/api/promotions",
      "columns": [
        "model",
        "from_stage",
        "to_stage",
        "accuracy",
        "reason",
        "created_at"
      ]
    },
    {
      "id": "data-quality-review",
      "label": "Dataset Quality Review",
      "custom": "dataset-quality"
    }
  ]
};
