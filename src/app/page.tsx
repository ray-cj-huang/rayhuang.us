import { SceneBackdrop } from "@/components/scene-backdrop";
import { Contact, Education, Experience, Hero } from "@/components/sections";
import { personJsonLd } from "@/content/structured-data";

export default function Home() {
  return (
    <>
      <script
        type="application/ld+json"
        // Escaping "<" keeps the JSON from closing the script tag: https://nextjs.org/docs/app/guides/json-ld
        // biome-ignore lint/security/noDangerouslySetInnerHtml: static JSON built from site content
        dangerouslySetInnerHTML={{ __html: JSON.stringify(personJsonLd()).replace(/</g, "\\u003c") }}
      />
      <SceneBackdrop />
      <Hero />
      <main>
        <Experience />
        <Education />
      </main>
      <Contact />
    </>
  );
}
