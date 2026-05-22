import { useMemo } from "react";
import { COLORS } from "../constants/graphConstants";
import {
  formatNumber,
  getEdgeStrengthColor,
  getExpandedHighlight,
  getNodeVisual,
  normalizeText,
} from "../utils/graphUtils";

function addEdgeCount(map, key, count, metadata) {
  if (!map.has(key)) {
    map.set(key, {
      count: 0,
      decadeIds: new Set(),
      variableIds: new Set(),
      shipIds: new Set(),
    });
  }

  const item = map.get(key);
  item.count += count;

  if (metadata.decadeId) item.decadeIds.add(metadata.decadeId);
  if (metadata.variableId) item.variableIds.add(metadata.variableId);
  if (metadata.shipId) item.shipIds.add(metadata.shipId);
}

function setToArray(value) {
  return Array.from(value || []);
}

function getNodeCount(node) {
  return Number(node?.count || 0);
}

function sortBySizeThenLabel(a, b) {
  const countDiff = getNodeCount(b) - getNodeCount(a);

  if (countDiff !== 0) return countDiff;

  return String(a.label).localeCompare(String(b.label));
}

function sortByLabel(a, b) {
  return String(a.label).localeCompare(String(b.label));
}

function centerOutColumn(index, total) {
  const center = (total - 1) / 2;

  if (index === 0) return center;

  const step = Math.ceil(index / 2);
  const direction = index % 2 === 1 ? 1 : -1;

  return center + direction * step;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function scaleCountToT(count, minCount, maxCount) {
  const value = Number(count || 0);

  if (!Number.isFinite(value) || value <= 0) return 0;
  if (!Number.isFinite(minCount) || !Number.isFinite(maxCount)) return 0;
  if (maxCount <= minCount) return 0.5;

  const logMin = Math.log10(minCount + 1);
  const logMax = Math.log10(maxCount + 1);
  const logValue = Math.log10(value + 1);

  return clamp((logValue - logMin) / (logMax - logMin), 0, 1);
}

function interpolateRgb(start, end, t) {
  const r = Math.round(start[0] + (end[0] - start[0]) * t);
  const g = Math.round(start[1] + (end[1] - start[1]) * t);
  const b = Math.round(start[2] + (end[2] - start[2]) * t);

  return `rgb(${r}, ${g}, ${b})`;
}

function getVariableColor(label) {
  const palette = [
    "#ef4444",
    "#f97316",
    "#eab308",
    "#22c55e",
    "#14b8a6",
    "#06b6d4",
    "#3b82f6",
    "#6366f1",
    "#8b5cf6",
    "#d946ef",
    "#ec4899",
    "#f43f5e",
  ];

  let hash = 0;
  const text = String(label || "");

  for (let i = 0; i < text.length; i += 1) {
    hash = text.charCodeAt(i) + ((hash << 5) - hash);
  }

  const index = Math.abs(hash) % palette.length;
  return palette[index];
}

function getShipDivergingColor(count, minCount, maxCount) {
  const t = scaleCountToT(count, minCount, maxCount);

  // low count: blue
  // medium count: gray
  // high count: green
  if (t < 0.5) {
    const localT = t / 0.5;
    return interpolateRgb([59, 130, 246], [148, 163, 184], localT);
  }

  const localT = (t - 0.5) / 0.5;
  return interpolateRgb([148, 163, 184], [34, 197, 94], localT);
}

function getTripleYear(triple) {
  if (triple.year !== undefined && triple.year !== null && triple.year !== "") {
    const value = Number(triple.year);

    if (Number.isFinite(value)) {
      return String(Math.trunc(value));
    }

    const text = String(triple.year);
    const match = text.match(/\b(18\d{2}|19\d{2}|20\d{2})\b/);
    if (match) return match[1];
  }

  const candidates = [
    triple.Year,
    triple.observationYear,
    triple.observation_year,
    triple.date,
    triple.datetime,
    triple.timestamp,
  ];

  for (const candidate of candidates) {
    if (candidate === undefined || candidate === null || candidate === "") {
      continue;
    }

    const text = String(candidate);
    const match = text.match(/\b(18\d{2}|19\d{2}|20\d{2})\b/);

    if (match) {
      return match[1];
    }
  }

  return null;
}

function getYearNodeId(year) {
  return `year_${year}`;
}

function makeYearNode({ year, decade, count }) {
  return {
    id: getYearNodeId(year),
    label: String(year),
    group: "decade",
    levelType: "year",
    decade,
    shape: "box",
    color: "#4A7BB7",
    font: { color: "#ffffff" },
    size: 14,
    count,
    title: `${year} — ${formatNumber(count)} observations`,
    description: `${year} observations from ${decade}`,
  };
}

export function useFilteredGraph({
  rawGraph,
  selectedDecade,
  selectedVariable,
  selectedShip,
  minEdgeCount,
  search,
  gravityEnabled,
  highlightNodeId,
  layoutMode,
  drillDecade,
}) {
  return useMemo(() => {
    let triples = rawGraph.triples || [];

    const isDrilled = Boolean(drillDecade);
    const activeDecade =
      selectedDecade !== "all" ? selectedDecade : drillDecade || "all";

    if (activeDecade !== "all") {
      triples = triples.filter((triple) => triple.decade === activeDecade);
    }

    if (selectedVariable !== "all") {
      triples = triples.filter((triple) => triple.variable === selectedVariable);
    }

    if (selectedShip !== "all") {
      triples = triples.filter((triple) => triple.ship === selectedShip);
    }

    if (search.trim()) {
      const q = normalizeText(search);

      triples = triples.filter((triple) => {
        return (
          normalizeText(triple.decade).includes(q) ||
          normalizeText(getTripleYear(triple)).includes(q) ||
          normalizeText(triple.variable).includes(q) ||
          normalizeText(triple.ship).includes(q)
        );
      });
    }

    const firstLayerCounts = new Map();
    const secondLayerCounts = new Map();
    const yearStats = new Map();

    triples.forEach((triple) => {
      const count = Number(triple.count || 0);

      let timeId = triple.decadeId;
      let timeLabel = triple.decade;

      if (isDrilled) {
        const year = getTripleYear(triple);

        if (!year) {
          return;
        }

        timeId = getYearNodeId(year);
        timeLabel = year;

        if (!yearStats.has(timeId)) {
          yearStats.set(timeId, {
            year,
            decade: triple.decade,
            count: 0,
          });
        }

        yearStats.get(timeId).count += count;
      }

      if (layoutMode === "year-ship-variable") {
        const timeShipKey = `${timeId}__${triple.shipId}`;
        const shipVariableKey = `${triple.shipId}__${triple.variableId}`;

        addEdgeCount(firstLayerCounts, timeShipKey, count, {
          decadeId: timeId,
          shipId: triple.shipId,
          variableId: triple.variableId,
        });

        addEdgeCount(secondLayerCounts, shipVariableKey, count, {
          decadeId: timeId,
          shipId: triple.shipId,
          variableId: triple.variableId,
        });
      } else {
        const timeVariableKey = `${timeId}__${triple.variableId}`;
        const variableShipKey = `${triple.variableId}__${triple.shipId}`;

        addEdgeCount(firstLayerCounts, timeVariableKey, count, {
          decadeId: timeId,
          variableId: triple.variableId,
          shipId: triple.shipId,
        });

        addEdgeCount(secondLayerCounts, variableShipKey, count, {
          decadeId: timeId,
          variableId: triple.variableId,
          shipId: triple.shipId,
        });
      }
    });

    const edges = [];

    firstLayerCounts.forEach((item, key) => {
      const [fromId, toId] = key.split("__");

      edges.push({
        id: `edge_${fromId}_${toId}`,
        from: fromId,
        to: toId,
        edgeType:
          layoutMode === "year-ship-variable"
            ? "decade-ship"
            : "decade-variable",
        count: item.count,
        decadeIds: setToArray(item.decadeIds),
        variableIds: setToArray(item.variableIds),
        shipIds: setToArray(item.shipIds),
        width: Math.max(0.8, Math.log10(item.count + 1) * 0.9),
        title: `${formatNumber(item.count)} observations`,
      });
    });

    secondLayerCounts.forEach((item, key) => {
      const [fromId, toId] = key.split("__");

      edges.push({
        id: `edge_${fromId}_${toId}`,
        from: fromId,
        to: toId,
        edgeType:
          layoutMode === "year-ship-variable"
            ? "ship-variable"
            : "variable-ship",
        count: item.count,
        decadeIds: setToArray(item.decadeIds),
        variableIds: setToArray(item.variableIds),
        shipIds: setToArray(item.shipIds),
        width: Math.max(0.8, Math.log10(item.count + 1) * 0.9),
        title: `${formatNumber(item.count)} observations`,
      });
    });

    const visibleEdges = edges.filter(
      (edge) => Number(edge.count || 0) >= Number(minEdgeCount || 1)
    );

    const visibleNodeIds = new Set();

    visibleEdges.forEach((edge) => {
      visibleNodeIds.add(edge.from);
      visibleNodeIds.add(edge.to);
    });

    const generatedYearNodes = Array.from(yearStats.entries())
      .map(([id, item]) =>
        makeYearNode({
          year: item.year,
          decade: item.decade,
          count: item.count,
        })
      )
      .filter((node) => visibleNodeIds.has(node.id));

    const rawNodes = rawGraph.nodes.filter((node) => {
      if (!visibleNodeIds.has(node.id)) return false;

      // Critical fix:
      // In drill-down mode, do not include the old decade nodes.
      // The top row should be generated year nodes only.
      if (isDrilled && node.group === "decade") return false;

      return true;
    });

    const nodes = isDrilled ? [...rawNodes, ...generatedYearNodes] : rawNodes;

    const edgeCounts = visibleEdges.map((edge) => Number(edge.count || 0));
    const minVisibleEdgeCount = edgeCounts.length ? Math.min(...edgeCounts) : 0;
    const maxVisibleEdgeCount = edgeCounts.length ? Math.max(...edgeCounts) : 0;

    const timeNodes = nodes
      .filter((node) => node.group === "decade")
      .sort(sortByLabel);

    const variableNodes = nodes
      .filter((node) => node.group === "variable")
      .sort(sortBySizeThenLabel);

    const shipNodes = nodes
      .filter((node) => node.group === "ship")
      .sort(sortBySizeThenLabel);

    const shipCounts = shipNodes.map((node) => Number(node.count || 0));
    const minShipCount = shipCounts.length ? Math.min(...shipCounts) : 0;
    const maxShipCount = shipCounts.length ? Math.max(...shipCounts) : 0;

    const expandedHighlight =
      highlightNodeId === null
        ? null
        : getExpandedHighlight(visibleEdges, nodes, highlightNodeId, layoutMode);

    const connectedToHighlight =
      expandedHighlight === null ? null : expandedHighlight.nodeIds;

    const connectedEdgesToHighlight =
      expandedHighlight === null ? null : expandedHighlight.edgeIds;

    const laidOutNodes = [];

    const variablesAreMiddle = layoutMode === "year-variable-ship";
    const shipsAreMiddle = layoutMode === "year-ship-variable";

    const timeSpacing = isDrilled ? 95 : gravityEnabled ? 180 : 170;
    const timeY = gravityEnabled ? -545 : -540;
    const timeStartX = -((timeNodes.length - 1) * timeSpacing) / 2;

    timeNodes.forEach((node, index) => {
      const isDimmed =
        connectedToHighlight !== null && !connectedToHighlight.has(node.id);

      laidOutNodes.push(
        getNodeVisual(
          {
            ...node,
            x: timeStartX + index * timeSpacing,
            y: timeY,
            fixed: { x: true, y: true },
            physics: false,
          },
          isDimmed,
          highlightNodeId === node.id
        )
      );
    });

    const middleY = -120;
    const bottomY = 390;

    const variableSpacing = variablesAreMiddle ? 210 : 205;
    const variableY = variablesAreMiddle ? middleY : bottomY;

    const variableCols = variablesAreMiddle
      ? variableNodes.length
      : Math.max(4, Math.ceil(Math.sqrt(Math.max(variableNodes.length, 1))));

    const variableSpacingX = variablesAreMiddle ? variableSpacing : 205;
    const variableSpacingY = 130;

    const variableStartX =
      -((Math.min(variableCols, variableNodes.length) - 1) * variableSpacingX) /
      2;

    variableNodes.forEach((node, index) => {
      const row = variablesAreMiddle ? 0 : Math.floor(index / variableCols);
      const colIndex = variablesAreMiddle ? index : index % variableCols;

      const col = variablesAreMiddle
        ? centerOutColumn(colIndex, variableNodes.length)
        : centerOutColumn(
            colIndex,
            Math.min(variableCols, variableNodes.length)
          );

      const isDimmed =
        connectedToHighlight !== null && !connectedToHighlight.has(node.id);

      laidOutNodes.push(
        getNodeVisual(
          {
            ...node,
            visualColor: getVariableColor(node.label),
            x: variableStartX + col * variableSpacingX,
            y: variableY + row * variableSpacingY,
            fixed: { x: true, y: true },
            physics: false,
          },
          isDimmed,
          highlightNodeId === node.id
        )
      );
    });

    const shipCols = shipsAreMiddle
      ? Math.max(6, Math.ceil(Math.sqrt(Math.max(shipNodes.length, 1)) * 1.35))
      : Math.max(5, Math.ceil(Math.sqrt(Math.max(shipNodes.length, 1)) * 1.15));

    const shipSpacingX = shipsAreMiddle ? 185 : 205;
    const shipSpacingY = shipsAreMiddle ? 115 : 130;
    const shipBaseY = shipsAreMiddle ? middleY : bottomY;

    const shipStartX =
      -((Math.min(shipCols, shipNodes.length) - 1) * shipSpacingX) / 2;

    shipNodes.forEach((node, index) => {
      const row = Math.floor(index / shipCols);
      const colIndex = index % shipCols;

      const col = centerOutColumn(
        colIndex,
        Math.min(shipCols, shipNodes.length)
      );

      const isDimmed =
        connectedToHighlight !== null && !connectedToHighlight.has(node.id);

      laidOutNodes.push(
        getNodeVisual(
          {
            ...node,
            visualColor: getShipDivergingColor(
              node.count,
              minShipCount,
              maxShipCount
            ),
            x: shipStartX + col * shipSpacingX,
            y: shipBaseY + row * shipSpacingY,
            fixed: { x: true, y: true },
            physics: false,
          },
          isDimmed,
          highlightNodeId === node.id
        )
      );
    });

    const decoratedEdges = visibleEdges.map((edge) => {
      const strengthColor = getEdgeStrengthColor(edge.count);

      if (connectedEdgesToHighlight === null) {
        return {
          ...edge,
          width: Math.max(0.7, Number(edge.width || 1) * 0.82),
          color: {
            color: strengthColor,
            highlight: strengthColor,
            hover: strengthColor,
          },
        };
      }

      const isConnected = connectedEdgesToHighlight.has(edge.id);

      if (isConnected) {
        return {
          ...edge,
          width: Math.max(1.2, Number(edge.width || 1) * 1.08),
          color: {
            color: strengthColor,
            highlight: strengthColor,
            hover: strengthColor,
          },
        };
      }

      return {
        ...edge,
        width: 0.22,
        color: {
          color: COLORS.dimEdge,
          highlight: COLORS.dimEdge,
          hover: COLORS.dimEdge,
        },
      };
    });

    return {
      nodes: laidOutNodes,
      edges: decoratedEdges,
      minEdgeCount: minVisibleEdgeCount,
      maxEdgeCount: maxVisibleEdgeCount,
      minShipCount,
      maxShipCount,
    };
  }, [
    rawGraph.nodes,
    rawGraph.triples,
    selectedDecade,
    selectedVariable,
    selectedShip,
    minEdgeCount,
    search,
    gravityEnabled,
    highlightNodeId,
    layoutMode,
    drillDecade,
  ]);
}