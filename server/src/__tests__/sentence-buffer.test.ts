import { describe, it, expect } from "vitest";
import { createSentenceBuffer } from "../services/chat/sentence-buffer.js";

describe("createSentenceBuffer", () => {
  it("emits a sentence once a boundary + whitespace arrives", () => {
    const buf = createSentenceBuffer();
    // Arrange / Act
    const first = buf.push("Hello there friend. ");
    // Assert
    expect(first).toEqual(["Hello there friend."]);
  });

  it("does not emit until the boundary is followed by whitespace", () => {
    const buf = createSentenceBuffer();
    expect(buf.push("This is a complete thought.")).toEqual([]); // no trailing ws yet
    expect(buf.push(" And more.")).toEqual(["This is a complete thought."]);
  });

  it("reassembles a sentence split across multiple deltas", () => {
    const buf = createSentenceBuffer();
    expect(buf.push("How ")).toEqual([]);
    expect(buf.push("are you ")).toEqual([]);
    expect(buf.push("doing today? ")).toEqual(["How are you doing today?"]);
  });

  it("emits multiple sentences from one delta", () => {
    const buf = createSentenceBuffer();
    const out = buf.push("I hear you completely. That sounds really hard. ");
    expect(out).toEqual(["I hear you completely.", "That sounds really hard."]);
  });

  it("merges a short leading fragment (abbreviation) into the next sentence", () => {
    const buf = createSentenceBuffer();
    // "Dr." is below minChars, so it merges forward rather than splitting.
    const out = buf.push("Dr. Alvarez said you are doing great. ");
    expect(out).toEqual(["Dr. Alvarez said you are doing great."]);
  });

  it("does not split a decimal number mid-sentence", () => {
    const buf = createSentenceBuffer();
    const out = buf.push("The result was 3.14 which is correct. ");
    expect(out).toEqual(["The result was 3.14 which is correct."]);
  });

  it("flush() returns the trailing sentence with no boundary", () => {
    const buf = createSentenceBuffer();
    expect(buf.push("A full sentence here. ")).toEqual(["A full sentence here."]);
    buf.push("Trailing thought without punctuation");
    expect(buf.flush()).toBe("Trailing thought without punctuation");
  });

  it("flush() clears the buffer", () => {
    const buf = createSentenceBuffer();
    buf.push("Leftover text");
    expect(buf.flush()).toBe("Leftover text");
    expect(buf.flush()).toBe("");
  });

  it("handles question and exclamation boundaries", () => {
    const buf = createSentenceBuffer();
    const out = buf.push("Are you okay tonight? I am here for you! ");
    expect(out).toEqual(["Are you okay tonight?", "I am here for you!"]);
  });
});
