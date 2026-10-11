export type Link = {
  label: string;
  href: string;
  icon?: "linkedin" | "github";
};

export type Role = {
  title: string;
  org: string;
  orgUrl?: string;
  /** The company's own site, for structured data; `orgUrl` stays the visible link. */
  website?: string;
  /** Company logo under `public/`, taken from its LinkedIn page; without one, a monogram in `accent` is shown. */
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
  /** Full name, shown in the footer so search engines see it as visible text. */
  fullName: "Ray Chi Jui Huang",
  alternateNames: ["Ray Chi Jui Huang", "Ray CJ Huang"],
  jobTitle: "Software Engineer",
  handle: "ray / huang",
  url: "https://rayhuang.us",
  tagline: "Building @ Toma, powered by coffee and squats",
  title: "Ray Huang — Software Engineer at Toma",
  description:
    "Ray (Chi Jui) Huang is a software engineer at Toma building voice AI coworkers for car dealerships. Previously a product manager at Microsoft for nearly two years, working on Copilot and PowerPoint, and an intern at Amazon. UCLA Computer Science.",
  email: "rayhuang.cj@gmail.com",
  avatar: "/images/ray.jpg",
  contactUrl: "https://www.linkedin.com/in/ray-cj-huang/",
} as const;

export const contact = {
  heading: "Nice to meet you",
  lead: "Say hi at",
  invite: "to yap or play ⛷️ 🚴 🧗 🎾 🏐",
};

export const socials: Link[] = [
  { label: "LinkedIn", href: "https://www.linkedin.com/in/ray-cj-huang/", icon: "linkedin" },
  { label: "GitHub", href: "https://github.com/ray-cj-huang", icon: "github" },
  { label: "Instagram", href: "https://www.instagram.com/ray._.huang/" },
];

export const work: Role[] = [
  {
    title: "Software Engineer",
    org: "Toma",
    logo: "/images/logos/toma.jpg",
    orgUrl: "https://www.linkedin.com/company/toma-ai/",
    website: "https://www.toma.com",
    start: "Jun 2025",
    location: "San Francisco, CA",
    summary: "Building voice AI coworkers for car dealerships",
    accent: "#14b8a6",
  },
  {
    title: "Software Engineer (Contract)",
    org: "Affil.ai (YC S24)",
    logo: "/images/logos/affil.jpg",
    orgUrl: "https://www.linkedin.com/company/affilai/",
    start: "May 2025",
    end: "Jun 2025",
    location: "San Francisco, CA",
    summary: "Built the platform for affiliate networks",
    accent: "#f97316",
  },
  {
    title: "Product Manager",
    org: "Microsoft",
    logo: "/images/logos/microsoft.jpg",
    orgUrl: "https://www.linkedin.com/company/microsoft/",
    start: "Aug 2023",
    end: "Apr 2025",
    location: "Mountain View, CA",
    summary: "Built Copilot automation and reduced cost in PowerPoint",
    accent: "#0078d4",
  },
  {
    title: "Software Engineer Intern",
    org: "Vivid",
    logo: "/images/logos/vivid.jpg",
    orgUrl: "https://www.linkedin.com/company/vivid-ui/",
    start: "Mar 2023",
    end: "Jun 2023",
    location: "New York, NY",
    summary: "Reverse engineered Figma",
    accent: "#8b5cf6",
  },
  {
    title: "Product Manager Intern",
    org: "Microsoft",
    logo: "/images/logos/microsoft.jpg",
    orgUrl: "https://www.linkedin.com/company/microsoft/",
    start: "Jun 2022",
    end: "Sep 2022",
    location: "Redmond, WA",
    summary: "Grew Microsoft 365 user acquisition",
    accent: "#0078d4",
  },
  {
    title: "Software Development Engineer Intern",
    org: "Amazon",
    logo: "/images/logos/amazon.jpg",
    orgUrl: "https://www.linkedin.com/company/amazon/",
    start: "Jun 2021",
    end: "Sep 2021",
    location: "Seattle, WA",
    summary: "Built internal tools for Amazon's book ads team",
    accent: "#ff9900",
  },
  {
    title: "Future Engineer Intern",
    org: "Amazon",
    logo: "/images/logos/amazon.jpg",
    orgUrl: "https://www.linkedin.com/company/amazon/",
    start: "Jun 2020",
    end: "Sep 2020",
    location: "Seattle, WA (Remote)",
    summary: "Validated data for Amazon's book ads team",
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
