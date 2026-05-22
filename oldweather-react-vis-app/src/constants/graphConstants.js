export const STATION_NAMES = new Set(["Adak"]);

export const EDGE_STRENGTH_COLORS = [
  "rgba(234, 179, 8, 0.55)",
  "rgba(94, 234, 212, 0.5)",
  "rgba(45, 212, 191, 0.55)",
  "rgba(56, 189, 248, 0.55)",
  "rgba(37, 99, 235, 0.6)",
  "rgba(30, 58, 138, 0.68)",
];

export const EDGE_STRENGTH_BINS = [
  { min: 1, max: 100 },
  { min: 101, max: 1000 },
  { min: 1001, max: 10000 },
  { min: 10001, max: 50000 },
  { min: 50001, max: 100000 },
  { min: 100001, max: Infinity },
];

export const COLORS = {
  decade: "#5B8FD9",
  ship: "#58C79C",
  station: "#5D8BFF",
  variableDefault: "#E45757",
  dimEdge: "rgba(180, 180, 180, 0.3)",
  dimNodeFill: "rgba(180, 180, 180, 0.18)",
  dimNodeBorder: "rgba(180, 180, 180, 0.22)",
  edgeHover: "rgba(249, 115, 22, 0.75)",
};

export const BASE_INTERACTION = {
  hover: true,
  tooltipDelay: 100,
  navigationButtons: false,
  keyboard: true,
  dragNodes: true,
  dragView: true,
  zoomView: true,
};

export const BASE_NODES = {
  borderWidth: 1.5,
  font: {
    size: 13,
    color: "#ffffff",
    strokeWidth: 3,
    strokeColor: "#0f172a",
  },
};

export const STATIC_OPTIONS = {
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

export const GRAVITY_OPTIONS = {
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