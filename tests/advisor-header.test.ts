import { describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { proxy } from "@/proxy";

describe("advisor header language", () => {
  it("marks advisor requests so shared controls stay in English", () => {
    const response = proxy(new NextRequest("http://localhost/advisor"));
    expect(response.headers.get("x-middleware-request-x-backontrack-advisor")).toBe("true");
  });
});
