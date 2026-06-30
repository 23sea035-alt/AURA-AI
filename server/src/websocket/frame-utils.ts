import type { WebSocket } from "ws";

export function sendJsonFrame(ws: WebSocket, payload: Record<string, unknown>): void {
  if (ws.readyState === 1 /* OPEN */) ws.send(JSON.stringify(payload));
}

export function sendBinaryFrame(ws: WebSocket, index: number, audio: Buffer): void {
  if (ws.readyState !== 1 /* OPEN */) return;
  const frame = Buffer.allocUnsafe(4 + audio.length);
  frame.writeUInt32BE(index, 0);
  audio.copy(frame, 4);
  ws.send(frame);
}
