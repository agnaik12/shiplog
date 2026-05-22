import { formatNumber } from "../utils/graphUtils";

function TopBar({ filteredGraph, rawGraph, theme, setTheme }) {
  return (
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
  );
}

export default TopBar;