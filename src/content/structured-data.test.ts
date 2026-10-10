import { describe, expect, test } from "bun:test";
import { personJsonLd } from "./structured-data";

describe("personJsonLd", () => {
  const person = personJsonLd();
  const names = (orgs: { name: string }[]) => orgs.map((o) => o.name);

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
