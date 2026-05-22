import { useRef } from "react";
import { COLORS, EDGE_STRENGTH_COLORS } from "../constants/graphConstants";
import { formatNumber } from "../utils/graphUtils";

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
    width: "260px",
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
              background:
                "linear-gradient(to right, rgb(59,130,246), rgb(148,163,184), rgb(34,197,94))",
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
          marginBottom: "10px",
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
          <strong style={{ fontSize: "11px" }}>Ship node color</strong>
          <span style={{ opacity: 0.65, fontSize: "10px" }}>
            observations
          </span>
        </div>

        <div
          style={{
            height: "10px",
            borderRadius: "999px",
            marginBottom: "5px",
            border: "1px solid rgba(148, 163, 184, 0.28)",
            background:
              "linear-gradient(to right, rgb(59,130,246), rgb(148,163,184), rgb(34,197,94))",
          }}
        />

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr 1fr",
            fontSize: "10px",
            opacity: 0.75,
          }}
        >
          <span>{formatNumber(filteredGraph.minShipCount)}</span>
          <span style={{ textAlign: "center" }}>mid</span>
          <span style={{ textAlign: "right" }}>
            {formatNumber(filteredGraph.maxShipCount)}
          </span>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr 1fr",
            fontSize: "10px",
            opacity: 0.65,
            marginTop: "2px",
          }}
        >
          <span>low</span>
          <span style={{ textAlign: "center" }}>medium</span>
          <span style={{ textAlign: "right" }}>high</span>
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
                background: `linear-gradient(to right, ${EDGE_STRENGTH_COLORS.join(
                  ", "
                )})`,
              }}
            />
            <span>Active path</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default GraphLegendOverlay;