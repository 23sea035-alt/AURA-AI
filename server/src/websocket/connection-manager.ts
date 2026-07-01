import type { WebSocket } from "ws";

// Tracks live WS connections keyed by userId → companionId → WebSocket.
// One connection per (user, companion) pair; opening a new one terminates the old.
export class ConnectionManager {
  private readonly connections = new Map<string, Map<string, WebSocket>>();

  add(userId: string, companionId: string, ws: WebSocket): void {
    let byCompanion = this.connections.get(userId);
    if (!byCompanion) {
      byCompanion = new Map();
      this.connections.set(userId, byCompanion);
    }
    const existing = byCompanion.get(companionId);
    if (existing && existing.readyState === 1 /* OPEN */) {
      existing.close(4000, "replaced by new connection");
    }
    byCompanion.set(companionId, ws);
  }

  remove(userId: string, companionId: string): void {
    const byCompanion = this.connections.get(userId);
    if (!byCompanion) return;
    byCompanion.delete(companionId);
    if (byCompanion.size === 0) this.connections.delete(userId);
  }

  get(userId: string, companionId: string): WebSocket | undefined {
    return this.connections.get(userId)?.get(companionId);
  }

  isConnected(userId: string, companionId: string): boolean {
    const ws = this.get(userId, companionId);
    return ws !== undefined && ws.readyState === 1 /* OPEN */;
  }

  size(): number {
    let total = 0;
    for (const m of this.connections.values()) total += m.size;
    return total;
  }
}

export const connectionManager = new ConnectionManager();
