import { createServer } from "node:http";
import { randomUUID } from "node:crypto";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { IncomingMessage } from "node:http";

type LogEntry = {
  id: string;
  locationId: string;
  message: string;
  timestamp: string;
};

const port = Number(process.env.PORT ?? 7071);
const storagePath = join(dirname(fileURLToPath(import.meta.url)), "..", ".data", "location-log.json");

async function ensureStorageFile(): Promise<void> {
  await mkdir(dirname(storagePath), { recursive: true });
  try {
    await readFile(storagePath, "utf-8");
  } catch {
    await writeFile(storagePath, "[]", "utf-8");
  }
}

async function readEntries(): Promise<LogEntry[]> {
  await ensureStorageFile();
  const contents = await readFile(storagePath, "utf-8");
  return JSON.parse(contents) as LogEntry[];
}

async function saveEntries(entries: LogEntry[]): Promise<void> {
  await ensureStorageFile();
  await writeFile(storagePath, JSON.stringify(entries, null, 2), "utf-8");
}

async function readRequestBody(request: IncomingMessage): Promise<unknown> {
  const chunks: string[] = [];

  request.setEncoding("utf8");

  for await (const chunk of request) {
    chunks.push(String(chunk));
  }

  const text = chunks.join("");
  return text ? JSON.parse(text) : {};
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store"
    }
  });
}

const server = createServer(async (req, res) => {
  try {
    const url = new URL(req.url ?? "/", `http://${req.headers.host ?? "127.0.0.1"}`);

    if (req.method === "GET" && url.pathname === "/") {
      res.writeHead(200, { "content-type": "text/plain; charset=utf-8" });
      res.end("Volcano API is running. Try /api/GetLog");
      return;
    }

    if (req.method === "GET" && url.pathname === "/api/GetLog") {
      const entries = await readEntries();
      const response = jsonResponse({ entries, count: entries.length });
      res.writeHead(response.status, Object.fromEntries(response.headers.entries()));
      res.end(await response.text());
      return;
    }

    if (req.method === "POST" && url.pathname === "/api/ResetLog") {
      await saveEntries([]);
      const response = jsonResponse({ ok: true, message: "Log cleared." });
      res.writeHead(response.status, Object.fromEntries(response.headers.entries()));
      res.end(await response.text());
      return;
    }

    if (req.method === "POST" && url.pathname === "/api/LogLocation") {
      const body = (await readRequestBody(req)) as { LocationID?: string; Message?: string; locationId?: string; message?: string };
      const locationId = (body.LocationID ?? body.locationId ?? "").trim();
      const message = (body.Message ?? body.message ?? "").trim();

      if (!locationId || !message) {
        const response = jsonResponse({ error: "LocationID and Message are required." }, 400);
        res.writeHead(response.status, Object.fromEntries(response.headers.entries()));
        res.end(await response.text());
        return;
      }

      const entries = await readEntries();
      const entry: LogEntry = {
        id: randomUUID(),
        locationId,
        message,
        timestamp: new Date().toISOString()
      };

      entries.push(entry);
      await saveEntries(entries);

      const response = jsonResponse({ ok: true, entry }, 201);
      res.writeHead(response.status, Object.fromEntries(response.headers.entries()));
      res.end(await response.text());
      return;
    }

    const response = jsonResponse({ error: "Not found" }, 404);
    res.writeHead(response.status, Object.fromEntries(response.headers.entries()));
    res.end(await response.text());
  } catch (error) {
    const response = jsonResponse({ error: "Server error", details: error instanceof Error ? error.message : String(error) }, 500);
    res.writeHead(response.status, Object.fromEntries(response.headers.entries()));
    res.end(await response.text());
  }
});

server.listen(port, "127.0.0.1", () => {
  console.log(`Volcano API listening on http://127.0.0.1:${port}`);
});