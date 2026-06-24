import "./styles.css";

type LogEntry = {
  id: string;
  locationId: string;
  message: string;
  timestamp: string;
};

type Station = {
  id: string;
  locationId: string;
  name: string;
  position: { left: string; top: string };
};

type LogResponse = {
  entries: LogEntry[];
  count: number;
};

const stations: Station[] = [
  { id: "A", locationId: "A", name: "North Ridge", position: { left: "20%", top: "20%" } },
  { id: "B", locationId: "B", name: "East Crater", position: { left: "77%", top: "30%" } },
  { id: "C", locationId: "C", name: "South Camp", position: { left: "54%", top: "79%" } },
  { id: "D", locationId: "D", name: "West Peak", position: { left: "10%", top: "62%" } },
  { id: "E", locationId: "E", name: "Sky Radar", position: { left: "50%", top: "12%" } },
  { id: "F", locationId: "F", name: "Enid Camp", position: { left: "30%", top: "35%" } }
];

const apiBaseUrl = (import.meta.env.VITE_API_BASE_URL as string | undefined)?.replace(/\/$/, "") ?? "/api";

function buildEndpoint(path: string): string {
  return `${apiBaseUrl}/${path}`.replace(/\/+/g, "/").replace("http:/", "http://").replace("https:/", "https://");
}

function formatTimestamp(timestamp: string): string {
  return new Intl.DateTimeFormat(undefined, {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit"
  }).format(new Date(timestamp));
}

const root = document.getElementById("root");

if (!root) {
  throw new Error("Missing root element.");
}

root.innerHTML = `
  <main class="app-shell">
    <section class="hero-card">
      <div class="hero-copy">
        <p class="eyebrow">Volcano Lesson</p>
        <h1>Outpost comms dashboard</h1>
        <p class="lede">Red outlines mean silence. Green outlines mean that outpost has checked in through the API.</p>
        <div class="hero-meta">
          <span id="status-label">Syncing signal feed</span>
          <span id="refresh-label">Waiting for first sync</span>
        </div>
        <p class="error-banner" id="error-banner" hidden></p>
      </div>
      <div class="stats-panel">
        <div>
          <strong id="reporting-count">0</strong>
          <span>Outposts reporting</span>
        </div>
        <div>
          <strong id="entry-count">0</strong>
          <span>Total log entries</span>
        </div>
        <div>
          <strong>5s</strong>
          <span>Poll interval</span>
        </div>
      </div>
    </section>

    <section class="map-card">
      <div class="map-header">
        <p>Volcano perimeter monitor</p>
        <span id="reporting-summary">0 of ${stations.length} outposts reporting</span>
      </div>
      <div class="scene" aria-label="Volcano map with outpost markers">
        <svg viewBox="0 0 960 620" class="volcano-illustration" role="img" aria-hidden="true">
          <defs>
            <linearGradient id="sky" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stop-color="#1a0f0c" />
              <stop offset="100%" stop-color="#070707" />
            </linearGradient>
            <linearGradient id="lava" x1="0" x2="1">
              <stop offset="0%" stop-color="#ffb347" />
              <stop offset="100%" stop-color="#ff5f3d" />
            </linearGradient>
            <radialGradient id="glow" cx="50%" cy="45%" r="45%">
              <stop offset="0%" stop-color="#ffdf99" stop-opacity="0.85" />
              <stop offset="55%" stop-color="#ff8c42" stop-opacity="0.35" />
              <stop offset="100%" stop-color="#ff3d1d" stop-opacity="0" />
            </radialGradient>
          </defs>
          <rect width="960" height="620" fill="url(#sky)" />
          <ellipse cx="480" cy="470" rx="340" ry="130" fill="#1b120f" opacity="0.95" />
          <ellipse cx="480" cy="390" rx="210" ry="78" fill="url(#glow)" />
          <path d="M430 120 C420 160 395 200 360 245 C315 303 280 375 250 435 L710 435 C682 370 647 303 602 245 C567 200 542 160 532 120 Z" fill="#2f211d" />
          <path d="M438 145 C430 176 410 210 385 240 L585 240 C560 210 540 176 532 145 Z" fill="#ff8a3d" opacity="0.92" />
          <path d="M388 245 L315 440 L420 440 L440 310 Z" fill="#3e2a25" />
          <path d="M582 245 L520 310 L540 440 L645 440 Z" fill="#452f28" />
          <path d="M420 305 L395 440 L565 440 L530 305 Z" fill="#56382f" />
          <path d="M457 208 C450 214 444 225 442 236 C461 242 479 242 498 236 C494 225 488 214 481 208 Z" fill="#f3c46d" opacity="0.9" />
          <path d="M455 190 C444 188 432 192 425 200 C439 208 448 214 458 221 C456 211 456 200 455 190 Z" fill="#ff6b3d" opacity="0.75" />
          <path d="M502 190 C513 188 525 192 532 200 C518 208 509 214 499 221 C501 211 501 200 502 190 Z" fill="#ff6b3d" opacity="0.75" />
          <path d="M480 152 C468 170 459 183 453 199 C467 202 493 202 507 199 C501 183 492 170 480 152 Z" fill="url(#lava)" />
          <path d="M443 95 C452 76 468 64 480 58 C492 64 508 76 517 95 C506 98 490 101 480 101 C470 101 454 98 443 95 Z" fill="#ffcf7d" opacity="0.95" />
          <path d="M480 44 C461 50 449 66 443 82 C458 84 470 88 480 95 C490 88 502 84 517 82 C511 66 499 50 480 44 Z" fill="#ffb347" opacity="0.8" />
          <path d="M230 503 C328 470 388 455 480 455 C576 455 635 468 730 503" fill="none" stroke="#5e4339" stroke-width="18" stroke-linecap="round" />
          <path d="M254 520 C346 492 401 480 480 480 C561 480 615 490 708 520" fill="none" stroke="#7c584c" stroke-width="8" stroke-linecap="round" opacity="0.8" />
        </svg>
      </div>
    </section>

    <section class="log-card">
      <div class="log-card__header">
        <h2>Recent log entries</h2>
        <span id="log-summary">No reports yet</span>
      </div>
      <div class="log-list" id="log-list"></div>
    </section>
  </main>
`;

const statusLabel = root.querySelector("#status-label") as HTMLSpanElement;
const refreshLabel = root.querySelector("#refresh-label") as HTMLSpanElement;
const errorBanner = root.querySelector("#error-banner") as HTMLParagraphElement;
const reportingCount = root.querySelector("#reporting-count") as HTMLElement;
const entryCount = root.querySelector("#entry-count") as HTMLElement;
const reportingSummary = root.querySelector("#reporting-summary") as HTMLSpanElement;
const logSummary = root.querySelector("#log-summary") as HTMLSpanElement;
const logList = root.querySelector("#log-list") as HTMLDivElement;
const scene = root.querySelector(".scene") as HTMLDivElement;

function renderMarkers(activeLocations: Map<string, LogEntry>): void {
  scene.querySelectorAll(".outpost-marker").forEach((marker) => marker.remove());

  for (const station of stations) {
    const logEntry = activeLocations.get(station.locationId.toLowerCase());
    const active = Boolean(logEntry);
    const marker = document.createElement("div");
    marker.className = `outpost-marker ${active ? "outpost-marker--active" : "outpost-marker--offline"}`;
    marker.style.left = station.position.left;
    marker.style.top = station.position.top;
    marker.setAttribute("aria-label", `${station.name} ${active ? "online" : "offline"}`);
    marker.innerHTML = `
      <span class="outpost-marker__pulse"></span>
      <span class="outpost-marker__ring"></span>
      <span class="outpost-marker__dot"></span>
      <span class="outpost-marker__label">${station.name}</span>
      ${logEntry ? `<span class="outpost-marker__detail">${logEntry.message}</span>` : ""}
    `;
    scene.appendChild(marker);
  }
}

function renderEntries(entries: LogEntry[]): void {
  logList.innerHTML = "";

  if (entries.length === 0) {
    logSummary.textContent = "No reports yet";
    const empty = document.createElement("p");
    empty.className = "empty-state";
    empty.textContent = "No outpost has reported in yet.";
    logList.appendChild(empty);
    return;
  }

  logSummary.textContent = `${entries.length} entries`;

  for (const entry of [...entries].reverse()) {
    const article = document.createElement("article");
    article.className = "log-item";
    article.innerHTML = `
      <div>
        <h3>${entry.locationId}</h3>
        <p>${entry.message}</p>
      </div>
      <time dateTime="${entry.timestamp}">${formatTimestamp(entry.timestamp)}</time>
    `;
    logList.appendChild(article);
  }
}

async function loadLog(): Promise<void> {
  try {
    const response = await fetch(buildEndpoint("GetLog"), { cache: "no-store" });

    if (!response.ok) {
      throw new Error(`Request failed with status ${response.status}`);
    }

    const payload = (await response.json()) as LogResponse;
    const entries = payload.entries ?? [];
    const latestByLocation = new Map<string, LogEntry>();

    for (const entry of entries) {
      const key = entry.locationId.trim().toLowerCase();
      if (!key) {
        continue;
      }

      const existing = latestByLocation.get(key);
      if (!existing || new Date(entry.timestamp).getTime() >= new Date(existing.timestamp).getTime()) {
        latestByLocation.set(key, entry);
      }
    }

    statusLabel.textContent = "Live signal feed";
    refreshLabel.textContent = `Last refresh ${formatTimestamp(new Date().toISOString())}`;
    errorBanner.hidden = true;
    reportingCount.textContent = String(latestByLocation.size);
    entryCount.textContent = String(entries.length);
    reportingSummary.textContent = `${latestByLocation.size} of ${stations.length} outposts reporting`;

    renderMarkers(latestByLocation);
    renderEntries(entries);
  } catch (error) {
    statusLabel.textContent = "Feed interrupted";
    errorBanner.hidden = false;
    errorBanner.textContent = error instanceof Error ? error.message : String(error);
  }
}

void loadLog();
window.setInterval(() => {
  void loadLog();
}, 5000);