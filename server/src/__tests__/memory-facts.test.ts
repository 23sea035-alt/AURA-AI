import { describe, it, expect, vi } from "vitest";

vi.mock("../db/src/index.js", () => ({
  db: {},
  memoriesTable: {},
  memoryJobsTable: {},
}));

import { extractFacts } from "../services/memory.js";

describe("extractFacts", () => {
  it("extracts preference fact from 'I like' pattern", () => {
    const facts = extractFacts("I like hiking in the mountains");
    expect(facts).toHaveLength(1);
    expect(facts[0].category).toBe("preference");
    expect(facts[0].content).toContain("hiking");
    expect(facts[0].importance).toBe(0.6);
  });

  it("extracts multiple facts from one message", () => {
    const facts = extractFacts("I love cooking. My name is Alex.");
    expect(facts.length).toBeGreaterThanOrEqual(2);
    const identity = facts.find((f) => f.category === "identity");
    const preference = facts.find((f) => f.category === "preference");
    expect(identity).toBeDefined();
    expect(preference).toBeDefined();
    expect(identity!.importance).toBe(0.9);
  });

  it("extracts attribute from 'my X is' pattern (stores attribute name, not value)", () => {
    const facts = extractFacts("my birthday is tomorrow");
    expect(facts).toHaveLength(1);
    expect(facts[0].category).toBe("attribute");
    expect(facts[0].content).toBe("birthday");
  });

  it("extracts relationship from 'I have a X named' pattern via preference overlap", () => {
    const facts = extractFacts("I have a cat named Whiskers");
    expect(facts.length).toBeGreaterThanOrEqual(1);
    const fact = facts.find((f) => f.content.includes("cat named Whiskers"));
    expect(fact).toBeDefined();
  });

  it("extracts work fact from 'I work at' pattern", () => {
    const facts = extractFacts("I work at Google");
    expect(facts).toHaveLength(1);
    expect(facts[0].category).toBe("work");
  });

  it("extracts location fact from 'I live in' pattern", () => {
    const facts = extractFacts("I live in Seattle");
    expect(facts).toHaveLength(1);
    expect(facts[0].category).toBe("location");
  });

  it("extracts identity from 'my name is' pattern", () => {
    const facts = extractFacts("my name is Sarah");
    const identity = facts.find((f) => f.category === "identity");
    expect(identity).toBeDefined();
    expect(identity!.content).toBe("Sarah");
    expect(identity!.importance).toBe(0.9);
  });

  it("returns empty array for text with no facts", () => {
    const facts = extractFacts("How are you today?");
    expect(facts).toEqual([]);
  });

  it("skips very short fact content", () => {
    const facts = extractFacts("I am ok");
    expect(facts).toHaveLength(0);
  });

  it("handles empty string", () => {
    const facts = extractFacts("");
    expect(facts).toEqual([]);
  });

  it("extracts preference with multiple conjunctions", () => {
    const facts = extractFacts("I enjoy reading books and watching movies");
    const reading = facts.find((f) => f.content.includes("reading"));
    expect(reading).toBeDefined();
    expect(reading!.category).toBe("preference");
  });

  it("extracts fact from 'I am from' location", () => {
    const facts = extractFacts("I am from New York");
    const location = facts.find((f) => f.category === "location");
    expect(location).toBeDefined();
    expect(location!.content).toBe("New York");
  });

  it("extracts work from 'I work at' pattern", () => {
    const facts = extractFacts("I work at Stripe");
    expect(facts).toHaveLength(1);
    expect(facts[0].category).toBe("work");
  });

  it("extracts work from 'I volunteer for' pattern", () => {
    const facts = extractFacts("I volunteer for Red Cross");
    expect(facts).toHaveLength(1);
    expect(facts[0].category).toBe("work");
  });
});
