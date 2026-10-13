import { education, type Role, site, socials, work } from "./site";

const organization = (role: Role) => ({
  "@type": "Organization",
  name: role.org,
  ...(role.website && { url: role.website }),
  ...(role.orgUrl && { sameAs: role.orgUrl }),
});

/**
 * schema.org JSON-LD for the home page, derived from the site content so it never drifts.
 * `WebSite` sets the site name Google shows above results (instead of the bare domain):
 * https://developers.google.com/search/docs/appearance/site-names
 * Google only reports a bare `Person` as a rich result when it's the `mainEntity` of a `ProfilePage`:
 * https://developers.google.com/search/docs/appearance/structured-data/profile-page
 * Former employers go in `alumniOf`, which schema.org allows for any Organization.
 */
export function homeJsonLd() {
  const current = work.filter((r) => !r.end);
  const past = work.filter((r) => r.end && !current.some((c) => c.org === r.org));
  const pastOrgs = [...new Map(past.map((r) => [r.org, r])).values()];
  const occupations = [
    ...new Set(
      work.filter((r) => !r.title.includes("Intern")).map((r) => r.title.replace(" (Contract)", "")),
    ),
  ];

  const person = {
    "@type": "Person",
    "@id": `${site.url}/#person`,
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
    knowsAbout: ["Software engineering", "Voice AI", "AI agents", "Product management"],
    sameAs: socials.map((s) => s.href),
  };

  const website = {
    "@type": "WebSite",
    url: `${site.url}/`,
    name: site.name,
    alternateName: ["rayhuang.us", ...site.alternateNames],
  };

  const profilePage = {
    "@type": "ProfilePage",
    url: `${site.url}/`,
    name: site.title,
    mainEntity: person,
  };

  return { "@context": "https://schema.org", "@graph": [website, profilePage] as const };
}
