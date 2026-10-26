import { Faq } from "@/components/sections/faq";
import { FeaturesBento } from "@/components/sections/features-bento";
import { FinalCta } from "@/components/sections/final-cta";
import { Hero } from "@/components/sections/hero";
import { HowItWorks } from "@/components/sections/how-it-works";
import { Navbar } from "@/components/sections/navbar";
import { Pricing } from "@/components/sections/pricing";
import { SiteFooter } from "@/components/sections/site-footer";
import { StatsBand } from "@/components/sections/stats-band";
import { Testimonials } from "@/components/sections/testimonials";
import { TrustedBy } from "@/components/sections/trusted-by";

export default function Home() {
  return (
    <>
      <Navbar />
      <main className="flex-1">
        <Hero />
        <TrustedBy />
        <HowItWorks />
        <FeaturesBento />
        <Testimonials />
        <Pricing />
        <Faq />
        <StatsBand />
        <FinalCta />
      </main>
      <SiteFooter />
    </>
  );
}
