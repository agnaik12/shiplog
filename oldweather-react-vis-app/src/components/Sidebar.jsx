import { Search, RefreshCcw, SlidersHorizontal } from "lucide-react";
import { formatNumber, getDisplayType } from "../utils/graphUtils";

function Sidebar({
  search,
  setSearch,
  decades,
  variables,
  ships,
  selectedDecade,
  setSelectedDecade,
  selectedVariable,
  setSelectedVariable,
  selectedShip,
  setSelectedShip,
  minEdgeCount,
  setMinEdgeCount,
  selectedNode,
  resetView,
  toggleGravity,
  loadError,
  clearSelection,
  layoutMode,
  setLayoutMode,
}) {
  return (
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
              clearSelection();
            }}
            placeholder="Search..."
          />
        </div>

        <label>Decade</label>
        <select
          value={selectedDecade}
          onChange={(e) => {
            setSelectedDecade(e.target.value);
            clearSelection();
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
            clearSelection();
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
            clearSelection();
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
            clearSelection();
          }}
        >
          <option value={1}>1+</option>
          <option value={100}>100+</option>
          <option value={1000}>1,000+</option>
          <option value={10000}>10,000+</option>
          <option value={50000}>50,000+</option>
          <option value={100000}>100,000+</option>
        </select>

        <label>Connection layout</label>
        <select
          value={layoutMode}
          onChange={(e) => {
            setLayoutMode(e.target.value);
            clearSelection();
          }}
        >
          <option value="year-variable-ship">Years → Variables → Ships</option>
          <option value="year-ship-variable">Years → Ships → Variables</option>
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
              <strong>Observations:</strong> {formatNumber(selectedNode.count)}
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
  );
}

export default Sidebar;