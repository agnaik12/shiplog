import {
    COLORS,
    EDGE_STRENGTH_BINS,
    EDGE_STRENGTH_COLORS,
    STATION_NAMES,
  } from "../constants/graphConstants";
  
  export function formatNumber(n) {
    if (n === undefined || n === null || n === "") return "";
    return Number(n).toLocaleString();
  }
  
  export function normalizeText(value) {
    return String(value || "").toLowerCase();
  }
  
  export function makeNodeColor(background, border = background) {
    return {
      background,
      border,
      highlight: {
        background,
        border: "#ffffff",
      },
      hover: {
        background,
        border: "#ffffff",
      },
    };
  }
  
  export function getRawColor(node) {
    if (!node || !node.color) return null;
  
    if (typeof node.color === "string") return node.color;
  
    if (typeof node.color === "object" && node.color.background) {
      return node.color.background;
    }
  
    return null;
  }
  
  export function isStationNode(node) {
    if (!node || node.group !== "ship") return false;
  
    const subtype = String(
      node.subtype || node.kind || node.entityType || node.category || ""
    ).toLowerCase();
  
    if (subtype.includes("station")) return true;
    if (subtype.includes("ship")) return false;
  
    return STATION_NAMES.has(node.label);
  }
  
  export function getDisplayType(node) {
    if (!node) return "";
  
    if (node.group === "ship") {
      return isStationNode(node) ? "station" : "ship";
    }
  
    return node.group;
  }
  
  export function scaleNodeSize(node) {
    const baseSize = Number(node.size || 18);
  
    if (node.group === "decade") {
      return Math.max(10, baseSize * 0.46);
    }
  
    if (node.group === "variable") {
      return Math.max(11, baseSize * 0.48);
    }
  
    return Math.max(9, baseSize * 0.42);
  }
  
  export function getNodeVisual(node, isDimmed = false, isSelected = false) {
    let color;
  
    if (node.group === "decade") {
      color = makeNodeColor(COLORS.decade, COLORS.decade);
    } else if (node.group === "variable") {
      const base = node.visualColor || getRawColor(node) || COLORS.variableDefault;
      color = makeNodeColor(base, base);
    } else if (node.group === "ship") {
      const base =
        node.visualColor || (isStationNode(node) ? COLORS.station : COLORS.ship);
      color = makeNodeColor(base, base);
    } else {
      color = makeNodeColor("#999999", "#999999");
    }
  
    if (isDimmed) {
      color = makeNodeColor(COLORS.dimNodeFill, COLORS.dimNodeBorder);
    }
  
    return {
      ...node,
      color,
      size: scaleNodeSize(node),
      borderWidth: isSelected ? 2.8 : 1.5,
      font: {
        size: 13,
        color: isDimmed ? "rgba(229, 231, 235, 0.42)" : "#ffffff",
        strokeWidth: isDimmed ? 2 : 3,
        strokeColor: "#0f172a",
      },
    };
  }
  
  export function getEdgeStrengthColor(count) {
    const value = Number(count || 0);
  
    if (!Number.isFinite(value)) {
      return EDGE_STRENGTH_COLORS[0];
    }
  
    const index = EDGE_STRENGTH_BINS.findIndex(
      (bin) => value >= bin.min && value <= bin.max
    );
  
    if (index === -1) {
      return EDGE_STRENGTH_COLORS[EDGE_STRENGTH_COLORS.length - 1];
    }
  
    return EDGE_STRENGTH_COLORS[index];
  }
  
  export function buildEdgeLegendItems(maxCount) {
    if (
      maxCount === undefined ||
      maxCount === null ||
      !Number.isFinite(maxCount)
    ) {
      return [];
    }
  
    return EDGE_STRENGTH_BINS.filter((bin) => bin.min <= maxCount).map(
      (bin, index) => {
        const isLastVisibleBin =
          bin.max === Infinity || bin.max >= Number(maxCount);
  
        return {
          color:
            EDGE_STRENGTH_COLORS[
              Math.min(index, EDGE_STRENGTH_COLORS.length - 1)
            ],
          label: isLastVisibleBin
            ? `${formatNumber(bin.min)}+`
            : `${formatNumber(bin.min)}–${formatNumber(bin.max)}`,
        };
      }
    );
  }
  
  function hasValue(values, value) {
    return Array.isArray(values) && values.includes(value);
  }
  
  function hasOverlap(a, b) {
    if (!Array.isArray(a) || !Array.isArray(b)) return false;
    return a.some((value) => b.includes(value));
  }
  
  function addEdgeAndNodes(edge, highlightedEdgeIds, highlightedNodeIds) {
    highlightedEdgeIds.add(edge.id);
    highlightedNodeIds.add(edge.from);
    highlightedNodeIds.add(edge.to);
  }
  
  export function getExpandedHighlight(edges, nodes, nodeId, layoutMode) {
    const selectedNode = nodes.find((node) => node.id === nodeId);
  
    if (!selectedNode) {
      return {
        nodeIds: new Set(),
        edgeIds: new Set(),
      };
    }
  
    const highlightedNodeIds = new Set([nodeId]);
    const highlightedEdgeIds = new Set();
  
    if (layoutMode === "year-ship-variable") {
      if (selectedNode.group === "decade") {
        const firstEdges = edges.filter(
          (edge) => edge.edgeType === "decade-ship" && edge.from === nodeId
        );
  
        firstEdges.forEach((firstEdge) => {
          addEdgeAndNodes(firstEdge, highlightedEdgeIds, highlightedNodeIds);
  
          const shipId = firstEdge.to;
  
          const secondEdges = edges.filter(
            (edge) =>
              edge.edgeType === "ship-variable" &&
              edge.from === shipId &&
              hasValue(edge.decadeIds, nodeId)
          );
  
          secondEdges.forEach((secondEdge) => {
            addEdgeAndNodes(secondEdge, highlightedEdgeIds, highlightedNodeIds);
          });
        });
      } else if (selectedNode.group === "ship") {
        edges
          .filter((edge) => edge.from === nodeId || edge.to === nodeId)
          .forEach((edge) => {
            addEdgeAndNodes(edge, highlightedEdgeIds, highlightedNodeIds);
          });
      } else if (selectedNode.group === "variable") {
        const secondEdges = edges.filter(
          (edge) => edge.edgeType === "ship-variable" && edge.to === nodeId
        );
  
        secondEdges.forEach((secondEdge) => {
          addEdgeAndNodes(secondEdge, highlightedEdgeIds, highlightedNodeIds);
  
          const shipId = secondEdge.from;
  
          const firstEdges = edges.filter(
            (edge) =>
              edge.edgeType === "decade-ship" &&
              edge.to === shipId &&
              hasOverlap(edge.decadeIds, secondEdge.decadeIds)
          );
  
          firstEdges.forEach((firstEdge) => {
            addEdgeAndNodes(firstEdge, highlightedEdgeIds, highlightedNodeIds);
          });
        });
      }
    } else {
      if (selectedNode.group === "decade") {
        const firstEdges = edges.filter(
          (edge) => edge.edgeType === "decade-variable" && edge.from === nodeId
        );
  
        firstEdges.forEach((firstEdge) => {
          addEdgeAndNodes(firstEdge, highlightedEdgeIds, highlightedNodeIds);
  
          const variableId = firstEdge.to;
  
          const secondEdges = edges.filter(
            (edge) =>
              edge.edgeType === "variable-ship" &&
              edge.from === variableId &&
              hasValue(edge.decadeIds, nodeId)
          );
  
          secondEdges.forEach((secondEdge) => {
            addEdgeAndNodes(secondEdge, highlightedEdgeIds, highlightedNodeIds);
          });
        });
      } else if (selectedNode.group === "variable") {
        edges
          .filter((edge) => edge.from === nodeId || edge.to === nodeId)
          .forEach((edge) => {
            addEdgeAndNodes(edge, highlightedEdgeIds, highlightedNodeIds);
          });
      } else if (selectedNode.group === "ship") {
        const secondEdges = edges.filter(
          (edge) => edge.edgeType === "variable-ship" && edge.to === nodeId
        );
  
        secondEdges.forEach((secondEdge) => {
          addEdgeAndNodes(secondEdge, highlightedEdgeIds, highlightedNodeIds);
  
          const variableId = secondEdge.from;
  
          const firstEdges = edges.filter(
            (edge) =>
              edge.edgeType === "decade-variable" &&
              edge.to === variableId &&
              hasOverlap(edge.decadeIds, secondEdge.decadeIds)
          );
  
          firstEdges.forEach((firstEdge) => {
            addEdgeAndNodes(firstEdge, highlightedEdgeIds, highlightedNodeIds);
          });
        });
      }
    }
  
    if (highlightedEdgeIds.size === 0) {
      edges
        .filter((edge) => edge.from === nodeId || edge.to === nodeId)
        .forEach((edge) => {
          addEdgeAndNodes(edge, highlightedEdgeIds, highlightedNodeIds);
        });
    }
  
    return {
      nodeIds: highlightedNodeIds,
      edgeIds: highlightedEdgeIds,
    };
  }