import { Link } from "react-router-dom";
import PulseLine from "../components/PulseLine";

export default function Home() {
  return (
    <div>
      {/* Hero */}
      <section className="max-w-6xl mx-auto px-6 pt-16 pb-20">
        <p className="font-mono text-xs uppercase tracking-widest text-crimson mb-6">
          Blood donation network
        </p>
        <h1 className="font-display text-5xl md:text-6xl font-medium leading-[1.1] text-ink max-w-3xl">
          Somewhere nearby, someone needs your blood type today.
        </h1>
        <p className="mt-6 text-lg text-ink-soft max-w-xl">
          LifeLine connects eligible donors with hospitals and patients in
          real time — search by blood group, location, and availability, and
          track every donation you make.
        </p>

        <div className="mt-10 flex flex-wrap items-center gap-4">
          <Link
            to="/signup"
            className="px-6 py-3 rounded-full bg-crimson text-white font-medium hover:bg-crimson-dark transition-colors"
          >
            Become a donor
          </Link>
          <Link
            to="/search"
            className="px-6 py-3 rounded-full border border-line font-medium text-ink hover:border-ink transition-colors"
          >
            Find a donor
          </Link>
        </div>

        <div className="mt-16 text-crimson/60">
          <PulseLine animated />
        </div>
      </section>

      {/* Stats-as-copy, not generic stat cards — grounded in the actual product */}
      <section className="max-w-6xl mx-auto px-6 pb-20 grid md:grid-cols-3 gap-10">
        <div>
          <p className="font-display text-3xl text-ink mb-2">90 days</p>
          <p className="text-sm text-ink-soft">
            The typical gap between whole blood donations. LifeLine tracks
            yours automatically and tells you the moment you're eligible
            again.
          </p>
        </div>
        <div>
          <p className="font-display text-3xl text-ink mb-2">3 lives</p>
          <p className="text-sm text-ink-soft">
            One donation is commonly separated into components that can help
            roughly three different patients.
          </p>
        </div>
        <div>
          <p className="font-display text-3xl text-ink mb-2">1 search</p>
          <p className="text-sm text-ink-soft">
            Filter by blood group, city, availability, and eligibility to
            find the right donor in seconds, not hours of phone calls.
          </p>
        </div>
      </section>

      {/* Secondary CTA */}
      <section className="border-t border-line bg-white">
        <div className="max-w-6xl mx-auto px-6 py-16 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div>
            <h2 className="font-display text-2xl text-ink mb-2">
              New to donating?
            </h2>
            <p className="text-ink-soft max-w-md">
              Read what donation actually involves, and see the common myths
              debunked with plain facts.
            </p>
          </div>
          <div className="flex gap-4">
            <Link
              to="/benefits"
              className="px-5 py-2.5 rounded-full border border-line font-medium hover:border-ink transition-colors"
            >
              Benefits
            </Link>
            <Link
              to="/myths"
              className="px-5 py-2.5 rounded-full border border-line font-medium hover:border-ink transition-colors"
            >
              Myths vs facts
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
