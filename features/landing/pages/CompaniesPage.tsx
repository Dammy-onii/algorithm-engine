import { Nav } from "../components/Nav";
import { Hero } from "../components/Hero";
import { HowItWorks } from "../components/HowItWorks";
import { Why } from "../components/Why";
import { CompanyOfferings } from "../components/CompanyOfferings";
import { Ladder } from "../components/Ladder";
import { Simulations } from "../components/Simulations";
import { WhoItsFor } from "../components/WhoItsFor";
import { Waitlist } from "../components/Waitlist";
import { Faq } from "../components/Faq";
import { Footer } from "../components/Footer";

const TAGLINE =
  "Technical assessments built around realistic problems from your company and industry.";

/**
 * The detailed pitch for hiring teams at `/companies` — how companies use CTRL
 * and what we offer them.
 */
export function CompaniesPage() {
  return (
    <>
      <Nav />
      <main>
        <Hero />
        <HowItWorks />
        <Why />
        <CompanyOfferings />
        <Ladder />
        <Simulations />
        <WhoItsFor />
        <Waitlist />
        <Faq />
      </main>
      <Footer tagline={TAGLINE} />
    </>
  );
}
