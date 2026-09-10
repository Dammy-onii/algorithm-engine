import { Nav } from "../components/Nav";
import { IndividualsHero } from "../components/IndividualsHero";
import { HomeHowItWorks } from "../components/HomeHowItWorks";
import { Individuals } from "../components/Individuals";
import { SampleProblems } from "../components/SampleProblems";
import { CompaniesTeaser } from "../components/CompaniesTeaser";
import { HomeFaq } from "../components/HomeFaq";
import { Footer } from "../components/Footer";

/**
 * The home page (`/`) is the individuals experience: practise real problems by
 * designing the logic that runs them. A few problems are openable without an
 * account; companies get a pointer to their own page.
 */
export function LandingPage() {
  return (
    <>
      <Nav />
      <main>
        <IndividualsHero />
        <HomeHowItWorks />
        <Individuals />
        <SampleProblems />
        <CompaniesTeaser />
        <HomeFaq />
      </main>
      <Footer />
    </>
  );
}
