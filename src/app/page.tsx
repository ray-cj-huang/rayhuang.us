import { Contact, Education, Experience, Hero, Skills } from "@/components/sections";

export default function Home() {
  return (
    <>
      <Hero />
      <main>
        <Experience />
        <Skills />
        <Education />
      </main>
      <Contact />
    </>
  );
}
