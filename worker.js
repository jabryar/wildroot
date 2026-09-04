const CODE_PATTERN = /^[A-Z0-9]{6}$/;
const TOKEN_PATTERN = /^[a-f0-9]{48,128}$/i;
const VISITOR_TOKEN_PATTERN = /^[a-f0-9]{32,128}$/i;
const MAX_SNAPSHOT_BYTES = 850_000;
const ONLINE_WINDOW_MS = 20_000;
const VISITOR_ONLINE_WINDOW_MS = 15_000;
const MAX_ACTIVE_VISITORS = 400;
const DEFAULT_VISITOR_REFRESH_INTERVAL_MS = 5_000;
const MIN_VISITOR_REFRESH_INTERVAL_MS = 500;
const MAX_VISITOR_REFRESH_INTERVAL_MS = 10_000;
const VISITOR_REFRESH_INTERVAL_STEP_MS = 500;

function json(data, status = 200) {
  if (status === 204) {
    return new Response(null, {
      status,
      headers: {
        "access-control-allow-origin": "*",
        "access-control-allow-methods": "GET, POST, PUT, DELETE, OPTIONS",
        "access-control-allow-headers": "content-type"
      }
    });
  }
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
      "access-control-allow-origin": "*",
      "access-control-allow-methods": "GET, POST, PUT, DELETE, OPTIONS",
      "access-control-allow-headers": "content-type"
    }
  });
}

function normaliseCode(value) {
  const code = String(value || "").trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
  return CODE_PATTERN.test(code) ? code : null;
}

async function hashToken(token) {
  const bytes = new TextEncoder().encode(token);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(digest)].map(value => value.toString(16).padStart(2, "0")).join("");
}

function validSnapshot(snapshot) {
  if (!snapshot || typeof snapshot !== "object" || Array.isArray(snapshot)) return false;
  const encoded = JSON.stringify(snapshot);
  return encoded.length > 2 && encoded.length <= MAX_SNAPSHOT_BYTES;
}

function normaliseVisitorRefreshInterval(value) {
  const requested = Number(value);
  const interval = Number.isFinite(requested) ? requested : DEFAULT_VISITOR_REFRESH_INTERVAL_MS;
  const steps = Math.round((interval - MIN_VISITOR_REFRESH_INTERVAL_MS) / VISITOR_REFRESH_INTERVAL_STEP_MS);
  return Math.max(
    MIN_VISITOR_REFRESH_INTERVAL_MS,
    Math.min(MAX_VISITOR_REFRESH_INTERVAL_MS, MIN_VISITOR_REFRESH_INTERVAL_MS + steps * VISITOR_REFRESH_INTERVAL_STEP_MS)
  );
}

export class VillageSnapshot {
  constructor(state) {
    this.storage = state.storage;
  }

  async getActiveVisitors() {
    const stored = await this.storage.get("visitors");
    if (!stored || typeof stored !== "object" || Array.isArray(stored)) return {};

    const now = Date.now();
    const active = {};
    let changed = false;
    for (const [visitorToken, rawLastSeen] of Object.entries(stored)) {
      const savedVisitor = rawLastSeen && typeof rawLastSeen === "object" && !Array.isArray(rawLastSeen) ? rawLastSeen : null;
      const lastSeen = Number(savedVisitor?.lastSeen ?? rawLastSeen);
      const refreshIntervalMs = normaliseVisitorRefreshInterval(savedVisitor?.refreshIntervalMs);
      const valid = VISITOR_TOKEN_PATTERN.test(visitorToken)
        && Number.isFinite(lastSeen)
        && lastSeen <= now + VISITOR_ONLINE_WINDOW_MS
        && now - lastSeen <= VISITOR_ONLINE_WINDOW_MS
        && Object.keys(active).length < MAX_ACTIVE_VISITORS;
      if (!valid) {
        changed = true;
        continue;
      }
      active[visitorToken] = { lastSeen, refreshIntervalMs };
      if (!savedVisitor || Number(savedVisitor.lastSeen) !== lastSeen || Number(savedVisitor.refreshIntervalMs) !== refreshIntervalMs) changed = true;
    }

    if (changed) {
      if (Object.keys(active).length) await this.storage.put("visitors", active);
      else await this.storage.delete("visitors");
    }
    return active;
  }

  visitorSummary(visitors) {
    const active = Object.values(visitors);
    const publishIntervalMs = active.length
      ? Math.min(...active.map(visitor => normaliseVisitorRefreshInterval(visitor.refreshIntervalMs)))
      : DEFAULT_VISITOR_REFRESH_INTERVAL_MS;
    return { visitors: active.length, publishIntervalMs };
  }

  async fetchVisitorPresence(request, record) {
    const visitors = await this.getActiveVisitors();
    if (request.method === "POST") {
      if (!record) return json({ error: "Village not found." }, 404);
      const body = await request.json().catch(() => null);
      const visitorToken = String(body?.visitorToken || "");
      if (!VISITOR_TOKEN_PATTERN.test(visitorToken)) return json({ error: "Invalid visitor session." }, 400);
      if (!visitors[visitorToken] && Object.keys(visitors).length >= MAX_ACTIVE_VISITORS) {
        return json({ error: "This village has reached its visitor limit." }, 429);
      }
      visitors[visitorToken] = {
        lastSeen: Date.now(),
        refreshIntervalMs: normaliseVisitorRefreshInterval(body?.refreshIntervalMs)
      };
      await this.storage.put("visitors", visitors);
      return json({ ok: true, ...this.visitorSummary(visitors) });
    }

    if (request.method === "DELETE") {
      const body = await request.json().catch(() => null);
      const visitorToken = String(body?.visitorToken || "");
      if (!VISITOR_TOKEN_PATTERN.test(visitorToken)) return json({ error: "Invalid visitor session." }, 400);
      delete visitors[visitorToken];
      if (Object.keys(visitors).length) await this.storage.put("visitors", visitors);
      else await this.storage.delete("visitors");
      return json({ ok: true, ...this.visitorSummary(visitors) });
    }

    return json({ error: "Method not allowed." }, 405);
  }

  async fetch(request) {
    if (request.method === "OPTIONS") return json({ ok: true }, 204);
    const record = await this.storage.get("village");
    const url = new URL(request.url);
    if (url.pathname.endsWith("/visitors")) return this.fetchVisitorPresence(request, record);

    if (request.method === "GET") {
      if (!record) return json({ error: "Village not found." }, 404);
      const visitors = await this.getActiveVisitors();
      return json({
        village: record.snapshot,
        updatedAt: record.updatedAt,
        online: Date.now() - record.updatedAt <= ONLINE_WINDOW_MS,
        ...this.visitorSummary(visitors)
      });
    }

    if (request.method === "DELETE") {
      const body = await request.json().catch(() => null);
      if (!record) return json({ ok: true });
      if (!body || !TOKEN_PATTERN.test(String(body.ownerToken || "")) || await hashToken(body.ownerToken) !== record.ownerHash) {
        return json({ error: "Only the village owner can stop sharing." }, 403);
      }
      await Promise.all([this.storage.delete("village"), this.storage.delete("visitors")]);
      return json({ ok: true });
    }

    if (request.method !== "PUT") return json({ error: "Method not allowed." }, 405);
    const body = await request.json().catch(() => null);
    const ownerToken = String(body?.ownerToken || "");
    if (!TOKEN_PATTERN.test(ownerToken) || !validSnapshot(body?.snapshot)) {
      return json({ error: "Invalid village snapshot." }, 400);
    }
    const ownerHash = await hashToken(ownerToken);
    if (record && ownerHash !== record.ownerHash) {
      return json({ error: "This village code is already owned. Try a new code." }, 409);
    }
    const updatedAt = Date.now();
    await this.storage.put("village", { ownerHash, snapshot: body.snapshot, updatedAt });
    const visitors = await this.getActiveVisitors();
    return json({ ok: true, updatedAt, ...this.visitorSummary(visitors) });
  }
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === "/api/villages" && request.method === "OPTIONS") return json({ ok: true }, 204);
    if (url.pathname.startsWith("/api/villages/")) {
      const pathParts = url.pathname.slice("/api/villages/".length).split("/").filter(Boolean);
      const [rawCode, endpoint] = pathParts;
      if (pathParts.length > 2 || (endpoint && endpoint !== "visitors")) return json({ error: "Village endpoint not found." }, 404);
      const code = normaliseCode(decodeURIComponent(rawCode || ""));
      if (!code) return json({ error: "Enter a six-character village code." }, 400);
      const id = env.VILLAGE_SNAPSHOTS.idFromName(code);
      return env.VILLAGE_SNAPSHOTS.get(id).fetch(request);
    }
    return env.ASSETS.fetch(request);
  }
};
