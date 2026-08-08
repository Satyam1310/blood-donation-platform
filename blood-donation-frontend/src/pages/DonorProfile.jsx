import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import api from "../api/axios";

const formatDate = (date) => {
  if (!date) return "No donation recorded";

  return new Date(date).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
};

const formatName = (name) => {
  if (!name) return "Donor";

  return name
    .trim()
    .toLowerCase()
    .replace(/\b\w/g, (char) => char.toUpperCase());
};

export default function DonorProfile() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [donor, setDonor] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchDonorProfile = async () => {
      try {
        setLoading(true);
        setError("");

        const res = await api.get(`/donors/${id}`);
        setDonor(res.data.donor);
      } catch (err) {
        console.error(err);

        setError(
          err.response?.data?.message ||
            "Unable to load donor profile."
        );
      } finally {
        setLoading(false);
      }
    };

    fetchDonorProfile();
  }, [id]);

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto px-6 py-20 text-ink-soft font-mono text-sm">
        Loading donor profile…
      </div>
    );
  }

  if (error || !donor) {
    return (
      <div className="max-w-5xl mx-auto px-6 py-16">
        <button
          onClick={() => navigate(-1)}
          className="text-sm text-crimson font-medium mb-6 hover:underline"
        >
          ← Back
        </button>

        <div className="p-6 border border-line rounded-2xl bg-white">
          <h2 className="text-xl font-semibold text-ink">
            Donor profile unavailable
          </h2>

          <p className="mt-2 text-ink-soft">
            {error ||
              "This donor profile could not be found."}
          </p>
        </div>
      </div>
    );
  }

  const hasPhone = Boolean(donor.phone);
  const hasEmail = Boolean(donor.email);

  return (
    <div className="max-w-5xl mx-auto px-6 py-16">

      {/* Back */}
      <button
        onClick={() => navigate(-1)}
        className="text-sm text-crimson font-medium hover:underline mb-6"
      >
        ← Back to donors
      </button>

      {/* Profile header */}
      <section className="bg-white border border-line rounded-3xl p-7 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center gap-5">

          {/* Blood group */}
          <div className="w-20 h-20 rounded-full bg-crimson-light text-crimson flex items-center justify-center text-xl font-bold shrink-0">
            {donor.bloodGroup || "—"}
          </div>

          <div className="flex-1">
            <h1 className="text-3xl font-bold text-ink">
              {formatName(donor.name)}
            </h1>

            <p className="mt-1 text-ink-soft">
              {donor.city || "Location not provided"}
            </p>

            <div className="flex flex-wrap gap-2 mt-3">

              <span
                className={`text-xs font-medium px-3 py-1 rounded-full ${
                  donor.isAvailable
                    ? "bg-teal-light text-teal"
                    : "bg-line text-ink-soft"
                }`}
              >
                {donor.isAvailable
                  ? "Available"
                  : "Not available"}
              </span>

              <span
                className={`text-xs font-medium px-3 py-1 rounded-full ${
                  donor.isEligible
                    ? "bg-teal-light text-teal"
                    : "bg-line text-ink-soft"
                }`}
              >
                {donor.isEligible
                  ? "Eligible to donate"
                  : "Not currently eligible"}
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Contact + Chat */}
      <section className="mt-6 bg-white border border-line rounded-3xl p-7">

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-ink">
              Contact donor
            </h2>

            <p className="text-sm text-ink-soft mt-1">
              Contact options are available according to
              the donor's privacy settings.
            </p>
          </div>

          {/* Future chat button */}
          <button
            type="button"
            onClick={() => {
              // Chat route will be implemented later.
              navigate(`/chat/${donor.id}`);
            }}
            className="px-5 py-2.5 rounded-full bg-crimson text-white font-medium hover:bg-crimson-dark transition-colors whitespace-nowrap"
          >
            Start chat
          </button>
        </div>

        <div className="mt-6 grid sm:grid-cols-2 gap-4">

          {/* Phone */}
          {hasPhone ? (
            <div className="p-4 border border-line rounded-2xl">

              <p className="text-xs text-ink-soft uppercase tracking-wide">
                Phone
              </p>

              <p className="mt-1 font-medium text-ink break-all">
                {donor.phone}
              </p>

              <a
                href={`tel:${donor.phone}`}
                className="inline-flex mt-3 px-4 py-2 rounded-full border border-line text-sm font-medium text-ink hover:border-teal hover:text-teal transition-colors"
              >
                Call donor
              </a>
            </div>
          ) : (
            <div className="p-4 border border-line rounded-2xl">
              <p className="text-xs text-ink-soft uppercase tracking-wide">
                Phone
              </p>

              <p className="mt-1 text-sm text-ink-soft">
                Phone number is hidden by the donor.
              </p>
            </div>
          )}

          {/* Email */}
          {hasEmail ? (
            <div className="p-4 border border-line rounded-2xl">

              <p className="text-xs text-ink-soft uppercase tracking-wide">
                Verified email
              </p>

              <p className="mt-1 font-medium text-ink break-all">
                {donor.email}
              </p>

              <a
                href={`mailto:${donor.email}`}
                className="inline-flex mt-3 px-4 py-2 rounded-full border border-line text-sm font-medium text-ink hover:border-crimson hover:text-crimson transition-colors"
              >
                Send email
              </a>
            </div>
          ) : (
            <div className="p-4 border border-line rounded-2xl">
              <p className="text-xs text-ink-soft uppercase tracking-wide">
                Email
              </p>

              <p className="mt-1 text-sm text-ink-soft">
                No verified email is available.
              </p>
            </div>
          )}
        </div>
      </section>

      {/* Donation information */}
      <section className="mt-6 grid sm:grid-cols-2 gap-4">

        <div className="bg-white border border-line rounded-2xl p-6">
          <p className="text-sm text-ink-soft">
            Blood group
          </p>

          <p className="text-2xl font-bold text-ink mt-1">
            {donor.bloodGroup || "—"}
          </p>
        </div>

        <div className="bg-white border border-line rounded-2xl p-6">
          <p className="text-sm text-ink-soft">
            Total donations
          </p>

          <p className="text-2xl font-bold text-ink mt-1">
            {donor.totalDonations ?? 0}
          </p>
        </div>

        <div className="bg-white border border-line rounded-2xl p-6">
          <p className="text-sm text-ink-soft">
            Last donation
          </p>

          <p className="text-base font-semibold text-ink mt-1">
            {formatDate(donor.lastDonationDate)}
          </p>
        </div>

        <div className="bg-white border border-line rounded-2xl p-6">
          <p className="text-sm text-ink-soft">
            Eligibility
          </p>

          {donor.isEligible ? (
            <p className="text-base font-semibold text-teal mt-1">
              Eligible now
            </p>
          ) : (
            <p className="text-base font-semibold text-ink mt-1">
              Eligible after{" "}
              {formatDate(donor.eligibleByDate)}
            </p>
          )}
        </div>
      </section>

      {/* Medical disclaimer */}
      <section className="mt-6 p-5 rounded-2xl bg-line/40 border border-line">
        <p className="text-sm text-ink-soft leading-relaxed">
          <strong className="text-ink">
            Important:
          </strong>{" "}
          The eligibility shown here is based on the
          application's 90-day donation interval. Final
          donation and medical eligibility must always be
          determined by the blood bank or a qualified medical
          professional.
        </p>
      </section>
    </div>
  );
}