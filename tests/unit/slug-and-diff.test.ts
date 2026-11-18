import { describe, expect, it } from "vitest";
import { slugify } from "@/lib/slug";
import { diffParagraphs } from "@/lib/editor/diff";
import { passwordProblem } from "@/lib/password-policy";
import { sniffImage } from "@/server/media/process";

describe("helpers", () => {
  it("slugifies Nigerian names and punctuation", () => {
    expect(slugify("Ẹ̀kọ́ and the Sea!")).toBe("eko-and-the-sea");
    expect(slugify("What My Grandmother Knew About Salt")).toBe("what-my-grandmother-knew-about-salt");
  });
  it("diffs paragraphs", () => {
    const d = diffParagraphs("a\n\nb\n\nc", "a\n\nB\n\nc");
    expect(d.map((x) => x.kind)).toEqual(["same", "removed", "added", "same"]);
  });
  it("password policy prefers length", () => {
    expect(passwordProblem("short")).toMatch(/10 characters/);
    expect(passwordProblem("password123")).toMatch(/common/);
    expect(passwordProblem("a quiet river at dawn")).toBeNull();
  });
  it("identifies images by their bytes, not their names", () => {
    expect(sniffImage(Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0, 0, 0, 0, 0, 0, 0, 0]))).toBe("image/jpeg");
    expect(sniffImage(Buffer.from("<?php echo 1; ?>  "))).toBeNull();
    expect(sniffImage(Buffer.from("GIF89a......"))).toBe("image/gif");
  });
});
