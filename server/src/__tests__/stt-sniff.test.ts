import { describe, expect, it } from "vitest";

import { sniffAudioFormat } from "../services/voice/stt.js";

function bytes(...parts: (string | number[])[]): Buffer {
  return Buffer.concat(
    parts.map((p) => (typeof p === "string" ? Buffer.from(p, "ascii") : Buffer.from(p))),
  );
}

// The client can't label a raw binary WS frame, so the utterance container is sniffed
// from magic bytes before Whisper (which picks its decoder from the filename).
describe("sniffAudioFormat", () => {
  it("detects WAV (RIFF/WAVE)", () => {
    const b = bytes("RIFF", [0, 0, 0, 0], "WAVEfmt ");
    expect(sniffAudioFormat(b)).toEqual({ mimeType: "audio/wav", filename: "audio.wav" });
  });

  it("detects m4a/mp4 (ftyp at offset 4)", () => {
    const b = bytes([0, 0, 0, 24], "ftypM4A ", [0, 0, 0, 0]);
    expect(sniffAudioFormat(b)).toEqual({ mimeType: "audio/mp4", filename: "audio.m4a" });
  });

  it("detects Core Audio (caff)", () => {
    const b = bytes("caff", [0, 1, 0, 0], [0, 0, 0, 0]);
    expect(sniffAudioFormat(b)).toEqual({ mimeType: "audio/x-caf", filename: "audio.caf" });
  });

  it("detects Ogg", () => {
    const b = bytes("OggS", [0, 0, 0, 0], [0, 0, 0, 0]);
    expect(sniffAudioFormat(b)).toEqual({ mimeType: "audio/ogg", filename: "audio.ogg" });
  });

  it("detects WebM (EBML)", () => {
    const b = bytes([0x1a, 0x45, 0xdf, 0xa3], [0, 0, 0, 0], [0, 0, 0, 0]);
    expect(sniffAudioFormat(b)).toEqual({ mimeType: "audio/webm", filename: "audio.webm" });
  });

  it("detects MP3 (ID3 and frame-sync)", () => {
    expect(sniffAudioFormat(bytes("ID3", [3, 0, 0, 0, 0, 0, 0, 0, 0])).mimeType).toBe("audio/mpeg");
    expect(sniffAudioFormat(bytes([0xff, 0xfb, 0x90, 0x00], [0, 0, 0, 0, 0, 0, 0, 0])).mimeType).toBe("audio/mpeg");
  });

  it("falls back to WAV for unknown bytes (least-wrong for iOS captures)", () => {
    expect(sniffAudioFormat(bytes([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]))).toEqual({
      mimeType: "audio/wav",
      filename: "audio.wav",
    });
  });
});
