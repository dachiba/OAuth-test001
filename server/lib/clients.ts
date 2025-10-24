type Client = { client_id: string; redirect_uris: string[] };

let clients: Client[] = [];
let allowedOrigins: string[] | null = null;

export function loadClients() {
  if (!clients.length) {
    const raw = process.env.CLIENTS_JSON || "[]";
    clients = JSON.parse(raw);
  }
  return clients;
}

export function findClient(client_id: string) {
  return loadClients().find(c => c.client_id === client_id) || null;
}

export function validateRedirect(client_id: string, redirect_uri: string) {
  const c = findClient(client_id);
  if (!c) return false;
  return c.redirect_uris.includes(redirect_uri);
}

export function getAllowedOrigins() {
  if (allowedOrigins) return allowedOrigins;
  const origins = new Set<string>();
  const baseUrl = process.env.SERVER_BASE_URL;
  if (baseUrl) {
    try {
      origins.add(new URL(baseUrl).origin);
    } catch {
      // ignore malformed base URL entries
    }
  }

  for (const client of loadClients()) {
    for (const redirect of client.redirect_uris) {
      try {
        origins.add(new URL(redirect).origin);
      } catch {
        // skip invalid redirect URIs
      }
    }
  }

  allowedOrigins = Array.from(origins);
  return allowedOrigins;
}

export function isOriginAllowed(origin: string | null) {
  if (!origin) return false;
  return getAllowedOrigins().includes(origin);
}
