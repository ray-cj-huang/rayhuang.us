import { education, type Role, site, socials, work } from "./site";

const organization = (role: Role) => ({
  "@type": "Organization",
  name: role.org,
  ...(role.orgUrl && { sameAs: role.orgUrl }),
});

/**
 * schema.org `Person` for the home page, derived from the site content so it never drifts.
 * Former employers go in `alumniOf`, which schema.org allows for any Organization.
 */
export function personJsonLd() {
  const current = work.filter((r) => !r.end);
  const past = work.filter((r) => r.end && !current.some((c) => c.org === r.org));
  const pastOrgs = [...new Map(past.map((r) => [r.org, r])).values()];
  const occupations = [
    ...new Set(
      work.filter((r) => !r.title.includes("Intern")).map((r) => r.title.replace(" (Contract)", "")),
    ),
  ];

  return {
    "@context": "https://schema.org",
    "@type": "Person",
    name: site.name,
    alternateName: [...site.alternateNames],
    url: site.url,
    image: new URL(site.avatar, site.url).href,
    email: `mailto:${site.email}`,
    jobTitle: site.jobTitle,
    description: site.description,
    worksFor: current.map(organization),
    alumniOf: [
      ...education.map((e) => ({ "@type": "CollegeOrUniversity", name: e.school, sameAs: e.url })),
      ...pastOrgs.map(organization),
    ],
    hasOccupation: occupations.map((name) => ({ "@type": "Occupation", name })),
    knowsAbout: ["Software engineering", "AI agents", "Product management"],
    sameAs: socials.map((s) => s.href),
  };
}
