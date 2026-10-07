// Single source of truth for everything rendered on the site.
// Edit this file to update copy; components should never hardcode content.

export type Link = { label: string; href: string };

export type Role = {
  title: string;
  org: string;
  orgUrl?: string;
  logo?: string; // path under /public; falls back to a monogram
  start: string;
  end?: string; // omit for current roles
  location: string;
  summary: string;
  accent: string; // brand color for the org name / monogram
};

export const site = {
  name: "Ray Huang",
  handle: "ray / huang",
  url: "https://rayhuang.us",
  tagline: "Software engineer in San Francisco, building AI coworkers for car dealerships at Toma.",
  description: "Ray Huang — software engineer at Toma building AI coworkers for automotive dealerships.",
  email: "rayhuang.cj@gmail.com",
  avatar: "/images/ray.jpg",
  contactUrl: "https://www.linkedin.com/in/ray-cj-huang/", // "Get in touch" target
} as const;

export const socials: Link[] = [
  { label: "GitHub", href: "https://github.com/ray-cj-huang" },
  { label: "LinkedIn", href: "https://www.linkedin.com/in/ray-cj-huang/" },
  { label: "Instagram", href: "https://www.instagram.com/ray._.huang/" },
];

export const work: Role[] = [
  {
    title: "Software Engineer",
    org: "Toma",
    orgUrl: "https://www.toma.com/",
    start: "Jun 2025",
    location: "San Francisco, CA",
    summary: "Building AI coworkers for car dealerships.",
    accent: "#14b8a6",
  },
  {
    title: "Software Engineer (Contract)",
    org: "Affil.ai (YC S24)",
    orgUrl: "https://www.affil.ai/",
    start: "May 2025",
    end: "Jun 2025",
    location: "San Francisco, CA",
    summary: "Built a platform for affiliate networks.",
    accent: "#f97316",
  },
  {
    title: "Product Manager",
    org: "Microsoft",
    orgUrl: "https://www.microsoft.com/",
    start: "Aug 2023",
    end: "Apr 2025",
    location: "Mountain View, CA",
    summary: "Worked on Copilot in PowerPoint.",
    accent: "#0078d4",
  },
  {
    title: "Software Engineer Intern",
    org: "Vivid",
    start: "Mar 2023",
    end: "Jun 2023",
    location: "New York, NY",
    summary: "Reverse engineered Figma.",
    accent: "#8b5cf6",
  },
  {
    title: "Product Manager Intern",
    org: "Microsoft",
    orgUrl: "https://www.microsoft.com/",
    start: "Jun 2022",
    end: "Sep 2022",
    location: "Redmond, WA",
    summary: "Worked on Microsoft 365 growth.",
    accent: "#0078d4",
  },
  {
    title: "Software Development Engineer Intern",
    org: "Amazon",
    orgUrl: "https://www.amazon.jobs/",
    logo: "/images/amazon.jpeg",
    start: "Jun 2021",
    end: "Sep 2021",
    location: "Seattle, WA",
    summary: "Built internal tools for Book Ads.",
    accent: "#ff9900",
  },
  {
    title: "Future Engineer Intern",
    org: "Amazon",
    orgUrl: "https://www.amazon.jobs/",
    logo: "/images/amazon.jpeg",
    start: "Jun 2020",
    end: "Sep 2020",
    location: "Seattle, WA (Remote)",
    summary: "Built data validation for Book Ads.",
    accent: "#ff9900",
  },
];

export const education = [
  {
    school: "University of California, Los Angeles",
    degree: "B.S. Computer Science",
    logo: "/images/ucla.png",
    url: "https://www.cs.ucla.edu/",
    honors: ["Regents Scholar", "Amazon Future Engineer Scholar"],
  },
];
