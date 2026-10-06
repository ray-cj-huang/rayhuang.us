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
  highlights?: string[];
  accent: string; // brand color for the org name / monogram
};

export type SkillGroup = { title: string; items: string[] };

export const site = {
  name: "Ray Huang",
  handle: "ray / july",
  url: "https://rayhuang.us",
  tagline: "Software engineer in San Francisco, building voice AI for car dealerships at Toma.",
  description: "Ray Huang — software engineer at Toma building AI coworkers for automotive dealerships.",
  email: "rayhuang.cj@gmail.com",
  resumeUrl: "https://drive.google.com/file/d/1GT9pt8S3h6F4AT_cFgLbYqdHCdPxV_S8/view?usp=sharing",
  avatar: "/images/ray.jpeg",
} as const;

export const socials: Link[] = [
  { label: "GitHub", href: "https://github.com/ray-cj-huang" },
  { label: "LinkedIn", href: "https://www.linkedin.com/in/ray-cj-huang/" },
  { label: "Instagram", href: "https://www.instagram.com/ray._.huang/" },
];

export const skills: SkillGroup[] = [
  {
    title: "Engineering",
    items: ["TypeScript", "React", "Bun", "Turborepo", "tRPC", "Prisma", "Postgres", "Temporal", "AWS"],
  },
  {
    title: "Voice & AI",
    items: ["Deepgram", "Realtime STT / TTS", "Twilio", "LLM function calling", "OpenAI", "Gemini", "Claude"],
  },
];

export const work: Role[] = [
  {
    title: "Software Engineer",
    org: "Toma",
    orgUrl: "https://www.toma.com/",
    start: "Jun 2025",
    location: "San Francisco, CA",
    summary:
      "Toma builds AI coworkers for car dealerships — voice agents that answer every call, work every lead and book service and sales appointments.",
    highlights: [
      "Rebuilt the realtime voice pipeline on self-hosted Deepgram Flux with native turn detection, replacing VAD.",
      "Migrated the monorepo to Bun workspaces + Turborepo, then Prisma v7, Tailwind v4 and a shared UI package.",
      "Built the Inbox from MVP into a multi-rooftop CRM with RBAC, auto-assignment and auto-resolution.",
      "Integrated dealer systems — Reynolds, CDK, Tekion, xTime, DealerFX, PBS — for AI appointment booking.",
      "Shipped outbound campaigns on Temporal, SFTP data feeds and vehicle inventory ingestion. 500+ PRs merged.",
    ],
    accent: "#14b8a6",
  },
  {
    title: "Software Engineer (Contract)",
    org: "Affil.ai (YC S24)",
    orgUrl: "https://www.affil.ai/",
    start: "May 2025",
    end: "Jun 2025",
    location: "San Francisco, CA",
    summary: "Built the platform for affiliate networks.",
    accent: "#f97316",
  },
  {
    title: "Product Manager",
    org: "Microsoft",
    orgUrl: "https://www.microsoft.com/",
    start: "Aug 2023",
    end: "Apr 2025",
    location: "Mountain View, CA",
    summary: "Built Copilot automation and reduced COGS in PowerPoint.",
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
    summary: "Drove Microsoft 365 user acquisition.",
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
    summary: "Built internal investigation tools for the Book Ads team.",
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
    summary: "Built data validation for the Book Ads team.",
    accent: "#ff9900",
  },
];

export const education = [
  {
    school: "University of California, Los Angeles",
    degree: "B.S. Computer Science",
    logo: "/images/ucla.png",
    url: "https://www.cs.ucla.edu/",
    notes: ["Led LA Blueprint (EVP), Bruin Entrepreneurs (Tech Director) and ACM at UCLA."],
  },
];
