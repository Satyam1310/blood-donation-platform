const BENEFITS = [
  {
    title: "Helps save multiple lives",
    text: "A single donation is often separated into red cells, plasma, and platelets — each going to a different patient, from surgery patients to cancer patients to trauma victims.",
  },
  {
    title: "Free mini health screening",
    text: "Before every donation you get a quick check of blood pressure, pulse, hemoglobin, and body temperature — a free early signal if something's off.",
  },
  {
    title: "May reduce harmful iron stores",
    text: "Regular donation helps keep iron levels in a healthy range, which some research links to lower risk of iron overload over time.",
  },
  {
    title: "Burns calories",
    text: "Donating a unit of blood uses roughly 650 calories as your body works to replace the donated volume.",
  },
  {
    title: "Emotional and social benefit",
    text: "Donors consistently report a sense of purpose and community connection from giving something that directly helps a stranger.",
  },
];

export default function Benefits() {
  return (
    <div className="max-w-3xl mx-auto px-6 py-16">
      <p className="font-mono text-xs uppercase tracking-widest text-crimson mb-4">
        Why donate
      </p>
      <h1 className="font-display text-4xl text-ink mb-4">
        What blood donation actually gives back
      </h1>
      <p className="text-ink-soft mb-12 max-w-xl">
        Donating isn't only for the recipient. Here's what happens for you, in
        plain terms.
      </p>

      <div className="space-y-8">
        {BENEFITS.map((b, i) => (
          <div key={b.title} className="flex gap-6 pb-8 border-b border-line last:border-0">
            <span className="font-mono text-sm text-crimson pt-1 w-6 shrink-0">
              {String(i + 1).padStart(2, "0")}
            </span>
            <div>
              <h2 className="font-display text-xl text-ink mb-1.5">{b.title}</h2>
              <p className="text-ink-soft">{b.text}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
