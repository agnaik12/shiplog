import { useEffect, useState } from "react";

export function useGraphData() {
  const [rawGraph, setRawGraph] = useState({
    nodes: [],
    edges: [],
    triples: [],
    metadata: {},
  });

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

  return {
    rawGraph,
    loadError,
  };
}