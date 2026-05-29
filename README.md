# Shiplog Knowledge Graph

Interactive knowledge graph for exploring historical ship log data from the Old Weather dataset. The application visualizes relationships between ships, variables, and time periods using a force-directed network graph.

## Overview

This project converts cleaned Old Weather ship log data into a browser-based network visualization. It helps users explore which ships recorded which weather and navigation variables across different years or decades.

The graph is designed to support quick visual exploration of large historical logbook metadata by showing ships, variables, and temporal connections in one interactive view.

## Features

- Interactive ship-log knowledge graph
- Force-directed network layout using `vis-network`
- Physics toggle for automatic graph rearrangement
- Ship, variable, and decade-based filtering
- Node highlighting for selected ships, variables, and years
- Edge strength legend for relationship frequency
- Draggable graph legend with show/hide control
- Light and dark theme support
- Search and reset controls
- Responsive React interface built with Vite

## Current Graph Behavior

The graph contains three major node types:

- **Ships**: Individual vessels from the Old Weather data
- **Variables**: Recorded measurements or logbook fields
- **Time periods**: Years or decades associated with ship observations

Typical interactions include:

- Selecting a ship highlights the variables and time periods connected to that ship.
- Selecting a variable highlights ships and time periods connected to that variable.
- Selecting a decade highlights variables and ships associated with that decade.
- Edge thickness represents the strength or frequency of the relationship.

## Tech Stack

- React
- Vite
- JavaScript / JSX
- vis-network
- lucide-react
- Python data preprocessing
- Parquet input data
- JSON graph output

## Repository Structure

```text
shiplog/
├── data/
│   └── oldweather_cleaned_dedup.parquet
├── oldweather-react-vis-app/
│   ├── public/
│   │   └── graph_data.json
│   ├── scripts/
│   │   └── build_graph_json.py
│   ├── src/
│   │   ├── App.jsx
│   │   └── main.jsx
│   ├── index.html
│   ├── package.json
│   └── README.md
└── README.md
```

The exact structure may vary depending on where the app and data are stored locally.

## Getting Started

### 1. Clone the repository

```bash
git clone https://github.com/agnaik12/shiplog.git
cd shiplog
```

### 2. Go to the React app directory

```bash
cd oldweather-react-vis-app
```

### 3. Install dependencies

```bash
npm install
```

### 4. Generate the graph data

If `public/graph_data.json` is not already available, generate it from the cleaned Parquet file:

```bash
python scripts/build_graph_json.py \
  --input ../data/oldweather_cleaned_dedup.parquet \
  --output public/graph_data.json
```

If the Parquet file is inside the app directory, use:

```bash
python scripts/build_graph_json.py \
  --input oldweather_cleaned_dedup.parquet \
  --output public/graph_data.json
```

### 5. Start the development server

```bash
npm run dev -- --host 0.0.0.0
```

For local-only development, this also works:

```bash
npm run dev
```

Vite will print a local URL such as:

```text
http://localhost:5173/
```

## Deployment Notes

The application can be deployed on a workstation or server by running the Vite development server with host access enabled:

```bash
npm run dev -- --host 0.0.0.0
```

For production deployment, build the static files:

```bash
npm run build
```

Then serve the generated `dist/` directory using a static web server such as Nginx, Apache, or a Node-based static server.

## Data Processing

The preprocessing script reads cleaned Old Weather data from a Parquet file and creates a graph JSON file used by the React app.

The generated graph usually includes:

- Nodes for ships
- Nodes for weather/log variables
- Nodes for years or decades
- Edges representing relationships between these entities
- Edge weights based on aggregate counts or connection strength

Because the graph may use aggregation, filtering, or thresholding, displayed node and edge counts may differ from the raw dataset counts.

## Common Issues

### `vite` is not recognized

Run dependency installation inside the app directory:

```bash
cd oldweather-react-vis-app
npm install
npm run dev
```

### Repository not found while cloning

This usually means one of the following:

- The repository is private.
- The current GitHub account does not have access.
- The remote URL is incorrect.
- Git credentials are cached for a different GitHub account.

Check access in the browser and confirm that the account has permission to the private repository.

### Graph does not show expected nodes or edges

Check that `public/graph_data.json` exists and was generated from the correct Parquet file. Also verify whether filters, thresholds, or edge-strength ranges are hiding parts of the graph.

##  Summary

The Shiplog Knowledge Graph provides an interactive way to explore historical ship log metadata. It connects ships, variables, and time periods into a single network view, allowing users to see which vessels recorded which types of observations and how those observations vary over time.

The current application focuses on visual exploration, filtering, and relationship discovery. The force-directed physics layout helps reveal clusters and connections, while manual controls and legends make the graph easier to interpret during demonstrations.


## Maintained By

Ashwini Naik  
Research Computing Center, University of Chicago
