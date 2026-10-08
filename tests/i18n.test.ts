import { describe, expect, it } from "vitest";
import en from "@/messages/en.json";
import pcm from "@/messages/pcm.json";
import { formatDate, formatDuration, formatRiskReason, resolveLanguage, t } from "@/lib/i18n";

describe("language messages", () => {
  it("provides the same non-empty keys and template parameters in both languages", () => {
    expect(Object.keys(pcm).sort()).toEqual(Object.keys(en).sort());
    for (const key of Object.keys(en) as (keyof typeof en)[]) {
      expect(en[key].trim()).not.toBe("");
      expect(pcm[key].trim()).not.toBe("");
      const parameters = (value: string) => value.match(/\{\w+\}/g)?.sort() ?? [];
      expect(parameters(pcm[key]), key).toEqual(parameters(en[key]));
    }
  });
  it("uses the landing cookie only when it is a supported language", () => {
    expect(resolveLanguage("pcm")).toBe("pcm");
    for (const value of [undefined, null, "en", "fr", "PCM", ""]) {
      expect(resolveLanguage(value)).toBe("en");
    }
  });
  it("interpolates zero and refuses an incomplete template", () => {
    expect(t("time.minutes", "pcm", { minutes: 0 })).toBe("0 min");
    expect(t("time.minutes", "en", { minutes: 40 })).toBe("40 min");
    expect(() => t("time.minutes", "en")).toThrow("time.minutes.minutes");
  });
  it("uses Lagos calendar dates across midnight and year boundaries", () => {
    expect(formatDate(new Date("2026-10-18T23:30:00Z"), "en")).toBe("Mon 19 Oct");
    expect(formatDate(new Date("2026-12-31T23:30:00Z"), "pcm")).toBe("Fri 1 Jan");
  });
  it("formats minutes and hours identically in both supported languages", () => {
    for (const language of ["en", "pcm"] as const) {
      expect(formatDuration(40, language)).toBe("40 min");
      expect(formatDuration(2160, language)).toBe("36 h");
      expect(formatDuration(1780, language)).toBe("29 h 40 min");
    }
  });
  it("explains backlog pressure with hours rather than a ratio", () => {
    const text = formatRiskReason("BACKLOG_PRESSURE", { workMinutes: 130, availableMinutes: 60, assessment: "Assignment 2" }, "en");
    expect(text).toContain("2 h 10 min");
    expect(text).toContain("1 h");
    expect(text).not.toContain("x the time");
  });
});
