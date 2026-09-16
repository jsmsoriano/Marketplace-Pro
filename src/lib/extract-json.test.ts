import { describe, expect, it } from "vitest";
import { clampMatchScore, extractJsonObject } from "./extract-json";

describe("extractJsonObject", () => {
  it("parses a bare JSON object", () => {
    expect(extractJsonObject('{"a":1}')).toEqual({ a: 1 });
  });

  it("strips markdown fences", () => {
    expect(extractJsonObject('```json\n{"a":1}\n```')).toEqual({ a: 1 });
  });

  it("extracts the first JSON object from surrounding text", () => {
    expect(extractJsonObject('Here you go:\n{"a":1}\nThanks')).toEqual({ a: 1 });
  });
});

describe("clampMatchScore", () => {
  it("clamps valid numbers", () => {
    expect(clampMatchScore(150)).toBe(100);
    expect(clampMatchScore(-4)).toBe(0);
    expect(clampMatchScore(82.6)).toBe(83);
  });

  it("does not invent a high default when the score is missing", () => {
    expect(clampMatchScore(undefined)).toBe(0);
    expect(clampMatchScore("nope")).toBe(0);
  });
});
