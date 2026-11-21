import maplibregl from "maplibre-gl";
import { layers, namedFlavor } from "@protomaps/basemaps";
import "maplibre-gl/dist/maplibre-gl.css";

export const display = {
  branchZoom: 14.5,
  maxZoom: 18,
  markerGap: 28,
  labelGap: 8,
};
export function overviewCamera(config) {
  const device = matchMedia("(max-width: 760px)").matches
    ? "mobile"
    : "desktop";
  return {
    center: config[`recommended_${device}_center`],
    zoom: config[`recommended_${device}_zoom_512px`],
  };
}
export function createMap(config, banks) {
  const origin = location.origin;
  const flavor = {
    ...namedFlavor("light"),
    background: "#f2efe5",
    earth: "#f2efe5",
    water: "#a4d0cd",
    park_a: "#d6e2c4",
    park_b: "#c6d8b5",
    buildings: "#dfdcd0",
    major: "#fff9df",
    highway: "#faedc9",
    minor_a: "#fffef9",
    minor_b: "#fffef9",
    roads_label_major: "#78766d",
  };
  const styleLayers = layers("hue", flavor, { lang: "vi" }).filter(
    (l) => l["source-layer"] !== "pois" && l.id !== "roads_shields",
  );
  for (const layer of styleLayers) {
    if (layer.layout?.["text-field"])
      layer.layout["text-field"] = [
        "coalesce",
        ["get", "name:vi"],
        ["get", "name"],
        "",
      ];
    if (layer.id === "water_waterway_label") layer.minzoom = 11.5;
    if (layer.id === "roads_labels_major") {
      layer.filter = [
        "any",
        layer.filter,
        ["in", "kind_detail", "tertiary", "secondary", "primary", "trunk"],
      ];
      layer.minzoom = 12.5;
    }
  }
  styleLayers.push({
    id: "banks",
    type: "symbol",
    source: "banks",
    minzoom: 11.5,
    maxzoom: 14.2,
    layout: {
      "text-field": ["upcase", ["get", "name_standard"]],
      "text-font": ["Noto Sans Medium"],
      "text-size": 15,
      "text-letter-spacing": 0.25,
      "text-allow-overlap": true,
    },
    paint: {
      "text-color": "#547669",
      "text-halo-color": "#f4f2df",
      "text-halo-width": 2,
    },
  });
  const map = new maplibregl.Map({
    container: "map",
    ...overviewCamera(config),
    maxBounds: config.exploration_max_bounds_phase1,
    maxZoom: display.maxZoom,
    attributionControl: false,
    style: {
      version: 8,
      glyphs: origin + "/base/fonts/{fontstack}/{range}.pbf",
      sprite: origin + "/base/sprites/light",
      sources: {
        hue: {
          type: "vector",
          tiles: [origin + "/base/hue/{z}/{x}/{y}.mvt"],
          bounds: [107.48, 16.35, 107.7, 16.56],
          minzoom: 10,
          maxzoom: 15,
          attribution:
            '<a href="https://www.openstreetmap.org/copyright">© OpenStreetMap contributors</a> · Protomaps',
        },
        banks: {
          type: "geojson",
          data: { type: "FeatureCollection", features: banks },
        },
      },
      layers: styleLayers,
    },
  });
  map.addControl(
    new maplibregl.AttributionControl({ compact: false }),
    "bottom-right",
  );
  map.addControl(
    new maplibregl.ScaleControl({ maxWidth: 80, unit: "metric" }),
    "bottom-left",
  );
  return map;
}
