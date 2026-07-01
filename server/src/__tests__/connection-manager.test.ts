import { describe, it, expect, vi, beforeEach } from "vitest";
import type { WebSocket } from "ws";

// In-memory test double for WebSocket
function fakeWs(readyState: number = 1): WebSocket {
  return { readyState, close: vi.fn() } as unknown as WebSocket;
}

describe("ConnectionManager", () => {
  let manager: import("../websocket/connection-manager.js").ConnectionManager;

  beforeEach(async () => {
    // Fresh import each test to get a clean singleton
    vi.resetModules();
    const mod = await import("../websocket/connection-manager.js");
    manager = mod.connectionManager;
  });

  describe("add + get", () => {
    it("stores and retrieves a socket", () => {
      const ws = fakeWs();
      manager.add("user1", "comp1", ws);
      expect(manager.get("user1", "comp1")).toBe(ws);
    });

    it("returns undefined for non-existent key", () => {
      expect(manager.get("nobody", "nothing")).toBeUndefined();
    });
  });

  describe("add duplicate key", () => {
    it("closes the old socket with code 4000 and stores the new one", () => {
      const oldWs = fakeWs();
      const newWs = fakeWs();
      manager.add("user1", "comp1", oldWs);
      manager.add("user1", "comp1", newWs);
      expect(oldWs.close).toHaveBeenCalledWith(4000, "replaced by new connection");
      expect(manager.get("user1", "comp1")).toBe(newWs);
    });

    it("does NOT close old socket if it is already closed", () => {
      const oldWs = fakeWs(3 /* CLOSED */);
      const newWs = fakeWs();
      manager.add("user1", "comp1", oldWs);
      manager.add("user1", "comp1", newWs);
      expect(oldWs.close).not.toHaveBeenCalled();
      expect(manager.get("user1", "comp1")).toBe(newWs);
    });
  });

  describe("remove", () => {
    it("removes an existing connection", () => {
      const ws = fakeWs();
      manager.add("user1", "comp1", ws);
      manager.remove("user1", "comp1");
      expect(manager.get("user1", "comp1")).toBeUndefined();
    });

    it("does not throw when removing non-existent connection", () => {
      expect(() => manager.remove("nobody", "nothing")).not.toThrow();
    });

    it("removes the user entry when last companion is removed", () => {
      const ws = fakeWs();
      manager.add("user1", "comp1", ws);
      manager.remove("user1", "comp1");
      // Internal map should have no entry for user1
      expect(manager.get("user1", "comp1")).toBeUndefined();
    });

    it("preserves other companions for the same user", () => {
      const ws1 = fakeWs();
      const ws2 = fakeWs();
      manager.add("user1", "comp1", ws1);
      manager.add("user1", "comp2", ws2);
      manager.remove("user1", "comp1");
      expect(manager.get("user1", "comp1")).toBeUndefined();
      expect(manager.get("user1", "comp2")).toBe(ws2);
    });
  });

  describe("isConnected", () => {
    it("returns true for readyState === 1", () => {
      manager.add("user1", "comp1", fakeWs(1));
      expect(manager.isConnected("user1", "comp1")).toBe(true);
    });

    it("returns false for other readyStates", () => {
      manager.add("user1", "comp1", fakeWs(0)); // CONNECTING
      expect(manager.isConnected("user1", "comp1")).toBe(false);
      manager.remove("user1", "comp1");
      manager.add("user1", "comp1", fakeWs(2)); // CLOSING
      expect(manager.isConnected("user1", "comp1")).toBe(false);
      manager.remove("user1", "comp1");
      manager.add("user1", "comp1", fakeWs(3)); // CLOSED
      expect(manager.isConnected("user1", "comp1")).toBe(false);
    });

    it("returns false for missing entry", () => {
      expect(manager.isConnected("nobody", "nothing")).toBe(false);
    });
  });

  describe("size", () => {
    it("returns 0 with no connections", () => {
      expect(manager.size()).toBe(0);
    });

    it("counts total connections across all users", () => {
      manager.add("user1", "comp1", fakeWs());
      manager.add("user1", "comp2", fakeWs());
      manager.add("user2", "comp3", fakeWs());
      expect(manager.size()).toBe(3);
    });

    it("decrements after removal", () => {
      manager.add("user1", "comp1", fakeWs());
      manager.add("user1", "comp2", fakeWs());
      manager.remove("user1", "comp1");
      expect(manager.size()).toBe(1);
    });
  });
});
