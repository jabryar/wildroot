const CODE_PATTERN = /^[A-Z0-9]{6}$/;
const TOKEN_PATTERN = /^[a-f0-9]{48,128}$/i;
const MAX_SNAPSHOT_BYTES = 850_000;
const ONLINE_WINDOW_MS = 20_000;

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

export class VillageSnapshot {
  constructor(state) {
    this.storage = state.storage;
  }

  async fetch(request) {
    if (request.method === "OPTIONS") return json({ ok: true }, 204);
    const record = await this.storage.get("village");

    if (request.method === "GET") {
      if (!record) return json({ error: "Village not found." }, 404);
      return json({
        village: record.snapshot,
        updatedAt: record.updatedAt,
        online: Date.now() - record.updatedAt <= ONLINE_WINDOW_MS
      });
    }

    if (request.method === "DELETE") {
      const body = await request.json().catch(() => null);
      if (!record) return json({ ok: true });
      if (!body || !TOKEN_PATTERN.test(String(body.ownerToken || "")) || await hashToken(body.ownerToken) !== record.ownerHash) {
        return json({ error: "Only the village owner can stop sharing." }, 403);
      }
      await this.storage.delete("village");
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
    return json({ ok: true, updatedAt });
  }
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === "/api/villages" && request.method === "OPTIONS") return json({ ok: true }, 204);
    if (url.pathname.startsWith("/api/villages/")) {
      const code = normaliseCode(decodeURIComponent(url.pathname.slice("/api/villages/".length)));
      if (!code) return json({ error: "Enter a six-character village code." }, 400);
      const id = env.VILLAGE_SNAPSHOTS.idFromName(code);
      return env.VILLAGE_SNAPSHOTS.get(id).fetch(request);
    }
    return env.ASSETS.fetch(request);
  }
};
