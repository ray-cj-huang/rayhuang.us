import Image from "next/image";
import type { ReactNode } from "react";
import { Reveal } from "@/components/reveal";
import { education, type Role, site, socials, work } from "@/content/site";

function Section({
  id,
  title,
  className = "",
  children,
}: {
  id: string;
  title: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <section
      id={id}
      aria-labelledby={`${id}-title`}
      className={`mx-auto w-full max-w-4xl px-6 py-20 ${className}`}
    >
      <Reveal>
        <h2 id={`${id}-title`} className="mb-10 font-mono text-sm uppercase tracking-[0.2em] text-accent">
          {title}
        </h2>
      </Reveal>
      {children}
    </section>
  );
}

export function Hero() {
  return (
    <header className="flex min-h-[92svh] items-end pb-16 md:items-center md:pb-0">
      <div className="mx-auto w-full max-w-4xl px-6">
        <Reveal>
          <p className="font-mono text-sm text-muted">{site.handle}</p>
          <h1 className="mt-3 text-5xl font-semibold tracking-tight sm:text-7xl">
            Hi, I&apos;m {site.name.split(" ")[0]}.
          </h1>
        </Reveal>
        <Reveal delay={0.1}>
          <p className="mt-6 max-w-md text-lg text-muted sm:text-xl">{site.tagline}</p>
        </Reveal>
        <Reveal delay={0.2} className="mt-10 flex flex-wrap gap-3">
          <a className="btn btn-primary" href={site.contactUrl} target="_blank" rel="noreferrer">
            Get in touch
          </a>
        </Reveal>
      </div>
    </header>
  );
}

function OrgMark({ role }: { role: Role }) {
  if (role.logo) {
    return (
      <Image
        src={role.logo}
        alt=""
        width={48}
        height={48}
        className="size-12 shrink-0 rounded-lg object-cover"
      />
    );
  }
  return (
    <span
      aria-hidden
      className="grid size-12 shrink-0 place-items-center rounded-lg text-lg font-semibold text-white"
      style={{ background: role.accent }}
    >
      {role.org[0]}
    </span>
  );
}

function RoleCard({ role }: { role: Role }) {
  return (
    <article className="card flex gap-5">
      <OrgMark role={role} />
      <div className="min-w-0">
        <h3 className="font-medium">{role.title}</h3>
        <p className="text-sm text-muted">
          {role.orgUrl ? (
            <a
              href={role.orgUrl}
              target="_blank"
              rel="noreferrer"
              className="link"
              style={{ color: role.accent }}
            >
              {role.org}
            </a>
          ) : (
            <span style={{ color: role.accent }}>{role.org}</span>
          )}
          {" · "}
          {role.start} – {role.end ?? "Present"} · {role.location}
        </p>
        <p className="mt-3 leading-relaxed">{role.summary}</p>
      </div>
    </article>
  );
}

export function Experience() {
  return (
    <Section id="experience" title="Experience">
      <div className="grid gap-5">
        {work.map((role, i) => (
          <Reveal key={`${role.org}-${role.title}`} delay={Math.min(i, 3) * 0.05}>
            <RoleCard role={role} />
          </Reveal>
        ))}
      </div>
    </Section>
  );
}

export function Education() {
  return (
    <Section id="education" title="Education" className="pb-8">
      {education.map((ed) => (
        <Reveal key={ed.school} className="card py-4">
          <div className="flex items-center gap-4">
            <Image
              src={ed.logo}
              alt=""
              width={40}
              height={40}
              className="size-10 shrink-0 rounded-lg bg-white object-contain p-1"
            />
            <p>
              <a href={ed.url} target="_blank" rel="noreferrer" className="link font-medium">
                {ed.school}
              </a>
              <span className="text-muted"> · {ed.degree}</span>
            </p>
          </div>
          {ed.honors.length > 0 && <p className="mt-2 pl-14 text-sm text-muted">{ed.honors.join(" · ")}</p>}
        </Reveal>
      ))}
    </Section>
  );
}

export function Contact() {
  return (
    <footer id="contact" className="mx-auto w-full max-w-4xl px-6 pt-8 pb-16">
      <Reveal className="card flex flex-col items-start gap-6 sm:flex-row sm:items-center">
        <Image
          src={site.avatar}
          alt={`Photo of ${site.name}`}
          width={96}
          height={96}
          className="size-24 rounded-full object-cover"
        />
        <div>
          <h2 className="text-2xl font-semibold">Let&apos;s build something.</h2>
          <p className="mt-2 text-muted">
            Reach me at{" "}
            <a className="link" href={`mailto:${site.email}`}>
              {site.email}
            </a>
          </p>
          <ul className="mt-4 flex flex-wrap gap-4 text-sm">
            {socials.map((s) => (
              <li key={s.href}>
                <a className="link" href={s.href} target="_blank" rel="noreferrer">
                  {s.label}
                </a>
              </li>
            ))}
          </ul>
        </div>
      </Reveal>
      <p className="card mx-auto mt-10 w-fit rounded-full px-3 py-1 text-center font-mono text-xs text-muted">
        © {new Date().getFullYear()} {site.name}
      </p>
    </footer>
  );
}
