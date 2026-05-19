"""
Build public/graph_data.json from the Old Weather Parquet file using DuckDB.

Usage:
    pip install duckdb pandas

    python scripts/build_graph_json.py \
        --input ../oldweather_cleaned_dedup.parquet \
        --output public/graph_data.json

This exports aggregate counts only, not raw rows.

Graph structure exported:
    nodes:
        decade nodes
        variable nodes
        ship/station nodes

    edges:
        decade -> variable
        variable -> ship/station

    triples:
        exact decade + variable + ship/station combinations
"""

import argparse
import json
import math
from pathlib import Path

import duckdb


VARIABLES = [
    ("temp_dry", "#E24B4A"),
    ("temp_wet", "#F97316"),
    ("temp_water", "#185FA5"),
    ("baro", "#534AB7"),
    ("wind_kts", "#1D9E75"),
    ("weather", "#0F6E56"),
    ("clouds", "#888780"),
    ("ice_1", "#85B7EB"),
    ("ice_2", "#85B7EB"),
    ("ice_log", "#85B7EB"),
    ("people", "#D85A30"),
    ("flora_fauna", "#639922"),
    ("animals", "#639922"),
]

# Add known non-ship stations here.
# This will appear in graph_data.json as node.subtype = "station".
STATION_NAMES = {
    "Adak",
}


def safe_id(value):
    return (
        str(value)
        .strip()
        .replace(" ", "_")
        .replace("/", "_")
        .replace("\\", "_")
        .replace(":", "_")
        .replace("'", "")
        .replace('"', "")
    )


def scaled_size(count, min_count, max_count, min_size=10, max_size=36):
    if max_count <= min_count:
        return (min_size + max_size) / 2

    return min_size + (math.sqrt(count) - math.sqrt(min_count)) / (
        math.sqrt(max_count) - math.sqrt(min_count)
    ) * (max_size - min_size)


def scaled_width(count, min_count, max_count, min_width=0.3, max_width=3.5):
    if max_count <= min_count:
        return (min_width + max_width) / 2

    return min_width + (math.log1p(count) - math.log1p(min_count)) / (
        math.log1p(max_count) - math.log1p(min_count)
    ) * (max_width - min_width)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--input", required=True, help="Input Parquet file")
    parser.add_argument(
        "--output",
        default="public/graph_data.json",
        help="Output JSON file",
    )
    parser.add_argument(
        "--min-edge-count",
        type=int,
        default=1,
        help="Drop aggregate edges below this count",
    )
    parser.add_argument(
        "--top-ships",
        type=int,
        default=60,
        help="Limit to top N ships/stations by observations",
    )

    args = parser.parse_args()

    input_path = args.input
    output_path = Path(args.output)
    output_path.parent.mkdir(parents=True, exist_ok=True)

    con = duckdb.connect()

    total_rows = con.sql(f"""
        SELECT COUNT(*) AS total_rows
        FROM read_parquet('{input_path}')
    """).fetchone()[0]

    valid_rows = con.sql(f"""
        SELECT COUNT(*) AS valid_rows
        FROM read_parquet('{input_path}')
        WHERE datetime IS NOT NULL
          AND ship IS NOT NULL
    """).fetchone()[0]

    top_ships_df = con.sql(f"""
        SELECT ship, COUNT(*) AS n_obs
        FROM read_parquet('{input_path}')
        WHERE datetime IS NOT NULL
          AND ship IS NOT NULL
        GROUP BY ship
        ORDER BY n_obs DESC
        LIMIT {args.top_ships}
    """).df()

    if top_ships_df.empty:
        raise ValueError(
            "No valid ships/stations found. Check datetime and ship columns."
        )

    top_ships = top_ships_df["ship"].tolist()
    top_ship_values = ", ".join(
        "'" + str(ship).replace("'", "''") + "'" for ship in top_ships
    )

    variable_union = "\nUNION ALL\n".join(
        [
            f"""
            SELECT
                decade,
                ship,
                '{variable}' AS variable
            FROM base
            WHERE {variable} IS NOT NULL
            """
            for variable, _color in VARIABLES
        ]
    )

    graph_summary = con.sql(f"""
        WITH base AS (
            SELECT
                CAST(FLOOR(EXTRACT(year FROM datetime) / 10) * 10 AS INTEGER) AS decade,
                ship,
                {", ".join(variable for variable, _ in VARIABLES)}
            FROM read_parquet('{input_path}')
            WHERE datetime IS NOT NULL
              AND ship IS NOT NULL
              AND ship IN ({top_ship_values})
        ),
        long_vars AS (
            {variable_union}
        )
        SELECT
            decade,
            ship,
            variable,
            COUNT(*) AS n_obs
        FROM long_vars
        WHERE decade IS NOT NULL
          AND ship IS NOT NULL
          AND variable IS NOT NULL
        GROUP BY decade, ship, variable
        HAVING COUNT(*) >= {args.min_edge_count}
        ORDER BY decade, variable, n_obs DESC
    """).df()

    graph_summary = graph_summary.dropna(subset=["decade", "ship", "variable"])

    decade_counts = con.sql(f"""
        SELECT
            CAST(FLOOR(EXTRACT(year FROM datetime) / 10) * 10 AS INTEGER) AS decade,
            COUNT(*) AS n_obs
        FROM read_parquet('{input_path}')
        WHERE datetime IS NOT NULL
        GROUP BY decade
        ORDER BY decade
    """).df()

    decade_counts = decade_counts.dropna(subset=["decade"])

    variable_counts = graph_summary.groupby("variable", as_index=False)["n_obs"].sum()
    ship_counts = top_ships_df.rename(columns={"n_obs": "count"})

    nodes = []
    edges = []
    triples = []

    # ---------------------------------------------------------------------
    # Exact triples: decade + variable + ship/station
    # ---------------------------------------------------------------------
    for _, row in graph_summary.iterrows():
        decade = int(row["decade"])
        variable = str(row["variable"])
        ship = str(row["ship"])
        count = int(row["n_obs"])

        triples.append(
            {
                "decade": f"{decade}s",
                "decadeId": f"decade_{decade}",
                "variable": variable,
                "variableId": f"var_{safe_id(variable)}",
                "ship": ship,
                "shipId": f"ship_{safe_id(ship)}",
                "count": count,
            }
        )

    # ---------------------------------------------------------------------
    # Decade nodes
    # ---------------------------------------------------------------------
    min_c = int(decade_counts["n_obs"].min()) if len(decade_counts) else 1
    max_c = int(decade_counts["n_obs"].max()) if len(decade_counts) else 1

    for _, row in decade_counts.iterrows():
        decade = int(row["decade"])
        count = int(row["n_obs"])

        nodes.append(
            {
                "id": f"decade_{decade}",
                "label": f"{decade}s",
                "group": "decade",
                "shape": "box",
                "color": "#4A7BB7",
                "font": {"color": "#ffffff"},
                "size": scaled_size(count, min_c, max_c, 10, 28),
                "count": count,
                "title": f"{decade}s — {count:,} observations",
            }
        )

    # ---------------------------------------------------------------------
    # Variable nodes
    # ---------------------------------------------------------------------
    var_color = dict(VARIABLES)

    min_c = int(variable_counts["n_obs"].min()) if len(variable_counts) else 1
    max_c = int(variable_counts["n_obs"].max()) if len(variable_counts) else 1

    for _, row in variable_counts.iterrows():
        variable = str(row["variable"])
        count = int(row["n_obs"])

        nodes.append(
            {
                "id": f"var_{safe_id(variable)}",
                "label": variable,
                "group": "variable",
                "shape": "diamond",
                "color": var_color.get(variable, "#E24B4A"),
                "font": {"color": "#ffffff"},
                "size": scaled_size(count, min_c, max_c, 12, 34),
                "count": count,
                "title": f"{variable} — {count:,} observations",
            }
        )

    # ---------------------------------------------------------------------
    # Ship/station nodes
    # ---------------------------------------------------------------------
    min_c = int(ship_counts["count"].min()) if len(ship_counts) else 1
    max_c = int(ship_counts["count"].max()) if len(ship_counts) else 1

    for _, row in ship_counts.iterrows():
        ship = str(row["ship"])
        count = int(row["count"])
        subtype = "station" if ship in STATION_NAMES else "ship"

        nodes.append(
            {
                "id": f"ship_{safe_id(ship)}",
                "label": ship,
                "group": "ship",
                "subtype": subtype,
                "shape": "dot",
                "color": "#5DCAA5" if subtype == "ship" else "#5D8BFF",
                "font": {"color": "#ffffff"},
                "size": scaled_size(count, min_c, max_c, 8, 30),
                "count": count,
                "title": f"{ship} — {count:,} observations",
            }
        )

    # ---------------------------------------------------------------------
    # Edges: decade -> variable
    # ---------------------------------------------------------------------
    decade_variable = graph_summary.groupby(
        ["decade", "variable"], as_index=False
    )["n_obs"].sum()

    min_c = int(decade_variable["n_obs"].min()) if len(decade_variable) else 1
    max_c = int(decade_variable["n_obs"].max()) if len(decade_variable) else 1

    for _, row in decade_variable.iterrows():
        decade = int(row["decade"])
        variable = str(row["variable"])
        count = int(row["n_obs"])

        edges.append(
            {
                "id": f"edge_decade_{decade}_var_{safe_id(variable)}",
                "from": f"decade_{decade}",
                "to": f"var_{safe_id(variable)}",
                "edgeType": "decade-variable",
                "count": count,
                "width": scaled_width(count, min_c, max_c),
                "color": var_color.get(variable, "#94a3b8"),
                "title": f"{count:,} observations",
            }
        )

    # ---------------------------------------------------------------------
    # Edges: variable -> ship/station
    # ---------------------------------------------------------------------
    variable_ship = graph_summary.groupby(
        ["variable", "ship"], as_index=False
    )["n_obs"].sum()

    min_c = int(variable_ship["n_obs"].min()) if len(variable_ship) else 1
    max_c = int(variable_ship["n_obs"].max()) if len(variable_ship) else 1

    for _, row in variable_ship.iterrows():
        variable = str(row["variable"])
        ship = str(row["ship"])
        count = int(row["n_obs"])

        edges.append(
            {
                "id": f"edge_var_{safe_id(variable)}_ship_{safe_id(ship)}",
                "from": f"var_{safe_id(variable)}",
                "to": f"ship_{safe_id(ship)}",
                "edgeType": "variable-ship",
                "count": count,
                "width": scaled_width(count, min_c, max_c),
                "color": var_color.get(variable, "#94a3b8"),
                "title": f"{count:,} observations",
            }
        )

    graph = {
        "metadata": {
            "total_rows": int(total_rows),
            "valid_rows": int(valid_rows),
            "top_ships": int(args.top_ships),
            "min_edge_count": int(args.min_edge_count),
            "source": Path(input_path).name,
            "data_model": "decade-variable-ship triples with aggregate graph edges",
        },
        "nodes": nodes,
        "edges": edges,
        "triples": triples,
    }

    output_path.write_text(json.dumps(graph, indent=2))

    print(f"Wrote {output_path}")
    print(f"Nodes: {len(nodes):,}")
    print(f"Edges: {len(edges):,}")
    print(f"Triples: {len(triples):,}")
    print(f"Source rows: {total_rows:,}")
    print(f"Valid rows used: {valid_rows:,}")


if __name__ == "__main__":
    main()