// Google Maps uses 256px world tiles. The existing camera presets use 512px.
import { overviewCamera, display } from "./map";

async function loadMaps(key) {
  if (window.google?.maps?.importLibrary) return window.google.maps;
  await new Promise((resolve, reject) => {
    const script = document.createElement("script");
    const timer = setTimeout(() => reject(Error("Google Maps timeout")), 15000);
    window.hueMapsReady = () => {
      clearTimeout(timer);
      resolve();
    };
    script.onerror = () => {
      clearTimeout(timer);
      reject(Error("Google Maps unavailable"));
    };
    script.src =
      "https://maps.googleapis.com/maps/api/js?" +
      new URLSearchParams({
        key,
        callback: "hueMapsReady",
        loading: "async",
        v: "weekly",
        language: "vi",
        region: "VN",
      });
    document.head.append(script);
  });
  return window.google.maps;
}

const hueStyle = [
  { elementType: "geometry", stylers: [{ color: "#f1e5cd" }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#675341" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#fbf4df" }] },
  {
    featureType: "water",
    elementType: "geometry",
    stylers: [{ color: "#98bdb2" }],
  },
  { featureType: "landscape.natural", stylers: [{ color: "#cad0b3" }] },
  {
    featureType: "road",
    elementType: "geometry.fill",
    stylers: [{ color: "#fff6df" }],
  },
  {
    featureType: "road.arterial",
    elementType: "geometry.stroke",
    stylers: [{ color: "#c5a265" }],
  },
  {
    featureType: "poi",
    elementType: "labels",
    stylers: [{ visibility: "off" }],
  },
  {
    featureType: "transit",
    elementType: "labels.icon",
    stylers: [{ visibility: "off" }],
  },
];
const fields = [
  "id",
  "displayName",
  "formattedAddress",
  "location",
  "types",
  "attributions",
];
const searches = {
  ca_phe: "cà phê",
  tra_sua: "trà sữa",
  quan_an: "quán ăn",
  quan_nuoc: "quán đồ uống",
};
function record(place) {
  const kinds = place.types || [];
  const name = place.displayName || "";
  let category = "quan_an";
  if (/trà sữa|bubble tea|milk tea/i.test(name)) category = "tra_sua";
  else if (kinds.some((k) => ["cafe", "coffee_shop"].includes(k)))
    category = "ca_phe";
  else if (kinds.some((k) => ["tea_house", "juice_shop", "bar"].includes(k)))
    category = "quan_nuoc";
  return {
    id: "google:" + place.id,
    name_standard: name,
    category_l1: category,
    address_or_location: place.formattedAddress,
    coordinates: [place.location.lng(), place.location.lat()],
    attributions: place.attributions || [],
    minZoom: 0,
  };
}

export async function createGoogle(config, key) {
  const maps = await loadMaps(key);
  const [{ Map: GoogleMap }, { Place }] = await Promise.all([
    maps.importLibrary("maps"),
    maps.importLibrary("places"),
  ]);
  const [west, south, east, north] = config.exploration_max_bounds_phase1;
  const bounds = { west, south, east, north };
  const camera = overviewCamera(config);
  const latLng = ([lng, lat]) => ({ lat, lng });
  const gm = new GoogleMap(document.querySelector("#map"), {
    center: latLng(camera.center),
    zoom: camera.zoom + 1,
    maxZoom: display.maxZoom + 1,
    restriction: { latLngBounds: bounds, strictBounds: true },
    styles: hueStyle,
    mapTypeId: "roadmap",
    disableDefaultUI: true,
    clickableIcons: false,
    gestureHandling: "greedy",
    isFractionalZoomEnabled: true,
  });
  class Pin extends maps.OverlayView {
    constructor(el, coords) {
      super();
      this.el = el;
      this.position = new maps.LatLng(latLng(coords));
      this.setMap(gm);
    }
    onAdd() {
      this.getPanes().overlayMouseTarget.append(this.el);
      maps.OverlayView.preventMapHitsAndGesturesFrom(this.el);
    }
    draw() {
      const p = this.getProjection().fromLatLngToDivPixel(this.position);
      this.el.style.left = p.x + "px";
      this.el.style.top = p.y + "px";
    }
    onRemove() {
      this.el.remove();
    }
    remove() {
      this.setMap(null);
    }
  }
  const map = {
    getZoom: () => gm.getZoom() - 1,
    getBounds: () => ({
      contains: (coords) => gm.getBounds()?.contains(latLng(coords)),
    }),
    project: (coords) => {
      const projection = gm.getProjection();
      if (!projection) return { x: 0, y: 0, dist: () => 0 };
      const p = projection.fromLatLngToPoint(new maps.LatLng(latLng(coords)));
      const scale = 2 ** gm.getZoom(),
        x = p.x * scale,
        y = p.y * scale;
      return { x, y, dist: (q) => Math.hypot(x - q.x, y - q.y) };
    },
    easeTo: ({ center, zoom }) => {
      gm.setZoom(zoom + 1);
      gm.panTo(latLng(center));
    },
    zoomIn: () => gm.setZoom(gm.getZoom() + 1),
    zoomOut: () => gm.setZoom(gm.getZoom() - 1),
    marker: (el, coords) => new Pin(el, coords),
    on: (event, fn) => {
      if (event === "moveend") gm.addListener("idle", fn);
    },
  };
  const inHue = (p) =>
    p.location &&
    p.location.lng() >= west &&
    p.location.lng() <= east &&
    p.location.lat() >= south &&
    p.location.lat() <= north;
  const foodType = (t) =>
    t === "food" ||
    /restaurant$|cafe$|coffee_shop$|tea_house$|bar$|bakery$|juice_shop$|meal_takeaway$|ice_cream_shop$|dessert_shop$/.test(
      t,
    );
  return {
    map,
    async search(query, category) {
      const textQuery =
        [query, searches[category]].filter(Boolean).join(" ") ||
        "quán ăn và cà phê";
      const { places } = await Place.searchByText({
        textQuery: textQuery + " ở Huế",
        fields,
        locationRestriction: bounds,
        language: "vi",
        region: "vn",
        maxResultCount: 20,
      });
      return places
        .filter((p) => inHue(p) && p.types?.some(foodType))
        .map(record);
    },
    async byId(id) {
      const place = new Place({ id: id.slice(7) });
      await place.fetchFields({ fields });
      return inHue(place) ? record(place) : null;
    },
  };
}
