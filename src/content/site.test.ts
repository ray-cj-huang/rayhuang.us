import { describe, expect, test } from "bun:test";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { education, site, socials, work } from "./site";

const publicPath = (p: string) => join(import.meta.dir, "../../public", p);

describe("site content", () => {
  test("every referenced image exists in /public", () => {
    const images = [
      site.avatar,
      ...work.flatMap((r) => (r.logo ? [r.logo] : [])),
      ...education.map((e) => e.logo),
    ];
    for (const img of images) {
      expect(existsSync(publicPath(img)), img).toBe(true);
    }
  });

  test("all external links are https", () => {
    const urls = [
      site.url,
      site.contactUrl,
      ...socials.map((s) => s.href),
      ...work.flatMap((r) => (r.orgUrl ? [r.orgUrl] : [])),
      ...education.map((e) => e.url),
    ];
    for (const url of urls) {
      expect(new URL(url).protocol, url).toBe("https:");
    }
  });

  test("custom domain CNAME matches site url", async () => {
    const cname = (await Bun.file(publicPath("CNAME")).text()).trim();
    expect(new URL(site.url).hostname).toBe(cname);
  });

  test("every role links to its company's LinkedIn page", () => {
    for (const role of work) {
      expect(role.orgUrl, role.org).toMatch(/^https:\/\/www\.linkedin\.com\/company\/[\w-]+\/$/);
    }
  });
});
