export type Link = { label: string; href: string };

export type Role = {
  title: string;
  org: string;
  orgUrl?: string;
  /** Path under `public/`. Without one, a monogram in `accent` is shown. */
  logo?: string;
  start: string;
  /** Omit for a current role; it renders as "Present". */
  end?: string;
  location: string;
  summary: string;
  /** CSS color for the org name and monogram. */
  accent: string;
};

export const site = {
  name: "Ray Huang",
  handle: "ray / huang",
  url: "https://rayhuang.us",
  tagline: "Another day, another life :)",
  description: "Ray Huang — software engineer at Toma building AI coworkers for automotive dealerships.",
  email: "rayhuang.cj@gmail.com",
  avatar: "/images/ray.jpg",
  /** Where the "Get in touch" button links. */
  contactUrl: "https://www.linkedin.com/in/ray-cj-huang/",
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
    orgUrl: "https://www.linkedin.com/company/toma-ai/",
    start: "Jun 2025",
    location: "San Francisco, CA",
    summary: "Building AI coworkers for car dealerships.",
    accent: "#14b8a6",
  },
  {
    title: "Software Engineer (Contract)",
    org: "Affil.ai (YC S24)",
    orgUrl: "https://www.linkedin.com/company/affilai/",
    start: "May 2025",
    end: "Jun 2025",
    location: "San Francisco, CA",
    summary: "Built the platform for affiliate networks.",
    accent: "#f97316",
  },
  {
    title: "Product Manager",
    org: "Microsoft",
    orgUrl: "https://www.linkedin.com/company/microsoft/",
    start: "Aug 2023",
    end: "Apr 2025",
    location: "Mountain View, CA",
    summary: "Built Copilot automation and reduced COGS in PowerPoint.",
    accent: "#0078d4",
  },
  {
    title: "Software Engineer Intern",
    org: "Vivid",
    orgUrl: "https://www.linkedin.com/company/vivid-ui/",
    start: "Mar 2023",
    end: "Jun 2023",
    location: "New York, NY",
    summary: "Reverse engineered Figma.",
    accent: "#8b5cf6",
  },
  {
    title: "Product Manager Intern",
    org: "Microsoft",
    orgUrl: "https://www.linkedin.com/company/microsoft/",
    start: "Jun 2022",
    end: "Sep 2022",
    location: "Redmond, WA",
    summary: "Grew Microsoft 365 user acquisition.",
    accent: "#0078d4",
  },
  {
    title: "Software Development Engineer Intern",
    org: "Amazon",
    orgUrl: "https://www.linkedin.com/company/amazon/",
    logo: "/images/amazon.jpeg",
    start: "Jun 2021",
    end: "Sep 2021",
    location: "Seattle, WA",
    summary: "Built internal tools for Amazon's book ads team.",
    accent: "#ff9900",
  },
  {
    title: "Future Engineer Intern",
    org: "Amazon",
    orgUrl: "https://www.linkedin.com/company/amazon/",
    logo: "/images/amazon.jpeg",
    start: "Jun 2020",
    end: "Sep 2020",
    location: "Seattle, WA (Remote)",
    summary: "Validated data for Amazon's book ads team.",
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
