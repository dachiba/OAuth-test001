type Client = { client_id: string; redirect_uris: string[] };

let clients: Client[] = [];

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
