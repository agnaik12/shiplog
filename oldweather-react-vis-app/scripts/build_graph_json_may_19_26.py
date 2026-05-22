#!/usr/bin/env python3

import argparse
import json
import math
import re
from pathlib import Path

import pandas as pd


VARIABLE_CONFIG = {
    "baro": {
        "labels": ["baro", "barometer", "pressure"],
        "color": "#534AB7",
    },
    "clouds": {
        "labels": ["clouds", "cloud"],
        "color": "#888780",
    },
    "temp_dry": {
        "labels": ["temp_dry", "dry_temp", "air_temperature", "temperature"],
        "color": "#E24B4A",
    },
    "temp_wet": {
        "labels": ["temp_wet", "wet_temp"],
        "color": "#F97316",
    },
    "temp_water": {
        "labels": ["temp_water", "water_temp", "sea_temperature"],
        "color": "#185FA5",
    },
    "weather": {
        "labels": ["weather"],
        "color": "#0F6E56",
    },
    "wind_kts": {
        "labels": ["wind_kts", "wind_speed", "wind"],
        "color": "#1D9E75",
    },
    "ice_1": {
        "labels": ["ice_1"],
        "color": "#85B7EB",
    },
    "ice_2": {
        "labels": ["ice_2"],
        "color": "#85B7EB",
    },
    "ice_log": {
        "labels": ["ice_log"],
        "color": "#85B7EB",
    },
    "people": {
        "labels": ["people"],
        "color": "#D85A30",
    },
    "animals": {
        "labels": ["animals"],
        "color": "#639922",
    },
    "flora_fauna": {
        "labels": ["flora_fauna", "flora", "fauna"],
        "color": "#639922",
    },
}


STATION_NAMES = {"Adak"}


def safe_id(value):
    text = str(value).strip()
    text = re.sub(r"[^A-Za-z0-9]+", "_", text)
    text = re.sub(r"_+", "_", text)
    return text.strip("_")


def format_count(n):
    return f"{int(n):,}"


def scale_size(count, min_count, max_count, min_size=8, max_size=30):
    count = float(count or 0)

    if count <= 0:
        return min_size

    if max_count <= min_count:
        return (min_size + max_size) / 2

    log_min = math.log10(min_count + 1)
    log_max = math.log10(max_count + 1)
    log_val = math.log10(count + 1)

    t = (log_val - log_min) / (log_max - log_min)
    t = max(0, min(1, t))

    return min_size + t * (max_size - min_size)


def find_column(df, candidates):
    columns_lower = {col.lower(): col for col in df.columns}

    for candidate in candidates:
        if candidate.lower() in columns_lower:
            return columns_lower[candidate.lower()]

    return None


def detect_ship_column(df):
    candidates = [
        "ship",
        "ship_name",
        "vessel",
        "vessel_name",
        "logbook",
        "source",
        "name",
    ]

    col = find_column(df, candidates)

    if col:
        return col

    raise ValueError(
        "Could not detect ship column. "
        f"Available columns are: {list(df.columns)}"
    )


def detect_year_column(df):
    direct_candidates = [
        "year",
        "Year",
        "observation_year",
        "obs_year",
        "yr",
    ]

    col = find_column(df, direct_candidates)

    if col:
        return col

    date_candidates = [
        "date",
        "Date",
        "datetime",
        "timestamp",
        "time",
        "observed_at",
        "observation_date",
    ]

    date_col = find_column(df, date_candidates)

    if date_col:
        parsed = pd.to_datetime(df[date_col], errors="coerce")
        df["__year"] = parsed.dt.year
        return "__year"

    raise ValueError(
        "Could not detect year/date column. "
        "Expected a column like year, date, datetime, or timestamp. "
        f"Available columns are: {list(df.columns)}"
    )


def get_variable_columns(df):
    variable_columns = {}

    lower_to_actual = {col.lower(): col for col in df.columns}

    for variable_name, config in VARIABLE_CONFIG.items():
        for candidate in config["labels"]:
            if candidate.lower() in lower_to_actual:
                variable_columns[variable_name] = lower_to_actual[candidate.lower()]
                break

    if not variable_columns:
        raise ValueError(
            "Could not detect any observation variable columns. "
            f"Available columns are: {list(df.columns)}"
        )

    return variable_columns


def normalize_ship_name(value):
    text = str(value).strip()

    if not text or text.lower() in {"nan", "none", "null"}:
        return None

    return text.replace(" ", "_")


def has_observation(series):
    if pd.api.types.is_numeric_dtype(series):
        return series.notna()

    text = series.astype(str).str.strip().str.lower()

    return (
        series.notna()
        & (text != "")
        & (text != "nan")
        & (text != "none")
        & (text != "null")
    )


def build_long_observations(df, ship_col, year_col, variable_columns):
    working = df[[ship_col, year_col] + list(variable_columns.values())].copy()

    working["ship"] = working[ship_col].map(normalize_ship_name)
    working["year"] = pd.to_numeric(working[year_col], errors="coerce")

    working = working.dropna(subset=["ship", "year"])
    working["year"] = working["year"].astype(int)

    working = working[(working["year"] >= 1800) & (working["year"] <= 2100)]

    long_frames = []

    for variable_name, column_name in variable_columns.items():
        mask = has_observation(working[column_name])

        if not mask.any():
            continue

        tmp = working.loc[mask, ["ship", "year"]].copy()
        tmp["variable"] = variable_name
        tmp["count"] = 1

        long_frames.append(tmp)

    if not long_frames:
        raise ValueError("No valid observations found for configured variables.")

    long_df = pd.concat(long_frames, ignore_index=True)

    long_df["decade_start"] = (long_df["year"] // 10) * 10
    long_df["decade"] = long_df["decade_start"].astype(str) + "s"

    return long_df


def keep_top_ships(long_df, top_ships):
    ship_counts = (
        long_df.groupby("ship", as_index=False)["count"]
        .sum()
        .sort_values("count", ascending=False)
    )

    top_ship_names = set(ship_counts.head(top_ships)["ship"])

    return long_df[long_df["ship"].isin(top_ship_names)].copy(), ship_counts


def build_nodes(long_df):
    nodes = []

    decade_counts = (
        long_df.groupby(["decade_start", "decade"], as_index=False)["count"]
        .sum()
        .sort_values("decade_start")
    )

    variable_counts = (
        long_df.groupby("variable", as_index=False)["count"]
        .sum()
        .sort_values("variable")
    )

    ship_counts = (
        long_df.groupby("ship", as_index=False)["count"]
        .sum()
        .sort_values("count", ascending=False)
    )

    min_decade = decade_counts["count"].min()
    max_decade = decade_counts["count"].max()

    min_variable = variable_counts["count"].min()
    max_variable = variable_counts["count"].max()

    min_ship = ship_counts["count"].min()
    max_ship = ship_counts["count"].max()

    for _, row in decade_counts.iterrows():
        decade_start = int(row["decade_start"])
        decade = row["decade"]
        count = int(row["count"])

        nodes.append(
            {
                "id": f"decade_{decade_start}",
                "label": decade,
                "group": "decade",
                "shape": "box",
                "color": "#4A7BB7",
                "font": {"color": "#ffffff"},
                "size": scale_size(count, min_decade, max_decade, 10, 28),
                "count": count,
                "title": f"{decade} — {format_count(count)} observations",
            }
        )

    for _, row in variable_counts.iterrows():
        variable = row["variable"]
        count = int(row["count"])

        color = VARIABLE_CONFIG.get(variable, {}).get("color", "#E45757")

        nodes.append(
            {
                "id": f"var_{safe_id(variable)}",
                "label": variable,
                "group": "variable",
                "shape": "diamond",
                "color": color,
                "font": {"color": "#ffffff"},
                "size": scale_size(count, min_variable, max_variable, 12, 34),
                "count": count,
                "title": f"{variable} — {format_count(count)} observations",
            }
        )

    for _, row in ship_counts.iterrows():
        ship = row["ship"]
        count = int(row["count"])
        subtype = "station" if ship in STATION_NAMES else "ship"
        color = "#5D8BFF" if subtype == "station" else "#5DCAA5"

        nodes.append(
            {
                "id": f"ship_{safe_id(ship)}",
                "label": ship,
                "group": "ship",
                "subtype": subtype,
                "shape": "dot",
                "color": color,
                "font": {"color": "#ffffff"},
                "size": scale_size(count, min_ship, max_ship, 8, 30),
                "count": count,
                "title": f"{ship} — {format_count(count)} observations",
            }
        )

    return nodes


def build_triples(long_df):
    grouped = (
        long_df.groupby(
            ["decade_start", "decade", "year", "variable", "ship"],
            as_index=False,
        )["count"]
        .sum()
        .sort_values(["decade_start", "year", "variable", "ship"])
    )

    triples = []

    for _, row in grouped.iterrows():
        decade_start = int(row["decade_start"])
        decade = row["decade"]
        year = int(row["year"])
        variable = row["variable"]
        ship = row["ship"]
        count = int(row["count"])

        triples.append(
            {
                "decade": decade,
                "decadeId": f"decade_{decade_start}",
                "year": year,
                "yearId": f"year_{year}",
                "variable": variable,
                "variableId": f"var_{safe_id(variable)}",
                "ship": ship,
                "shipId": f"ship_{safe_id(ship)}",
                "count": count,
            }
        )

    return triples


def build_edges_from_triples(triples):
    decade_variable = {}
    variable_ship = {}

    for triple in triples:
        dv_key = (triple["decadeId"], triple["variableId"])
        vs_key = (triple["variableId"], triple["shipId"])

        decade_variable[dv_key] = decade_variable.get(dv_key, 0) + int(
            triple["count"]
        )
        variable_ship[vs_key] = variable_ship.get(vs_key, 0) + int(triple["count"])

    all_counts = list(decade_variable.values()) + list(variable_ship.values())
    max_count = max(all_counts) if all_counts else 1

    edges = []

    for (decade_id, variable_id), count in decade_variable.items():
        edges.append(
            {
                "id": f"edge_{decade_id}_{variable_id}",
                "from": decade_id,
                "to": variable_id,
                "edgeType": "decade-variable",
                "count": int(count),
                "width": edge_width(count, max_count),
                "title": f"{format_count(count)} observations",
            }
        )

    for (variable_id, ship_id), count in variable_ship.items():
        edges.append(
            {
                "id": f"edge_{variable_id}_{ship_id}",
                "from": variable_id,
                "to": ship_id,
                "edgeType": "variable-ship",
                "count": int(count),
                "width": edge_width(count, max_count),
                "title": f"{format_count(count)} observations",
            }
        )

    return edges


def edge_width(count, max_count):
    if count <= 0:
        return 0.3

    if max_count <= 1:
        return 1.0

    t = math.log10(count + 1) / math.log10(max_count + 1)
    return 0.3 + t * 3.2


def main():
    parser = argparse.ArgumentParser(
        description="Build graph_data.json for the Ship Logs Knowledge Graph."
    )

    parser.add_argument(
        "--input",
        required=True,
        help="Input parquet or CSV file.",
    )

    parser.add_argument(
        "--output",
        required=True,
        help="Output graph_data.json path.",
    )

    parser.add_argument(
        "--top-ships",
        type=int,
        default=60,
        help="Number of top ships/stations to keep.",
    )

    parser.add_argument(
        "--min-edge-count",
        type=int,
        default=1,
        help="Minimum count for generated aggregate edges.",
    )

    args = parser.parse_args()

    input_path = Path(args.input)
    output_path = Path(args.output)

    if not input_path.exists():
        raise FileNotFoundError(f"Input file does not exist: {input_path}")

    if input_path.suffix.lower() == ".parquet":
        df = pd.read_parquet(input_path)
    elif input_path.suffix.lower() in {".csv", ".txt"}:
        df = pd.read_csv(input_path)
    else:
        raise ValueError("Input must be .parquet or .csv")

    total_rows = len(df)

    ship_col = detect_ship_column(df)
    year_col = detect_year_column(df)
    variable_columns = get_variable_columns(df)

    print(f"Detected ship column: {ship_col}")
    print(f"Detected year/date column: {year_col}")
    print(f"Detected variable columns: {variable_columns}")

    long_df = build_long_observations(df, ship_col, year_col, variable_columns)
    valid_rows = len(long_df)

    long_df, ship_counts = keep_top_ships(long_df, args.top_ships)

    nodes = build_nodes(long_df)
    triples = build_triples(long_df)
    edges = build_edges_from_triples(triples)

    if args.min_edge_count > 1:
        edges = [
            edge for edge in edges if int(edge.get("count", 0)) >= args.min_edge_count
        ]

    graph = {
        "metadata": {
            "total_rows": int(total_rows),
            "valid_rows": int(valid_rows),
            "top_ships": int(args.top_ships),
            "min_edge_count": int(args.min_edge_count),
            "source": input_path.name,
            "data_model": "year-aware decade-variable-ship triples with aggregate graph edges",
            "ship_column": ship_col,
            "year_column": year_col,
            "variable_columns": variable_columns,
        },
        "nodes": nodes,
        "edges": edges,
        "triples": triples,
    }

    output_path.parent.mkdir(parents=True, exist_ok=True)

    with output_path.open("w", encoding="utf-8") as f:
        json.dump(graph, f, indent=2)

    print(f"Wrote {output_path}")
    print(f"Nodes: {len(nodes):,}")
    print(f"Edges: {len(edges):,}")
    print(f"Triples: {len(triples):,}")
    print(f"Total source rows: {total_rows:,}")
    print(f"Valid observation rows: {valid_rows:,}")


if __name__ == "__main__":
    main()