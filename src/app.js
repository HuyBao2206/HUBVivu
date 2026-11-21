import "@fontsource/be-vietnam-pro/latin-400.css";
import "@fontsource/be-vietnam-pro/vietnamese-400.css";
import "@fontsource/be-vietnam-pro/latin-600.css";
import "@fontsource/be-vietnam-pro/vietnamese-600.css";
import "@fontsource/lora/latin-600.css";
import "@fontsource/lora/vietnamese-600.css";
import "@fontsource/lora/latin-500-italic.css";
import "@fontsource/lora/vietnamese-500-italic.css";
import maplibregl from "maplibre-gl";
import { createMap, overviewCamera, display } from "./map";
import { icons } from "./icons";
import "./style.css";

const $ = (s) => document.querySelector(s);
const element = (tag, cls, text) => {
  const el = document.createElement(tag);
  el.className = cls;
  if (text) el.textContent = text;
  return el;
};
const icon = (name) => {
  const el = element("span", "icon");
  el.innerHTML = icons[name];
  return el;
};
document
  .querySelectorAll("[data-icon]")
  .forEach((el) => el.append(icon(el.dataset.icon)));
const banks = {
  bo_bac: "Bờ Bắc",
  bo_nam: "Bờ Nam",
  giua_song: "Giữa sông",
  noi_hai_bo: "Nối hai bờ",
};
const types = {
  ca_phe: "Cà phê",
  tra_sua: "Trà sữa",
  quan_an: "Quán ăn",
  landmark: "Địa danh",
};
const looks = {
  "dai-noi": ["castle", "gold", "Di sản"],
  "cho-dong-ba": ["store", "coral", "Chợ truyền thống"],
  "cau-truong-tien": ["route", "blue", "Cầu"],
  "con-hen": ["trees", "green", "Cảnh quan"],
  "chua-thien-mu": ["landmark", "gold", "Di tích"],
  "vincom-plaza": ["shopping-bag", "plum", "Mua sắm"],
  "ga-hue": ["train-front", "blue", "Nhà ga"],
  "quoc-hoc": ["school", "coral", "Trường học"],
  "cung-an-dinh": ["landmark", "gold", "Di tích"],
  ca_phe: ["coffee", "gold"],
  tra_sua: ["cup-soda", "plum"],
  quan_an: ["utensils", "coral"],
};
function appearance(r) {
  return (
    looks[r.id.replace("hue-z1-lm-", "")] ||
    looks[r.category_l1] || ["map-pin", "green"]
  );
}
const folded = (value) =>
  value
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replaceAll("đ", "d")
    .trim();
const json = async (path) => {
  const res = await fetch("/data/" + path);
  if (!res.ok) throw Error(path);
  return res.json();
};
async function start() {
  const [overview, geo, branches] = await Promise.all(
    [
      "hue-zoom1-overview.json",
      "hue-zoom1-ready.geojson",
      "hue-zoom2-branches.json",
    ].map(json),
  );
  const anchors = geo.features.filter((f) => f.properties.is_proposed_anchor);
  const verified = new Map(
    geo.features.map((f) => [f.id, f.geometry.coordinates]),
  );
  const places = overview.records
    .filter((r) => !r.id.match(/-base-|-lbl-|-rej-/))
    .map((r) => ({
      ...r,
      coordinates: verified.get(r.id) || null,
      category_l1: "landmark",
    }));
  const rank = Object.keys(looks).map((k) => "hue-z1-lm-" + k);
  places.sort(
    (a, b) =>
      (rank.includes(a.id) ? rank.indexOf(a.id) : 99) -
      (rank.includes(b.id) ? rank.indexOf(b.id) : 99),
  );
  places.push(...branches.records);
  const map = createMap(overview.viewport_config, anchors);
  let view = "explore",
    selected = null,
    matches = [],
    markers = [],
    saved;
  try {
    saved = new Set(JSON.parse(localStorage.getItem("hue-saved") || "[]"));
  } catch {
    saved = new Set();
  }
  function item(r) {
    const [glyph, color, kind] = appearance(r);
    const btn = element("button", "row " + color);
    const tile = element("span", "tile");
    tile.append(icon(glyph));
    const body = element("span", "rowText");
    body.append(
      element("strong", "", r.name_standard),
      element(
        "small",
        "",
        [kind || types[r.category_l1], banks[r.riverbank]]
          .filter(Boolean)
          .join("  ·  "),
      ),
    );
    btn.append(tile, body, icon("chevron-right"));
    btn.dataset.id = r.id;
    btn.onclick = () => openPlace(r, true);
    return btn;
  }
  function switchView(next) {
    view = next;
    document.body.dataset.view = view;
    for (const name of ["explore", "directory", "saved"])
      $("#" + name).classList.toggle("active", name === view);
    close();
    render();
  }
  function close() {
    selected = null;
    $("#detail").hidden = true;
  }
  function openPlace(r, focus = false, group = []) {
    if (matchMedia("(max-width:760px)").matches && view !== "explore")
      switchView("explore");
    selected = r;
    if (focus && r.coordinates)
      map.easeTo({
        center: r.coordinates,
        zoom: Math.max(
          map.getZoom(),
          r.category_l1 === "landmark" ? 14 : display.branchZoom + 0.3,
        ),
        duration: 450,
      });
    const box = $("#detail"),
      [glyph, color, kind] = appearance(r);
    box.replaceChildren();
    box.hidden = false;
    const head = element("div", "detailHead " + color);
    const tile = element("span", "tile");
    tile.append(icon(glyph));
    const title = element("div", "");
    title.append(
      element("small", "", kind || types[r.category_l1]),
      element("h2", "", r.name_standard),
    );
    const x = element("button", "close");
    x.append(icon("x"));
    x.ariaLabel = "Đóng thông tin";
    x.onclick = close;
    head.append(tile, title, x);
    box.append(head);
    const addr = element("p", "address");
    addr.append(
      icon("map-pin"),
      document.createTextNode(
        r.address_or_location || banks[r.riverbank] || "Chưa có địa chỉ",
      ),
    );
    box.append(addr);
    if (!r.coordinates)
      box.append(
        element("small", "note", "Chưa xác minh vị trí ghim trên bản đồ."),
      );
    if (r.verification_status === "xac_minh_thong_tin_toa_do_toa_nha")
      box.append(
        element(
          "small",
          "note",
          "Ghim ở tâm tòa nhà. Xem địa chỉ để tìm chi nhánh.",
        ),
      );
    if (r.operating_status && r.operating_status !== "dang_hoat_dong")
      box.append(element("small", "note", "Thông tin hoạt động cần xác minh."));
    for (const branch of group) box.append(item(branch));
    const save = element(
      "button",
      "save",
      saved.has(r.id) ? "Đã lưu địa điểm" : "Lưu địa điểm",
    );
    save.prepend(icon("bookmark"));
    save.onclick = () => {
      if (saved.has(r.id)) saved.delete(r.id);
      else saved.add(r.id);
      localStorage.setItem("hue-saved", JSON.stringify([...saved]));
      render();
      openPlace(r, false, group);
    };
    box.append(save);
    if (
      r.google_maps_entitled === true &&
      /^https:\/\/(www\.google\.com\/maps\/|maps\.app\.goo\.gl\/)/.test(
        r.google_maps_url,
      )
    ) {
      const a = element("a", "save", "Google Maps");
      a.href = r.google_maps_url;
      a.target = "_blank";
      a.rel = "noopener";
      box.append(a);
    }
  }
  function drawMarkers() {
    markers.forEach((m) => m.remove());
    markers = [];
    const near = map.getZoom() >= display.branchZoom;
    $("#tier").textContent = near ? "Bản đồ chi tiết" : "Bản đồ tổng quan";
    const groups = new Map();
    for (const r of matches) {
      if (
        !r.coordinates ||
        r.verification_status?.startsWith("tam_hoan") ||
        (r.category_l1 !== "landmark" && !near)
      )
        continue;
      const key = r.coordinates.join(",");
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(r);
    }
    const occupied = [],
      labels = [];
    const inView = map.getBounds();
    const points = [...groups.values()].map((g) =>
      map.project(g[0].coordinates),
    );
    for (const group of groups.values()) {
      const r = group[0];
      if (!inView.contains(r.coordinates)) continue;
      const p = map.project(r.coordinates);
      if (occupied.some((q) => p.dist(q) < display.markerGap)) continue;
      occupied.push(p);
      const [glyph, color] = appearance(r);
      const el = element("button", "marker " + color);
      const branches = group.filter((b) => b.category_l1 !== "landmark");
      const hub = branches.length > 1 || (branches.length && group.length > 1);
      const building =
        hub &&
        places.find(
          (place) =>
            place.category_l1 === "landmark" &&
            String(place.coordinates) === String(r.coordinates),
        );
      const name = hub
        ? building?.name_standard || "Cụm " + branches.length + " chi nhánh"
        : r.name_standard.replace(
            "Trường THPT chuyên Quốc Học – Huế",
            "Quốc Học Huế",
          );
      el.ariaLabel = name;
      el.title = name;
      el.dataset.id = r.id;
      el.append(icon(glyph));
      const label = element("span", "pinLabel", name);
      // Keep the glyph at its measured position. Suppress colliding captions first.
      const width = Math.min(155, name.length * 7 + 12),
        rect = { x: p.x - width / 2, y: p.y + 20, w: width, h: 22 };
      if (
        !points.some(
          (q) =>
            q !== p &&
            q.y > rect.y - 13 &&
            q.y < rect.y + rect.h + 13 &&
            q.x > rect.x - 13 &&
            q.x < rect.x + rect.w + 13,
        ) &&
        !labels.some(
          (a) =>
            Math.abs(a.y - rect.y) < rect.h &&
            rect.x < a.x + a.w + display.labelGap &&
            a.x < rect.x + rect.w + display.labelGap,
        )
      ) {
        el.append(label);
        labels.push(rect);
      }
      if (hub) el.append(element("b", "bubble", String(branches.length)));
      el.onclick = () => openPlace(building || r, false, hub ? branches : []);
      markers.push(
        new maplibregl.Marker({ element: el })
          .setLngLat(r.coordinates)
          .addTo(map),
      );
    }
  }
  function render() {
    const query = folded($("#query").value);
    matches = places.filter(
      (r) =>
        (view !== "saved" || saved.has(r.id)) &&
        (!$("#bank").value || r.riverbank === $("#bank").value) &&
        (!$("#category").value || r.category_l1 === $("#category").value) &&
        folded([r.name_standard, ...(r.alt_names || [])].join(" ")).includes(
          query,
        ),
    );
    $("#count").textContent = matches.length;
    $(".listHead h2").textContent =
      view === "saved"
        ? "Địa điểm đã lưu"
        : query || $("#bank").value || $("#category").value
          ? "Kết quả tìm kiếm"
          : "Địa điểm khám phá";
    $("#list").replaceChildren(...matches.map(item));
    if (!matches.length)
      $("#list").append(
        element(
          "p",
          "empty",
          view === "saved"
            ? "Chưa có địa điểm đã lưu phù hợp."
            : "Không tìm thấy địa điểm phù hợp.",
        ),
      );
    drawMarkers();
  }
  function filter() {
    close();
    if (matchMedia("(max-width:760px)").matches && view === "explore")
      switchView("directory");
    else render();
  }
  $("#query").oninput = filter;
  $("#bank").onchange = filter;
  $("#category").onchange = filter;
  for (const id of ["explore", "directory", "saved"])
    $("#" + id).onclick = () => {
      switchView(id);
      if (id === "directory") $("#list .row")?.focus({ preventScroll: true });
    };
  $("#plus").onclick = () => map.zoomIn();
  $("#minus").onclick = () => map.zoomOut();
  $("#home").onclick = () => {
    close();
    map.easeTo({
      ...overviewCamera(overview.viewport_config),
      bearing: 0,
      pitch: 0,
    });
  };
  map.on("moveend", drawMarkers);
  map.on("resize", drawMarkers);
  map.on("load", drawMarkers);
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") close();
  });
  switchView("explore");
}
start().catch((e) => {
  $("#list").textContent = "Không tải được bản đồ. Hãy tải lại trang.";
  console.error(e);
});
