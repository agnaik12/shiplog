import React, { useEffect, useMemo, useRef, useState } from "react";
import { DataSet, Network } from "vis-network/standalone";
import "vis-network/styles/vis-network.css";
import { Search, RefreshCcw, SlidersHorizontal } from "lucide-react";

const STATION_NAMES = new Set(["Adak"]);

const COLORS = {
  decade: "#5B8FD9",
  ship: "#58C79C",
  station: "#5D8BFF",
  variableDefault: "#E45757",
  dimEdge: "rgba(180, 180, 180, 0.3)",
  dimNodeFill: "rgba(180, 180, 180, 0.18)",
  dimNodeBorder: "rgba(180, 180, 180, 0.22)",
};

const BASE_INTERACTION = {
  hover: true,
  tooltipDelay: 100,
  navigationButtons: true,
  keyboard: true,
  dragNodes: true,
  dragView: true,
  zoomView: true,
};

const BASE_NODES = {
  borderWidth: 1,
  font: {
    size: 12,
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
    solver: "barnesHut",
    barnesHut: {
      gravitationalConstant: -420,
      centralGravity: 0.012,
      springLength: 220,
      springConstant: 0.012,
      damping: 0.9,
      avoidOverlap: 1,
    },
    stabilization: {
      enabled: true,
      iterations: 120,
      fit: true,
    },
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

  if (typeof node.color === "string") {
    return node.color;
  }

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
    return Math.max(8, baseSize * 0.38);
  }

  if (node.group === "variable") {
    return Math.max(9, baseSize * 0.38);
  }

  return Math.max(7, baseSize * 0.32);
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
    borderWidth: isSelected ? 2 : 1,
    font: {
      size: 12,
      color: "#ffffff",
      strokeWidth: 3,
      strokeColor: "#0f172a",
    },
  };
}

function getConnectedNodeIds(edges, nodeId) {
  const connected = new Set([nodeId]);

  edges.forEach((edge) => {
    if (edge.from === nodeId) connected.add(edge.to);
    if (edge.to === nodeId) connected.add(edge.from);
  });

  return connected;
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
    const nodeById = new Map(rawGraph.nodes.map((node) => [node.id, node]));

    let triples = rawGraph.triples || [];

    triples = triples.filter((triple) => Number(triple.count || 0) >= Number(minEdgeCount || 1));

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

    const nodeIds = new Set();
    const decadeVariableCounts = new Map();
    const variableShipCounts = new Map();

    triples.forEach((triple) => {
      nodeIds.add(triple.decadeId);
      nodeIds.add(triple.variableId);
      nodeIds.add(triple.shipId);

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

    let nodes = rawGraph.nodes.filter((node) => nodeIds.has(node.id));

    const edges = [];

    decadeVariableCounts.forEach((count, key) => {
      const [decadeId, variableId] = key.split("__");
      const variableNode = nodeById.get(variableId);
      const variableColor = getRawColor(variableNode) || COLORS.variableDefault;

      edges.push({
        id: `edge_${decadeId}_${variableId}`,
        from: decadeId,
        to: variableId,
        edgeType: "decade-variable",
        count,
        width: Math.max(0.3, Math.log10(count + 1) * 0.55),
        color: variableColor,
        title: `${formatNumber(count)} observations`,
      });
    });

    variableShipCounts.forEach((count, key) => {
      const [variableId, shipId] = key.split("__");
      const variableNode = nodeById.get(variableId);
      const variableColor = getRawColor(variableNode) || COLORS.variableDefault;

      edges.push({
        id: `edge_${variableId}_${shipId}`,
        from: variableId,
        to: shipId,
        edgeType: "variable-ship",
        count,
        width: Math.max(0.3, Math.log10(count + 1) * 0.55),
        color: variableColor,
        title: `${formatNumber(count)} observations`,
      });
    });

    const decadeNodes = nodes
      .filter((node) => node.group === "decade")
      .sort((a, b) => String(a.label).localeCompare(String(b.label)));

    const variableNodes = nodes
      .filter((node) => node.group === "variable")
      .sort((a, b) => String(a.label).localeCompare(String(b.label)));

    const shipNodes = nodes
      .filter((node) => node.group === "ship")
      .sort((a, b) => String(a.label).localeCompare(String(b.label)));

    const connectedToHighlight =
      highlightNodeId === null
        ? null
        : getConnectedNodeIds(edges, highlightNodeId);

    const laidOutNodes = [];

    const decadeSpacing = 170;
    const decadeY = -540;
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

    const variableSpacing = 210;
    const variableY = -120;
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
            fixed: gravityEnabled ? false : { x: true, y: true },
            physics: gravityEnabled,
          },
          isDimmed,
          highlightNodeId === node.id
        )
      );
    });

    const shipCols = Math.max(
      4,
      Math.ceil(Math.sqrt(Math.max(shipNodes.length, 1)))
    );

    const shipSpacingX = 210;
    const shipSpacingY = 190;
    const shipBaseY = 390;
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
            fixed: gravityEnabled ? false : { x: true, y: true },
            physics: gravityEnabled,
          },
          isDimmed,
          highlightNodeId === node.id
        )
      );
    });

    const decoratedEdges = edges.map((edge) => {
      const isConnected =
        highlightNodeId === null ||
        edge.from === highlightNodeId ||
        edge.to === highlightNodeId;

      return {
        ...edge,
        width: isConnected ? Math.max(0.3, Number(edge.width || 1) * 0.45) : 0.2,
        color: isConnected
          ? edge.color || "#9aa7bd"
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
    <div className={`app-shell ${theme === "light" ? "theme-light" : "theme-dark"}`}>
      <aside className="sidebar">
        <div className="brand">
          {/* <h1>Old Weather Knowledge Graph</h1> */}
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
              placeholder="Search ship, variable, decade..."
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

          <button onClick={toggleGravity}>
            {gravityEnabled ? "Physics Off" : "Physics On"}
          </button>

          <button onClick={resetView}>
            <RefreshCcw size={16} />
            Reset / Fit
          </button>
        </div>

        <div className="panel">
          <div className="panel-title">Legend</div>
          <div className="legend-row">
            <span className="legend-box decade" /> Decade
          </div>
          <div className="legend-row">
            <span className="legend-diamond variable" /> Variable
          </div>
          <div className="legend-row">
            <span
              className="legend-dot ship"
              style={{ background: COLORS.ship }}
            />{" "}
            Ship
          </div>
          <div className="legend-row">
            <span
              className="legend-dot station"
              style={{ background: COLORS.station }}
            />{" "}
            Station
          </div>
        </div>

        <div className="panel">
          <div className="panel-title">Selection</div>
          {selectedNode ? (
            <div className="details">
              <h2>{selectedNode.label}</h2>
              <p>
                <strong>Type:</strong> {getDisplayType(selectedNode)}
              </p>
              <p>
                <strong>Observations:</strong>{" "}
                {formatNumber(selectedNode.count)}
              </p>
              <p>{selectedNode.description || selectedNode.title}</p>
            </div>
          ) : (
            <p className="muted">Click a node to see details.</p>
          )}
        </div>

        {loadError && (
          <div className="panel">
            <div className="panel-title">Load Error</div>
            <p>{loadError}</p>
          </div>
        )}
      </aside>

      <main className="graph-wrap">
        <div className="topbar">
          <div>
            <strong>{formatNumber(filteredGraph.nodes.length)}</strong> nodes ·{" "}
            <strong>{formatNumber(filteredGraph.edges.length)}</strong> edges
          </div>

          <div className="topbar-right">
            <div className="muted">
              Source rows: {formatNumber(rawGraph.metadata?.total_rows)}
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
    </div>
  );
}

export default App;