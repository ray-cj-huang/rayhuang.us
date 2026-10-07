import { SceneBackdrop } from "@/components/scene-backdrop";
import { Contact, Education, Experience, Hero, Skills } from "@/components/sections";

export default function Home() {
  return (
    <>
      <SceneBackdrop />
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
