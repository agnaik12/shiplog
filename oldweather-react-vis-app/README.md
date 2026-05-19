# Old Weather React + vis-network Knowledge Graph

Starter React app for visualizing Old Weather data as an interactive knowledge graph.

## Features

- Decade nodes
- Observation variable nodes
- Ship/station nodes
- Weighted edges based on observation counts
- Search
- Filters by decade and variable
- Minimum edge-count filter
- Node detail side panel
- Physics toggle

## Run the app

```bash
cd oldweather-react-vis-app
npm install
npm run dev
```

Open the local URL printed by Vite.

## Generate graph data from your private Parquet file

Install Python dependencies:

```bash
pip install duckdb pandas
```

Run:

```bash
python scripts/build_graph_json.py \
  --input oldweather_cleaned_dedup.parquet \
  --output public/graph_data.json
```

Optional smaller graph:

```bash
python scripts/build_graph_json.py \
  --input oldweather_cleaned_dedup.parquet \
  --output public/graph_data.json \
  --top-ships 40 \
  --min-edge-count 100
```

Refresh the React app after generating `public/graph_data.json`.

## Embed in a Python web app

Build the React app:

```bash
npm run build
```

This creates a `dist/` folder. You can serve that folder from Flask, FastAPI, or Django, or embed it in a tab via an iframe.
