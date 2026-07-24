const MYTHS = [
  {
    myth: "Donating blood is very painful.",
    fact: "Most donors feel only a brief pinch when the needle is inserted. The donation itself typically takes 8–10 minutes and isn't painful.",
  },
  {
    myth: "You can catch a disease by donating blood.",
    fact: "Every needle and collection kit is sterile, used once, and disposed of after a single donation. There is no risk of infection from donating.",
  },
  {
    myth: "Donating blood makes you weak for days.",
    fact: "Most people resume normal activity the same day, avoiding only heavy exercise for about 24 hours. Fluid volume is typically restored within a day.",
  },
  {
    myth: "Vegetarians can't donate blood.",
    fact: "Diet doesn't disqualify you. What matters is meeting hemoglobin and general health requirements at the time of donation.",
  },
  {
    myth: "People with tattoos or piercings can't donate.",
    fact: "Most guidelines allow donation after a waiting period following a tattoo or piercing (commonly a few months), not a permanent ban.",
  },
  {
    myth: "Older adults can't donate blood.",
    fact: "Many blood banks accept donors well into their 60s and beyond, as long as general health criteria are met — there's often no strict upper cutoff.",
  },
];

export default function Myths() {
  return (
    <div className="max-w-3xl mx-auto px-6 py-16">
      <p className="font-mono text-xs uppercase tracking-widest text-crimson mb-4">
        Set the record straight
      </p>
      <h1 className="font-display text-4xl text-ink mb-4">Myths vs. facts</h1>
      <p className="text-ink-soft mb-12 max-w-xl">
        Common misconceptions that stop people from donating — and the plain
        facts that replace them. General guidance can vary by country and
        blood bank, so always check your local center's exact criteria.
      </p>

      <div className="space-y-6">
        {MYTHS.map((m) => (
          <div key={m.myth} className="border border-line rounded-2xl overflow-hidden bg-white">
            <div className="p-5 border-b border-line bg-crimson-light">
              <p className="text-xs font-mono uppercase tracking-wide text-crimson-dark mb-1">
                Myth
              </p>
              <p className="text-ink font-medium">{m.myth}</p>
            </div>
            <div className="p-5 bg-teal-light">
              <p className="text-xs font-mono uppercase tracking-wide text-teal mb-1">Fact</p>
              <p className="text-ink">{m.fact}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
