import { SceneBackdrop } from "@/components/scene-backdrop";
import { Contact, Education, Experience, Hero } from "@/components/sections";

export default function Home() {
  return (
    <>
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
