import React, { useEffect, useMemo, useRef, useState } from "react";
import { DataSet, Network } from "vis-network/standalone";
import "vis-network/styles/vis-network.css";
import { Search, RefreshCcw, SlidersHorizontal } from "lucide-react";

const STATION_NAMES = new Set(["Adak"]);

const EDGE_STRENGTH_COLORS = [
  "rgba(234, 179, 8, 0.55)",
  "rgba(94, 234, 212, 0.5)",
  "rgba(45, 212, 191, 0.55)",
  "rgba(56, 189, 248, 0.55)",
  "rgba(37, 99, 235, 0.6)",
  "rgba(30, 58, 138, 0.68)",
];

const EDGE_STRENGTH_BINS = [
  { min: 1, max: 100 },
  { min: 101, max: 1000 },
  { min: 1001, max: 10000 },
  { min: 10001, max: 50000 },
  { min: 50001, max: 100000 },
  { min: 100001, max: Infinity },
];

const COLORS = {
  decade: "#5B8FD9",
  ship: "#58C79C",
  station: "#5D8BFF",
  variableDefault: "#E45757",
  dimEdge: "rgba(180, 180, 180, 0.3)",
  dimNodeFill: "rgba(180, 180, 180, 0.18)",
  dimNodeBorder: "rgba(180, 180, 180, 0.22)",
  edgeHover: "rgba(249, 115, 22, 0.75)",
};

const BASE_INTERACTION = {
  hover: true,
  tooltipDelay: 100,
  navigationButtons: false,
  keyboard: true,
  dragNodes: true,
  dragView: true,
  zoomView: true,
};

const BASE_NODES = {
  borderWidth: 1.5,
  font: {
    size: 13,
    color: "#ffffff",
    strokeWidth: 3,
    strokeColor: "#0f172a",
  },
};

const STATIC_OPTIONS = {
  autoResize: true,
  physics: false,
  layout: {
    improvedLayout: false,
  },
  interaction: BASE_INTERACTION,
  nodes: BASE_NODES,
  edges: {
    arrows: {
      to: { enabled: false },
    },
    smooth: {
      enabled: true,
      type: "cubicBezier",
      forceDirection: "vertical",
      roundness: 0.18,
    },
    color: {
      inherit: false,
    },
  },
};

const GRAVITY_OPTIONS = {
  autoResize: true,
  physics: {
    enabled: true,
    solver: "repulsion",
    repulsion: {
      nodeDistance: 240,
      centralGravity: 0.002,
      springLength: 285,
      springConstant: 0.02,
      damping: 0.9,
    },
    stabilization: {
      enabled: true,
      iterations: 250,
      fit: true,
    },
    maxVelocity: 18,
    minVelocity: 0.2,
    adaptiveTimestep: true,
  },
  layout: {
    improvedLayout: false,
  },
  interaction: BASE_INTERACTION,
  nodes: BASE_NODES,
  edges: {
    arrows: {
      to: { enabled: false },
    },
    smooth: {
      enabled: true,
      type: "continuous",
    },
    color: {
      inherit: false,
    },
  },
};

function formatNumber(n) {
  if (n === undefined || n === null || n === "") return "";
  return Number(n).toLocaleString();
}

function normalizeText(value) {
  return String(value || "").toLowerCase();
}

function makeNodeColor(background, border = background) {
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

function getRawColor(node) {
  if (!node || !node.color) return null;

  if (typeof node.color === "string") return node.color;

  if (typeof node.color === "object" && node.color.background) {
    return node.color.background;
  }

  return null;
}

function isStationNode(node) {
  if (!node || node.group !== "ship") return false;

  const subtype = String(
    node.subtype || node.kind || node.entityType || node.category || ""
  ).toLowerCase();

  if (subtype.includes("station")) return true;
  if (subtype.includes("ship")) return false;

  return STATION_NAMES.has(node.label);
}

function getDisplayType(node) {
  if (!node) return "";

  if (node.group === "ship") {
    return isStationNode(node) ? "station" : "ship";
  }

  return node.group;
}

function scaleNodeSize(node) {
  const baseSize = Number(node.size || 18);

  if (node.group === "decade") {
    return Math.max(10, baseSize * 0.46);
  }

  if (node.group === "variable") {
    return Math.max(11, baseSize * 0.48);
  }

  return Math.max(9, baseSize * 0.42);
}

function getNodeVisual(node, isDimmed = false, isSelected = false) {
  let color;

  if (node.group === "decade") {
    color = makeNodeColor(COLORS.decade, COLORS.decade);
  } else if (node.group === "variable") {
    const base = getRawColor(node) || COLORS.variableDefault;
    color = makeNodeColor(base, base);
  } else if (node.group === "ship") {
    color = isStationNode(node)
      ? makeNodeColor(COLORS.station, COLORS.station)
      : makeNodeColor(COLORS.ship, COLORS.ship);
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
    borderWidth: isSelected ? 2.5 : 1.5,
    font: {
      size: 13,
      color: "#ffffff",
      strokeWidth: 3,
      strokeColor: "#0f172a",
    },
  };
}

function getEdgeStrengthColor(count) {
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

function buildEdgeLegendItems(maxCount) {
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

function getExpandedHighlight(edges, nodes, nodeId) {
  const selectedNode = nodes.find((node) => node.id === nodeId);

  if (!selectedNode) {
    return {
      nodeIds: new Set(),
      edgeIds: new Set(),
    };
  }

  const highlightedNodeIds = new Set([nodeId]);
  const highlightedEdgeIds = new Set();

  const getOtherNodeId = (edge, currentNodeId) => {
    if (edge.from === currentNodeId) return edge.to;
    if (edge.to === currentNodeId) return edge.from;
    return null;
  };

  const getNodeById = (id) => nodes.find((node) => node.id === id);

  // Click year/decade:
  // year/decade -> variables -> all connected ships
  if (selectedNode.group === "decade") {
    const decadeToVariableEdges = edges.filter(
      (edge) =>
        edge.edgeType === "decade-variable" &&
        (edge.from === nodeId || edge.to === nodeId)
    );

    decadeToVariableEdges.forEach((edge) => {
      highlightedEdgeIds.add(edge.id);

      const variableId = getOtherNodeId(edge, nodeId);
      const variableNode = getNodeById(variableId);

      if (!variableNode || variableNode.group !== "variable") return;

      highlightedNodeIds.add(variableId);

      const variableToShipEdges = edges.filter(
        (shipEdge) =>
          shipEdge.edgeType === "variable-ship" &&
          (shipEdge.from === variableId || shipEdge.to === variableId)
      );

      variableToShipEdges.forEach((shipEdge) => {
        highlightedEdgeIds.add(shipEdge.id);

        const shipId = getOtherNodeId(shipEdge, variableId);
        const shipNode = getNodeById(shipId);

        if (shipNode?.group === "ship") {
          highlightedNodeIds.add(shipId);
        }
      });
    });
  }

  // Click ship:
  // ship -> variables -> all connected years/decades
  else if (selectedNode.group === "ship") {
    const shipToVariableEdges = edges.filter(
      (edge) =>
        edge.edgeType === "variable-ship" &&
        (edge.from === nodeId || edge.to === nodeId)
    );

    shipToVariableEdges.forEach((edge) => {
      highlightedEdgeIds.add(edge.id);

      const variableId = getOtherNodeId(edge, nodeId);
      const variableNode = getNodeById(variableId);

      if (!variableNode || variableNode.group !== "variable") return;

      highlightedNodeIds.add(variableId);

      const variableToDecadeEdges = edges.filter(
        (decadeEdge) =>
          decadeEdge.edgeType === "decade-variable" &&
          (decadeEdge.from === variableId || decadeEdge.to === variableId)
      );

      variableToDecadeEdges.forEach((decadeEdge) => {
        highlightedEdgeIds.add(decadeEdge.id);

        const decadeId = getOtherNodeId(decadeEdge, variableId);
        const decadeNode = getNodeById(decadeId);

        if (decadeNode?.group === "decade") {
          highlightedNodeIds.add(decadeId);
        }
      });
    });
  }

  // Click variable:
  // all connected years/decades and ships
  else if (selectedNode.group === "variable") {
    edges.forEach((edge) => {
      if (edge.from === nodeId || edge.to === nodeId) {
        highlightedEdgeIds.add(edge.id);

        const otherNodeId = getOtherNodeId(edge, nodeId);
        if (otherNodeId) {
          highlightedNodeIds.add(otherNodeId);
        }
      }
    });
  }

  // Fallback
  else {
    edges.forEach((edge) => {
      if (edge.from === nodeId || edge.to === nodeId) {
        highlightedEdgeIds.add(edge.id);

        const otherNodeId = getOtherNodeId(edge, nodeId);
        if (otherNodeId) {
          highlightedNodeIds.add(otherNodeId);
        }
      }
    });
  }

  return {
    nodeIds: highlightedNodeIds,
    edgeIds: highlightedEdgeIds,
  };
}

function GraphLegendOverlay({
  filteredGraph,
  edgeLegendItems,
  theme,
  visible,
  position,
  setPosition,
}) {
  const legendRef = useRef(null);
  const isLight = theme === "light";

  function handleDragStart(e) {
    if (!legendRef.current) return;
    e.preventDefault();

    const legendRect = legendRef.current.getBoundingClientRect();
    const parentRect =
      legendRef.current.offsetParent?.getBoundingClientRect() || {
        left: 0,
        top: 0,
      };

    const offsetX = e.clientX - legendRect.left;
    const offsetY = e.clientY - legendRect.top;

    const currentX = legendRect.left - parentRect.left;
    const currentY = legendRect.top - parentRect.top;

    setPosition({ x: currentX, y: currentY });

    function handleMouseMove(evt) {
      const nextX = evt.clientX - parentRect.left - offsetX;
      const nextY = evt.clientY - parentRect.top - offsetY;

      setPosition({
        x: Math.max(8, nextX),
        y: Math.max(8, nextY),
      });
    }

    function handleMouseUp() {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    }

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
  }

  if (!visible) return null;

  const overlayStyle = {
    position: "absolute",
    left: `${position.x}px`,
    zIndex: 20,
    width: "248px",
    padding: "12px",
    borderRadius: "14px",
    background: isLight
      ? "rgba(255, 255, 255, 0.84)"
      : "rgba(15, 23, 42, 0.8)",
    border: isLight
      ? "1px solid rgba(148, 163, 184, 0.35)"
      : "1px solid rgba(148, 163, 184, 0.28)",
    boxShadow: "0 12px 30px rgba(0,0,0,0.22)",
    backdropFilter: "blur(8px)",
    color: isLight ? "#0f172a" : "#e5e7eb",
    fontSize: "11px",
    userSelect: "none",
    ...(position.y === null ? { bottom: "42px" } : { top: `${position.y}px` }),
  };

  return (
    <div ref={legendRef} style={overlayStyle}>
      <div
        onMouseDown={handleDragStart}
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: "8px",
          cursor: "move",
          marginBottom: "8px",
        }}
      >
        <div
          style={{
            fontWeight: 700,
            fontSize: "12px",
            letterSpacing: "0.02em",
          }}
        >
          Legend
        </div>
        <div style={{ fontSize: "10px", opacity: 0.7 }}>drag</div>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: "6px 10px",
          marginBottom: "10px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "7px" }}>
          <span
            style={{
              width: "14px",
              height: "14px",
              borderRadius: "4px",
              background: COLORS.decade,
              display: "inline-block",
            }}
          />
          <span>Decade</span>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "7px" }}>
          <span
            style={{
              width: "14px",
              height: "14px",
              background: COLORS.variableDefault,
              transform: "rotate(45deg)",
              borderRadius: "3px",
              display: "inline-block",
            }}
          />
          <span>Variable</span>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "7px" }}>
          <span
            style={{
              width: "14px",
              height: "14px",
              borderRadius: "999px",
              background: COLORS.ship,
              display: "inline-block",
            }}
          />
          <span>Ship</span>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "7px" }}>
          <span
            style={{
              width: "14px",
              height: "14px",
              borderRadius: "999px",
              background: COLORS.station,
              display: "inline-block",
            }}
          />
          <span>Station</span>
        </div>
      </div>

      <div
        style={{
          paddingTop: "9px",
          borderTop: "1px solid rgba(148, 163, 184, 0.25)",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "baseline",
            marginBottom: "6px",
          }}
        >
          <strong style={{ fontSize: "11px" }}>Edge strength</strong>
          <span style={{ opacity: 0.65, fontSize: "10px" }}>
            observation count
          </span>
        </div>

        <div
          style={{
            height: "10px",
            borderRadius: "999px",
            marginBottom: "5px",
            border: "1px solid rgba(148, 163, 184, 0.28)",
            background: `linear-gradient(to right, ${EDGE_STRENGTH_COLORS.join(
              ", "
            )})`,
          }}
        />

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            fontSize: "10px",
            opacity: 0.75,
            marginBottom: "8px",
          }}
        >
          <span>{formatNumber(filteredGraph.minEdgeCount)}</span>
          <span>{formatNumber(filteredGraph.maxEdgeCount)}</span>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "5px 8px",
          }}
        >
          {edgeLegendItems.map((item) => (
            <div
              key={item.label}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "6px",
                minWidth: 0,
              }}
            >
              <span
                style={{
                  width: "18px",
                  height: "4px",
                  borderRadius: "999px",
                  background: item.color,
                  flexShrink: 0,
                }}
              />
              <span
                style={{
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                  opacity: 0.85,
                }}
              >
                {item.label}
              </span>
            </div>
          ))}
        </div>

        <div
          style={{
            marginTop: "9px",
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "6px",
            opacity: 0.85,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <span
              style={{
                width: "18px",
                height: "4px",
                borderRadius: "999px",
                background: COLORS.dimEdge,
              }}
            />
            <span>Inactive</span>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <span
              style={{
                width: "18px",
                height: "4px",
                borderRadius: "999px",
                background: COLORS.edgeHover,
              }}
            />
            <span>Selected path</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function App() {
  const containerRef = useRef(null);
  const networkRef = useRef(null);

  const [rawGraph, setRawGraph] = useState({
    nodes: [],
    edges: [],
    triples: [],
    metadata: {},
  });

  const [selectedNode, setSelectedNode] = useState(null);
  const [highlightNodeId, setHighlightNodeId] = useState(null);

  const [search, setSearch] = useState("");
  const [selectedDecade, setSelectedDecade] = useState("all");
  const [selectedVariable, setSelectedVariable] = useState("all");
  const [selectedShip, setSelectedShip] = useState("all");
  const [minEdgeCount, setMinEdgeCount] = useState(1);
  const [gravityEnabled, setGravityEnabled] = useState(false);
  const [theme, setTheme] = useState("dark");
  const [loadError, setLoadError] = useState("");
  const [legendVisible, setLegendVisible] = useState(true);
  const [legendPosition, setLegendPosition] = useState({ x: 18, y: null });

  useEffect(() => {
    fetch("/graph_data.json")
      .then((res) => {
        if (!res.ok) {
          throw new Error(`Could not load graph_data.json: ${res.status}`);
        }
        return res.json();
      })
      .then((data) => {
        setRawGraph(data);
      })
      .catch((err) => {
        console.error(err);
        setLoadError(String(err));
      });
  }, []);

  const decades = useMemo(() => {
    return rawGraph.nodes
      .filter((node) => node.group === "decade")
      .map((node) => node.label)
      .sort((a, b) => String(a).localeCompare(String(b)));
  }, [rawGraph.nodes]);

  const variables = useMemo(() => {
    return rawGraph.nodes
      .filter((node) => node.group === "variable")
      .map((node) => node.label)
      .sort((a, b) => String(a).localeCompare(String(b)));
  }, [rawGraph.nodes]);

  const ships = useMemo(() => {
    return rawGraph.nodes
      .filter((node) => node.group === "ship")
      .map((node) => node.label)
      .sort((a, b) => String(a).localeCompare(String(b)));
  }, [rawGraph.nodes]);

  const filteredGraph = useMemo(() => {
    let triples = rawGraph.triples || [];

    if (selectedDecade !== "all") {
      triples = triples.filter((triple) => triple.decade === selectedDecade);
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
          normalizeText(triple.variable).includes(q) ||
          normalizeText(triple.ship).includes(q)
        );
      });
    }

    const decadeVariableCounts = new Map();
    const variableShipCounts = new Map();

    triples.forEach((triple) => {
      const dvKey = `${triple.decadeId}__${triple.variableId}`;
      const vsKey = `${triple.variableId}__${triple.shipId}`;

      decadeVariableCounts.set(
        dvKey,
        (decadeVariableCounts.get(dvKey) || 0) + Number(triple.count || 0)
      );

      variableShipCounts.set(
        vsKey,
        (variableShipCounts.get(vsKey) || 0) + Number(triple.count || 0)
      );
    });

    const edges = [];

    decadeVariableCounts.forEach((count, key) => {
      const [decadeId, variableId] = key.split("__");

      edges.push({
        id: `edge_${decadeId}_${variableId}`,
        from: decadeId,
        to: variableId,
        edgeType: "decade-variable",
        count,
        width: Math.max(0.8, Math.log10(count + 1) * 0.9),
        title: `${formatNumber(count)} observations`,
      });
    });

    variableShipCounts.forEach((count, key) => {
      const [variableId, shipId] = key.split("__");

      edges.push({
        id: `edge_${variableId}_${shipId}`,
        from: variableId,
        to: shipId,
        edgeType: "variable-ship",
        count,
        width: Math.max(0.8, Math.log10(count + 1) * 0.9),
        title: `${formatNumber(count)} observations`,
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

    const nodes = rawGraph.nodes.filter((node) => visibleNodeIds.has(node.id));

    const edgeCounts = visibleEdges.map((edge) => Number(edge.count || 0));
    const minVisibleEdgeCount = edgeCounts.length ? Math.min(...edgeCounts) : 0;
    const maxVisibleEdgeCount = edgeCounts.length ? Math.max(...edgeCounts) : 0;

    const decadeNodes = nodes
      .filter((node) => node.group === "decade")
      .sort((a, b) => String(a.label).localeCompare(String(b.label)));

    const variableNodes = nodes
      .filter((node) => node.group === "variable")
      .sort((a, b) => String(a.label).localeCompare(String(b.label)));

    const shipNodes = nodes
      .filter((node) => node.group === "ship")
      .sort((a, b) => String(a.label).localeCompare(String(b.label)));

    const expandedHighlight =
      highlightNodeId === null
        ? null
        : getExpandedHighlight(visibleEdges, rawGraph.nodes, highlightNodeId);

    const connectedToHighlight =
      expandedHighlight === null ? null : expandedHighlight.nodeIds;

    const connectedEdgesToHighlight =
      expandedHighlight === null ? null : expandedHighlight.edgeIds;

    const laidOutNodes = [];

    const decadeSpacing = gravityEnabled ? 180 : 170;
    const decadeY = gravityEnabled ? -545 : -540;
    const decadeStartX = -((decadeNodes.length - 1) * decadeSpacing) / 2;

    decadeNodes.forEach((node, index) => {
      const isDimmed =
        connectedToHighlight !== null && !connectedToHighlight.has(node.id);

      laidOutNodes.push(
        getNodeVisual(
          {
            ...node,
            x: decadeStartX + index * decadeSpacing,
            y: decadeY,
            fixed: { x: true, y: true },
            physics: false,
          },
          isDimmed,
          highlightNodeId === node.id
        )
      );
    });

    const variableSpacing = gravityEnabled ? 270 : 210;
    const variableY = gravityEnabled ? -120 : -120;
    const variableStartX =
      -((variableNodes.length - 1) * variableSpacing) / 2;

    variableNodes.forEach((node, index) => {
      const isDimmed =
        connectedToHighlight !== null && !connectedToHighlight.has(node.id);

      laidOutNodes.push(
        getNodeVisual(
          {
            ...node,
            x: variableStartX + index * variableSpacing,
            y: variableY,
            fixed: gravityEnabled ? { x: false, y: true } : { x: true, y: true },
            physics: gravityEnabled,
          },
          isDimmed,
          highlightNodeId === node.id
        )
      );
    });

    const shipCols = gravityEnabled
      ? Math.max(
          5,
          Math.ceil(Math.sqrt(Math.max(shipNodes.length, 1)) * 1.15)
        )
      : Math.max(4, Math.ceil(Math.sqrt(Math.max(shipNodes.length, 1))));

    const shipSpacingX = 205;
    const shipSpacingY = 130;
    const shipBaseY = gravityEnabled ? 360 : 390;
    const shipStartX =
      -((Math.min(shipCols, shipNodes.length) - 1) * shipSpacingX) / 2;

    shipNodes.forEach((node, index) => {
      const row = Math.floor(index / shipCols);
      const col = index % shipCols;

      const isDimmed =
        connectedToHighlight !== null && !connectedToHighlight.has(node.id);

      laidOutNodes.push(
        getNodeVisual(
          {
            ...node,
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

      // No node selected:
      // keep original edge-strength colors.
      if (connectedEdgesToHighlight === null) {
        return {
          ...edge,
          width: Math.max(0.7, Number(edge.width || 1) * 0.82),
          color: {
            color: strengthColor,
            highlight: COLORS.edgeHover,
            hover: COLORS.edgeHover,
          },
        };
      }

      // Node selected:
      // selected expanded path is orange.
      // everything else is dimmed.
      const isConnected = connectedEdgesToHighlight.has(edge.id);

      return {
        ...edge,
        width: isConnected
          ? Math.max(1.4, Number(edge.width || 1) * 1.15)
          : 0.22,
        color: isConnected
          ? {
              color: COLORS.edgeHover,
              highlight: COLORS.edgeHover,
              hover: COLORS.edgeHover,
            }
          : {
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
  ]);

  const edgeLegendItems = useMemo(() => {
    return buildEdgeLegendItems(filteredGraph.maxEdgeCount);
  }, [filteredGraph.maxEdgeCount]);

  useEffect(() => {
    if (!containerRef.current) return;

    const activeOptions = gravityEnabled ? GRAVITY_OPTIONS : STATIC_OPTIONS;

    if (networkRef.current) {
      networkRef.current.destroy();
      networkRef.current = null;
    }

    const data = {
      nodes: new DataSet(filteredGraph.nodes),
      edges: new DataSet(filteredGraph.edges),
    };

    networkRef.current = new Network(containerRef.current, data, activeOptions);

    networkRef.current.on("click", (params) => {
      if (!params.nodes.length) {
        setSelectedNode(null);
        setHighlightNodeId(null);
        return;
      }

      const nodeId = params.nodes[0];
      const node = rawGraph.nodes.find((n) => n.id === nodeId) || null;

      setSelectedNode(node);
      setHighlightNodeId(nodeId);
    });

    setTimeout(() => {
      if (networkRef.current) {
        networkRef.current.redraw();
        networkRef.current.fit({
          animation: {
            duration: 350,
            easingFunction: "easeInOutQuad",
          },
        });
      }
    }, 150);

    return () => {};
  }, [filteredGraph, gravityEnabled, rawGraph.nodes]);

  function resetView() {
    setSearch("");
    setSelectedDecade("all");
    setSelectedVariable("all");
    setSelectedShip("all");
    setMinEdgeCount(1);
    setSelectedNode(null);
    setHighlightNodeId(null);
    setGravityEnabled(false);
  }

  function toggleGravity() {
    setGravityEnabled((prev) => !prev);
  }

  return (
    <div
      className={`app-shell ${
        theme === "light" ? "theme-light" : "theme-dark"
      }`}
      style={{
        display: "flex",
        flexDirection: "row",
      }}
    >
      <main
        className="graph-wrap"
        style={{
          position: "relative",
          flex: "1 1 auto",
          minWidth: 0,
        }}
      >
        <div className="topbar">
          <div>
            <strong>{formatNumber(filteredGraph.nodes.length)}</strong> nodes ·{" "}
            <strong>{formatNumber(filteredGraph.edges.length)}</strong> edges
          </div>

          <div className="topbar-right">
            <div className="muted">
              Source rows: {formatNumber(rawGraph.metadata?.total_rows)}
            </div>

            <div className="muted">
              Edge range: {formatNumber(filteredGraph.minEdgeCount)}–{" "}
              {formatNumber(filteredGraph.maxEdgeCount)}
            </div>

            <button
              className="theme-toggle"
              onClick={() =>
                setTheme((prev) => (prev === "dark" ? "light" : "dark"))
              }
            >
              {theme === "dark" ? "Light Theme" : "Dark Theme"}
            </button>
          </div>
        </div>

        <button
          type="button"
          title={legendVisible ? "Hide legend" : "Show legend"}
          onClick={() => setLegendVisible((prev) => !prev)}
          style={{
            all: "unset",
            position: "absolute",
            left: "14px",
            bottom: "10px",
            zIndex: 21,
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            width: "22px",
            height: "22px",
            borderRadius: "6px",
            border:
              theme === "light"
                ? "1px solid rgba(148, 163, 184, 0.45)"
                : "1px solid rgba(148, 163, 184, 0.32)",
            background:
              theme === "light"
                ? "rgba(255,255,255,0.78)"
                : "rgba(15, 23, 42, 0.75)",
            color: theme === "light" ? "#0f172a" : "#e5e7eb",
            fontSize: "12px",
            fontWeight: 700,
            lineHeight: "1",
            cursor: "pointer",
            boxShadow: "0 4px 10px rgba(0,0,0,0.14)",
            backdropFilter: "blur(8px)",
          }}
        >
          {legendVisible ? "×" : "i"}
        </button>

        <GraphLegendOverlay
          filteredGraph={filteredGraph}
          edgeLegendItems={edgeLegendItems}
          theme={theme}
          visible={legendVisible}
          position={legendPosition}
          setPosition={setLegendPosition}
        />

        <div
          ref={containerRef}
          className="network-container"
          style={{
            width: "100%",
            height: "calc(100vh - 52px)",
            minHeight: "900px",
            background: theme === "light" ? "#f8fafc" : "#1a2332",
          }}
        />
      </main>

      <aside
        className="sidebar"
        style={{
          width: "275px",
          minWidth: "275px",
          maxWidth: "275px",
          flex: "0 0 275px",
          order: 2,
        }}
      >
        <div className="brand">
          <h1>Ship Logs Knowledge Graph</h1>
          <p>Decades, observation variables, and ships/stations</p>
        </div>

        <div className="panel">
          <div className="panel-title">
            <SlidersHorizontal size={18} />
            Controls
          </div>

          <label>Search</label>
          <div className="search-box">
            <Search size={16} />
            <input
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setHighlightNodeId(null);
                setSelectedNode(null);
              }}
              placeholder="Search..."
            />
          </div>

          <label>Decade</label>
          <select
            value={selectedDecade}
            onChange={(e) => {
              setSelectedDecade(e.target.value);
              setHighlightNodeId(null);
              setSelectedNode(null);
            }}
          >
            <option value="all">All decades</option>
            {decades.map((decade) => (
              <option key={decade} value={decade}>
                {decade}
              </option>
            ))}
          </select>

          <label>Variable</label>
          <select
            value={selectedVariable}
            onChange={(e) => {
              setSelectedVariable(e.target.value);
              setHighlightNodeId(null);
              setSelectedNode(null);
            }}
          >
            <option value="all">All variables</option>
            {variables.map((variable) => (
              <option key={variable} value={variable}>
                {variable}
              </option>
            ))}
          </select>

          <label>Ship / station</label>
          <select
            value={selectedShip}
            onChange={(e) => {
              setSelectedShip(e.target.value);
              setHighlightNodeId(null);
              setSelectedNode(null);
            }}
          >
            <option value="all">All ships/stations</option>
            {ships.map((ship) => (
              <option key={ship} value={ship}>
                {ship}
              </option>
            ))}
          </select>

          <label>Minimum count</label>
          <select
            value={minEdgeCount}
            onChange={(e) => {
              setMinEdgeCount(Number(e.target.value));
              setHighlightNodeId(null);
              setSelectedNode(null);
            }}
          >
            <option value={1}>1+</option>
            <option value={100}>100+</option>
            <option value={1000}>1,000+</option>
            <option value={10000}>10,000+</option>
            <option value={50000}>50,000+</option>
            <option value={100000}>100,000+</option>
          </select>

          <button onClick={toggleGravity}>Toggle Physics</button>

          <button onClick={resetView}>
            <RefreshCcw size={16} />
            Reset / Fit
          </button>
        </div>

        <div className="panel">
          <div className="panel-title">Selection</div>
          {selectedNode ? (
            <div
              className="details"
              style={{
                fontSize: "12px",
                lineHeight: 1.35,
              }}
            >
              <h2
                style={{
                  margin: "0 0 10px 0",
                  fontSize: "15px",
                  fontWeight: 600,
                }}
              >
                {selectedNode.label}
              </h2>
              <p style={{ margin: "0 0 8px 0" }}>
                <strong>Type:</strong> {getDisplayType(selectedNode)}
              </p>
              <p style={{ margin: "0 0 8px 0" }}>
                <strong>Observations:</strong>{" "}
                {formatNumber(selectedNode.count)}
              </p>
              <p style={{ margin: 0 }}>
                {selectedNode.description || selectedNode.title}
              </p>
            </div>
          ) : (
            <p
              className="muted"
              style={{
                fontSize: "12px",
                lineHeight: 1.35,
                margin: 0,
              }}
            >
              Click a node to see details.
            </p>
          )}
        </div>

        {loadError && (
          <div className="panel">
            <div className="panel-title">Load Error</div>
            <p style={{ fontSize: "12px", margin: 0 }}>{loadError}</p>
          </div>
        )}
      </aside>
    </div>
  );
}

export default App;