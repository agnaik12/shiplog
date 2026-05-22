import React, { useEffect, useMemo, useRef, useState } from "react";
import { DataSet, Network } from "vis-network/standalone";
import "vis-network/styles/vis-network.css";

import {
  GRAVITY_OPTIONS,
  STATIC_OPTIONS,
} from "./constants/graphConstants";

import { buildEdgeLegendItems } from "./utils/graphUtils";
import { useGraphData } from "./hooks/useGraphData";
import { useFilteredGraph } from "./hooks/useFilteredGraph";

import TopBar from "./components/TopBar";
import Sidebar from "./components/Sidebar";
import GraphLegendOverlay from "./components/GraphLegendOverlay";

function App() {
  const containerRef = useRef(null);
  const networkRef = useRef(null);

  const { rawGraph, loadError } = useGraphData();

  const [selectedNode, setSelectedNode] = useState(null);
  const [highlightNodeId, setHighlightNodeId] = useState(null);

  const [search, setSearch] = useState("");
  const [selectedDecade, setSelectedDecade] = useState("all");
  const [selectedVariable, setSelectedVariable] = useState("all");
  const [selectedShip, setSelectedShip] = useState("all");
  const [minEdgeCount, setMinEdgeCount] = useState(1);
  const [gravityEnabled, setGravityEnabled] = useState(false);
  const [theme, setTheme] = useState("dark");
  const [legendVisible, setLegendVisible] = useState(true);
  const [legendPosition, setLegendPosition] = useState({ x: 18, y: null });

  const [layoutMode, setLayoutMode] = useState("year-variable-ship");

  // New: when set, the top row changes from decades to individual years.
  const [drillDecade, setDrillDecade] = useState(null);

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

  const filteredGraph = useFilteredGraph({
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
  });

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
        clearSelection();
        return;
      }

      const nodeId = params.nodes[0];

      const node =
        filteredGraph.nodes.find((n) => n.id === nodeId) ||
        rawGraph.nodes.find((n) => n.id === nodeId) ||
        null;

      if (!node) {
        clearSelection();
        return;
      }

      // New behavior:
      // Clicking a decade drills into individual years.
      // Clicking a year behaves like normal selection/highlight.
      if (
        node.group === "decade" &&
        node.levelType !== "year" &&
        !drillDecade
      ) {
        setDrillDecade(node.label);
        setSelectedNode(null);
        setHighlightNodeId(null);
        return;
      }

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
  }, [filteredGraph, gravityEnabled, rawGraph.nodes, drillDecade]);

  function clearSelection() {
    setSelectedNode(null);
    setHighlightNodeId(null);
  }

  function resetView() {
    setSearch("");
    setSelectedDecade("all");
    setSelectedVariable("all");
    setSelectedShip("all");
    setMinEdgeCount(1);
    setSelectedNode(null);
    setHighlightNodeId(null);
    setGravityEnabled(false);
    setLayoutMode("year-variable-ship");
    setDrillDecade(null);
  }

  function toggleGravity() {
    setGravityEnabled((prev) => !prev);
  }

  function handleSetSelectedDecade(value) {
    setSelectedDecade(value);
    setDrillDecade(null);
    clearSelection();
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
        <TopBar
          filteredGraph={filteredGraph}
          rawGraph={rawGraph}
          theme={theme}
          setTheme={setTheme}
        />

        {drillDecade && (
          <button
            type="button"
            onClick={() => {
              setDrillDecade(null);
              clearSelection();
            }}
            style={{
              position: "absolute",
              top: "62px",
              left: "16px",
              zIndex: 22,
              border: "1px solid rgba(148, 163, 184, 0.35)",
              borderRadius: "10px",
              padding: "7px 10px",
              background:
                theme === "light"
                  ? "rgba(255,255,255,0.9)"
                  : "rgba(15, 23, 42, 0.85)",
              color: theme === "light" ? "#0f172a" : "#e5e7eb",
              fontSize: "12px",
              fontWeight: 700,
              cursor: "pointer",
              boxShadow: "0 6px 16px rgba(0,0,0,0.18)",
              backdropFilter: "blur(8px)",
            }}
          >
            ← Back to decades: {drillDecade}
          </button>
        )}

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

      <Sidebar
        search={search}
        setSearch={setSearch}
        decades={decades}
        variables={variables}
        ships={ships}
        selectedDecade={selectedDecade}
        setSelectedDecade={handleSetSelectedDecade}
        selectedVariable={selectedVariable}
        setSelectedVariable={setSelectedVariable}
        selectedShip={selectedShip}
        setSelectedShip={setSelectedShip}
        minEdgeCount={minEdgeCount}
        setMinEdgeCount={setMinEdgeCount}
        selectedNode={selectedNode}
        resetView={resetView}
        toggleGravity={toggleGravity}
        loadError={loadError}
        clearSelection={clearSelection}
        layoutMode={layoutMode}
        setLayoutMode={(value) => {
          setLayoutMode(value);
          clearSelection();
        }}
      />
    </div>
  );
}

export default App;