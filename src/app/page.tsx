import { Hero } from "@/components/Hero/Hero";
import { ShowcaseTeaser } from "@/components/ShowcaseTeaser/ShowcaseTeaser";
import { Footer } from "@/components/Footer/Footer";

const Home = () => (
  <main className="relative">
    <Hero />
    {/* Peeks over the hero's bottom edge and widens as you scroll into it. */}
    <ShowcaseTeaser />
    <Footer />
  </main>
);

export default Home;
