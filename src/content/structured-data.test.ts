import { describe, expect, test } from "bun:test";
import { homeJsonLd } from "./structured-data";

describe("homeJsonLd", () => {
  const [website, page] = homeJsonLd()["@graph"];
  const person = page.mainEntity;
  const names = (orgs: { name: string }[]) => orgs.map((o) => o.name);

  test("names the site Ray Huang, so Google shows that instead of the domain", () => {
    expect(website["@type"]).toBe("WebSite");
    expect(website.name).toBe("Ray Huang");
  });

  test("is a ProfilePage about Ray, which Google can show as a rich result", () => {
    expect(page["@type"]).toBe("ProfilePage");
    expect(person["@type"]).toBe("Person");
    expect(person.worksFor[0]).toMatchObject({ name: "Toma", url: "https://www.toma.com" });
  });

  test("lists the current employer and past ones", () => {
    expect(names(person.worksFor)).toEqual(["Toma"]);
    expect(names(person.alumniOf)).toContain("Microsoft");
    expect(names(person.alumniOf)).toContain("University of California, Los Angeles");
    expect(names(person.alumniOf)).not.toContain("Toma");
  });

  test("past employers appear once each", () => {
    const orgs = names(person.alumniOf);
    expect(new Set(orgs).size).toBe(orgs.length);
  });

  test("occupations skip internships", () => {
    expect(names(person.hasOccupation)).toEqual(["Software Engineer", "Product Manager"]);
  });

  test("searchable name forms are included", () => {
    expect(person.alternateName).toEqual(["Ray Chi Jui Huang", "Ray CJ Huang"]);
  });

  test("profile links are https", () => {
    for (const url of person.sameAs) expect(new URL(url).protocol, url).toBe("https:");
  });
});
