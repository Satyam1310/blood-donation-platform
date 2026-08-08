import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import api from "../api/axios";
import MilestoneBadge from "../components/MilestoneBadge";
import PulseLine from "../components/PulseLine";

const MILESTONES = [
  { threshold: 1, label: "First Drop" },
  { threshold: 5, label: "Regular Hero" },
  { threshold: 10, label: "Lifesaver" },
  { threshold: 25, label: "Champion" },
  { threshold: 50, label: "Legend" },
];

const EMPTY_RECORD_FORM = {
  date: "",
  hospital: "",
  location: "",
};

const inputClass =
  "w-full px-4 py-2.5 rounded-lg border border-line focus:border-crimson outline-none";

const formatName = (name = "") =>
  name
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ")
    .split(" ")
    .filter(Boolean)
    .map(
      (part) =>
        part.charAt(0).toUpperCase() +
        part.slice(1)
    )
    .join(" ");

export default function Dashboard() {
  const [history, setHistory] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Add / edit donation record
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(EMPTY_RECORD_FORM);
  const [submitting, setSubmitting] = useState(false);

  // Edit profile
  const [showProfileForm, setShowProfileForm] =
    useState(false);

  const [profileForm, setProfileForm] = useState({
    city: "",
    pincode: "",
    isAvailable: true,
  });

  const [profileSubmitting, setProfileSubmitting] =
    useState(false);

  // ---------------------------------------------------------
  // CONTACT PRIVACY
  // ---------------------------------------------------------

  const [privacyForm, setPrivacyForm] = useState({
    showPhone: false,
    showEmail: false,
  });

  const [privacySubmitting, setPrivacySubmitting] =
    useState(false);

  const [privacyMessage, setPrivacyMessage] =
    useState("");

  const [privacyError, setPrivacyError] =
    useState("");

  // ---------------------------------------------------------
  // LOAD PROFILE
  // ---------------------------------------------------------

  const loadProfile = async () => {
    try {
      const res = await api.get("/donors/me");
      setProfile(res.data.profile);
    } catch (err) {
      console.error(err);
    }
  };

  // ---------------------------------------------------------
  // LOAD USER / PRIVACY SETTINGS
  // ---------------------------------------------------------

  const loadPrivacySettings = async () => {
    try {
      const res = await api.get("/auth/me");

      const user = res.data.user;

      setPrivacyForm({
        showPhone: user?.showPhone === true,
        showEmail: user?.showEmail === true,
      });
    } catch (err) {
      console.error(
        "Failed to load privacy settings:",
        err
      );
    }
  };

  // ---------------------------------------------------------
  // LOAD DONATION HISTORY
  // ---------------------------------------------------------

  const loadHistory = async () => {
    setLoading(true);

    try {
      const res = await api.get("/donors/history");
      setHistory(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // ---------------------------------------------------------
  // LOAD PROFILE INTO EDIT FORM
  // ---------------------------------------------------------

  const loadProfileIntoForm = async () => {
    try {
      const res = await api.get("/donors/me");

      setProfileForm({
        city: res.data.profile.city || "",
        pincode: res.data.profile.pincode || "",
        isAvailable:
          res.data.profile.isAvailable,
      });
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    loadHistory();
    loadProfile();
    loadPrivacySettings();
  }, []);

  // ---------------------------------------------------------
  // DONATION FORM
  // ---------------------------------------------------------

  const handleChange = (e) =>
    setForm({
      ...form,
      [e.target.name]: e.target.value,
    });

  const openAddForm = () => {
    setEditingId(null);
    setForm(EMPTY_RECORD_FORM);
    setShowForm(true);
    setError("");
  };

  const openEditForm = (record) => {
    setEditingId(record._id);

    setForm({
      date: record.date?.slice(0, 10) || "",
      hospital: record.hospital || "",
      location: record.location || "",
    });

    setShowForm(true);
    setError("");
  };

  const handleSaveRecord = async (e) => {
    e.preventDefault();

    setError("");
    setSubmitting(true);

    try {
      if (editingId) {
        await api.put(
          `/donors/history/${editingId}`,
          form
        );
      } else {
        await api.post(
          "/donors/history",
          form
        );
      }

      setForm(EMPTY_RECORD_FORM);
      setShowForm(false);
      setEditingId(null);

      loadHistory();
      loadProfile();
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Failed to save the donation record."
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteRecord = async (id) => {
    if (
      !confirm(
        "Delete this donation record? This can't be undone."
      )
    ) {
      return;
    }

    try {
      await api.delete(
        `/donors/history/${id}`
      );

      loadHistory();
      loadProfile();
    } catch (err) {
      console.error(err);
    }
  };

  // ---------------------------------------------------------
  // PROFILE FORM
  // ---------------------------------------------------------

  const handleProfileChange = (e) => {
    const {
      name,
      type,
      value,
      checked,
    } = e.target;

    setProfileForm({
      ...profileForm,
      [name]:
        type === "checkbox"
          ? checked
          : value,
    });
  };

  const handleSaveProfile = async (e) => {
    e.preventDefault();

    setProfileSubmitting(true);

    try {
      await api.put(
        "/donors/me",
        profileForm
      );

      setShowProfileForm(false);

      await loadProfile();
      loadHistory();
    } catch (err) {
      console.error(err);
    } finally {
      setProfileSubmitting(false);
    }
  };

  // ---------------------------------------------------------
  // PRIVACY FORM
  // ---------------------------------------------------------

  const handlePrivacyChange = (e) => {
    const {
      name,
      checked,
    } = e.target;

    setPrivacyForm({
      ...privacyForm,
      [name]: checked,
    });

    setPrivacyMessage("");
    setPrivacyError("");
  };

  const handleSavePrivacy = async (e) => {
    e.preventDefault();

    setPrivacySubmitting(true);
    setPrivacyMessage("");
    setPrivacyError("");

    try {
      const res = await api.put(
        "/auth/privacy",
        privacyForm
      );

      const updatedUser = res.data.user;

      setPrivacyForm({
        showPhone:
          updatedUser.showPhone === true,
        showEmail:
          updatedUser.showEmail === true,
      });

      setPrivacyMessage(
        "Privacy settings saved successfully."
      );
    } catch (err) {
      setPrivacyError(
        err.response?.data?.message ||
          "Failed to update privacy settings."
      );
    } finally {
      setPrivacySubmitting(false);
    }
  };

  // ---------------------------------------------------------
  // LOADING
  // ---------------------------------------------------------

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto px-6 py-20 text-ink-soft font-mono text-sm">
        Loading your dashboard…
      </div>
    );
  }

  const totalDonations =
    history?.totalDonations || 0;

  const earnedLabels = new Set(
    (history?.earnedMilestones || []).map(
      (m) => m.label
    )
  );

  return (
    <div className="max-w-5xl mx-auto px-6 py-16">

      {/* ================================================= */}
      {/* COMPLETE OWN PROFILE */}
      {/* ================================================= */}

      <section className="mb-10 overflow-hidden rounded-3xl border border-line bg-white">

        <div className="px-6 sm:px-8 pt-7 pb-6 border-b border-line">

          <div className="flex items-start justify-between gap-6 flex-wrap">

            <div className="flex items-center gap-5">

              <div className="w-20 h-20 rounded-full bg-crimson-light text-crimson font-display text-2xl font-semibold flex items-center justify-center shrink-0">
                {(
                  profile?.user?.name ||
                  history?.donor?.name ||
                  "Y"
                )
                  .charAt(0)
                  .toUpperCase()}
              </div>

              <div>
                <p className="font-mono text-xs uppercase tracking-[0.2em] text-ink-soft mb-1">
                  Your profile
                </p>

                <h1 className="font-display text-3xl sm:text-4xl text-ink leading-tight">
                  {formatName(
                    profile?.user?.name ||
                      history?.donor?.name ||
                      "Your profile"
                  )}
                </h1>

                <p className="mt-1 text-sm sm:text-base text-ink-soft">
                  {profile?.city ||
                    history?.donor?.city ||
                    "No city set"}

                  <span className="mx-2">
                    ·
                  </span>

                  <span
                    className={
                      profile?.isAvailable
                        ? "text-teal font-medium"
                        : "text-ink-soft"
                    }
                  >
                    {profile?.isAvailable
                      ? "Available to donate"
                      : "Not available"}
                  </span>
                </p>
              </div>
            </div>

            <button
              onClick={() => {
                setShowProfileForm(
                  !showProfileForm
                );

                if (!showProfileForm) {
                  loadProfileIntoForm();
                }
              }}
              className="px-5 py-2.5 rounded-full border border-line text-sm font-medium hover:border-crimson hover:text-crimson transition-colors"
            >
              {showProfileForm
                ? "Cancel"
                : "Edit profile"}
            </button>
          </div>
        </div>

        {/* Personal details */}
        <div className="px-6 sm:px-8 py-7">

          <div className="flex items-center justify-between mb-4">

            <h2 className="font-display text-xl text-ink">
              Personal details
            </h2>

            <span className="font-mono text-xs uppercase tracking-widest text-ink-soft">
              Profile
            </span>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">

            <div className="p-5 rounded-2xl bg-line/30">
              <p className="text-xs uppercase tracking-widest text-ink-soft mb-2">
                Email
              </p>

              <p className="text-sm sm:text-base font-medium text-ink break-all">
                {profile?.user?.email ||
                  "Not available"}
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-line/30">
              <p className="text-xs uppercase tracking-widest text-ink-soft mb-2">
                Phone
              </p>

              <p className="text-sm sm:text-base font-medium text-ink">
                {profile?.user?.phone ||
                  "Not available"}
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-line/30">
              <p className="text-xs uppercase tracking-widest text-ink-soft mb-2">
                Blood group
              </p>

              <p className="font-mono text-xl font-semibold text-crimson">
                {profile?.bloodGroup ||
                  "—"}
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-line/30">
              <p className="text-xs uppercase tracking-widest text-ink-soft mb-2">
                Pincode
              </p>

              <p className="text-sm sm:text-base font-medium text-ink">
                {profile?.pincode ||
                  "Not set"}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ================================================= */}
      {/* EDIT PROFILE */}
      {/* ================================================= */}

      {showProfileForm && (
        <div className="mb-10 space-y-6">

          <form
            onSubmit={handleSaveProfile}
            className="p-6 border border-line rounded-2xl bg-white grid sm:grid-cols-2 gap-4"
          >
            <div>
              <label className="block text-sm font-medium text-ink mb-1.5">
                City{" "}
                <span className="text-ink-soft font-normal">
                  (update if you've moved)
                </span>
              </label>

              <input
                name="city"
                required
                value={profileForm.city}
                onChange={handleProfileChange}
                className={inputClass}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-ink mb-1.5">
                Pincode
              </label>

              <input
                name="pincode"
                value={profileForm.pincode}
                onChange={handleProfileChange}
                className={inputClass}
              />
            </div>

            <div className="flex items-center gap-2 sm:col-span-2">
              <input
                type="checkbox"
                id="isAvailable"
                name="isAvailable"
                checked={
                  profileForm.isAvailable
                }
                onChange={
                  handleProfileChange
                }
                className="w-4 h-4 accent-crimson"
              />

              <label
                htmlFor="isAvailable"
                className="text-sm text-ink"
              >
                I'm currently available to donate
              </label>
            </div>

            <div className="sm:col-span-2">
              <button
                type="submit"
                disabled={profileSubmitting}
                className="px-5 py-2.5 rounded-full bg-ink text-white font-medium hover:opacity-90 transition-opacity disabled:opacity-60"
              >
                {profileSubmitting
                  ? "Saving…"
                  : "Save profile"}
              </button>
            </div>
          </form>

          {/* ================================================= */}
          {/* CONTACT PRIVACY */}
          {/* ================================================= */}

          <form
            onSubmit={handleSavePrivacy}
            className="p-6 border border-line rounded-2xl bg-white"
          >
            <div className="mb-5">
              <p className="font-mono text-xs uppercase tracking-[0.2em] text-ink-soft mb-1">
                Privacy
              </p>

              <h2 className="font-display text-xl text-ink">
                Contact privacy
              </h2>

              <p className="text-sm text-ink-soft mt-1">
                Choose which verified contact details
                other logged-in users can see on your
                donor profile.
              </p>
            </div>

            <div className="space-y-4">

              {/* Phone */}
              <div className="flex items-start gap-3">
                <input
                  type="checkbox"
                  id="showPhone"
                  name="showPhone"
                  checked={
                    privacyForm.showPhone
                  }
                  onChange={
                    handlePrivacyChange
                  }
                  className="w-4 h-4 mt-1 accent-crimson"
                />

                <div>
                  <label
                    htmlFor="showPhone"
                    className="text-sm font-medium text-ink cursor-pointer"
                  >
                    Show my phone number
                  </label>

                  <p className="text-xs text-ink-soft mt-1">
                    Other logged-in users will be able
                    to see your phone number when viewing
                    your donor profile.
                  </p>

                  {!profile?.user
                    ?.phoneVerified && (
                    <p className="text-xs text-crimson-dark mt-1">
                      Phone verification is required
                      before your number can be displayed.
                    </p>
                  )}
                </div>
              </div>

              {/* Email */}
              <div className="flex items-start gap-3">
                <input
                  type="checkbox"
                  id="showEmail"
                  name="showEmail"
                  checked={
                    privacyForm.showEmail
                  }
                  onChange={
                    handlePrivacyChange
                  }
                  className="w-4 h-4 mt-1 accent-crimson"
                />

                <div>
                  <label
                    htmlFor="showEmail"
                    className="text-sm font-medium text-ink cursor-pointer"
                  >
                    Show my email address
                  </label>

                  <p className="text-xs text-ink-soft mt-1">
                    Other logged-in users will be able
                    to see your email when viewing your
                    donor profile.
                  </p>

                  {!profile?.user
                    ?.emailVerified && (
                    <p className="text-xs text-crimson-dark mt-1">
                      Verify your email before it can be
                      displayed.
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Privacy information */}
            <div className="mt-5 p-4 rounded-xl bg-line/30">
              <p className="text-xs text-ink-soft leading-relaxed">
                Your contact details are hidden by default.
                Only verified contact information that you
                explicitly choose to share can appear on your
                donor profile.
              </p>
            </div>

            {/* Success */}
            {privacyMessage && (
              <div className="mt-4 px-4 py-3 rounded-lg bg-teal-light text-teal text-sm">
                {privacyMessage}
              </div>
            )}

            {/* Error */}
            {privacyError && (
              <div className="mt-4 px-4 py-3 rounded-lg bg-crimson-light text-crimson-dark text-sm">
                {privacyError}
              </div>
            )}

            <div className="mt-5">
              <button
                type="submit"
                disabled={privacySubmitting}
                className="px-5 py-2.5 rounded-full bg-ink text-white font-medium hover:opacity-90 transition-opacity disabled:opacity-60"
              >
                {privacySubmitting
                  ? "Saving…"
                  : "Save privacy settings"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ================================================= */}
      {/* DONATION JOURNEY */}
      {/* ================================================= */}

      <div className="flex items-start justify-between flex-wrap gap-4 mb-10">

        <div>
          <p className="font-mono text-xs uppercase tracking-[0.2em] text-ink-soft mb-2">
            Your journey
          </p>

          <h2 className="font-display text-3xl sm:text-4xl text-ink mb-1">
            Your donation history
          </h2>

          <p className="text-ink-soft">
            Every donation, tracked in one place.
          </p>
        </div>

        <div className="flex gap-3">

          <Link
            to="/start-request"
            className="px-5 py-2.5 rounded-full border border-crimson text-crimson font-medium hover:bg-crimson-light transition-colors"
          >
            Need blood? Start a request
          </Link>

          <button
            onClick={() =>
              showForm
                ? setShowForm(false)
                : openAddForm()
            }
            className="px-5 py-2.5 rounded-full bg-crimson text-white font-medium hover:bg-crimson-dark transition-colors"
          >
            {showForm
              ? "Cancel"
              : "Log a donation"}
          </button>
        </div>
      </div>

      {/* ================================================= */}
      {/* DONATION FORM */}
      {/* ================================================= */}

      {showForm && (
        <form
          onSubmit={handleSaveRecord}
          className="mb-10 p-6 border border-line rounded-2xl bg-white grid sm:grid-cols-2 gap-4"
        >
          {error && (
            <div className="sm:col-span-2 px-4 py-3 rounded-lg bg-crimson-light text-crimson-dark text-sm">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-ink mb-1.5">
              Date
            </label>

            <input
              type="date"
              name="date"
              required
              value={form.date}
              onChange={handleChange}
              className={inputClass}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-ink mb-1.5">
              Hospital / camp
            </label>

            <input
              name="hospital"
              value={form.hospital}
              onChange={handleChange}
              className={inputClass}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-ink mb-1.5">
              Location
            </label>

            <input
              name="location"
              value={form.location}
              onChange={handleChange}
              className={inputClass}
            />
          </div>

          <p className="sm:col-span-2 text-xs text-ink-soft -mt-1">
            Blood group is pulled from your profile
            automatically — no need to enter it here.
          </p>

          <div className="sm:col-span-2">
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2.5 rounded-full bg-ink text-white font-medium hover:opacity-90 transition-opacity disabled:opacity-60"
            >
              {submitting
                ? "Saving…"
                : editingId
                ? "Update donation"
                : "Save donation"}
            </button>
          </div>
        </form>
      )}

      {/* ================================================= */}
      {/* ELIGIBILITY */}
      {/* ================================================= */}

      <div className="mb-10 p-6 border border-line rounded-2xl bg-white flex items-center justify-between flex-wrap gap-4">

        <div>
          <p className="font-mono text-xs uppercase tracking-[0.2em] text-ink-soft mb-1">
            Eligibility
          </p>

          {history?.isEligibleNow ||
          totalDonations === 0 ? (
            <p className="font-display text-2xl text-teal">
              You're eligible to donate now
            </p>
          ) : (
            <p className="font-display text-2xl text-ink">
              Eligible again on{" "}
              {new Date(
                history.nextEligibleDate
              ).toLocaleDateString(
                undefined,
                {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                }
              )}
            </p>
          )}
        </div>

        <div className="w-32 text-crimson/50">
          <PulseLine />
        </div>
      </div>

      {/* ================================================= */}
      {/* STATS */}
      {/* ================================================= */}

      <div className="grid sm:grid-cols-3 gap-6 mb-12">

        <div className="p-6 border border-line rounded-2xl bg-white">
          <p className="font-display text-4xl text-ink">
            {totalDonations}
          </p>

          <p className="text-sm text-ink-soft mt-1">
            Total donations
          </p>
        </div>

        <div className="p-6 border border-line rounded-2xl bg-white">
          <p className="font-display text-4xl text-ink">
            {history?.estimatedLivesImpacted ||
              0}
          </p>

          <p className="text-sm text-ink-soft mt-1">
            Estimated lives impacted
          </p>
        </div>

        <div className="p-6 border border-line rounded-2xl bg-white">
          <p className="font-display text-4xl text-ink">
            {history?.nextMilestone
              ? history.nextMilestone.threshold -
                totalDonations
              : "—"}
          </p>

          <p className="text-sm text-ink-soft mt-1">
            {history?.nextMilestone
              ? `Donations to "${history.nextMilestone.label}"`
              : "All milestones earned"}
          </p>
        </div>
      </div>

      {/* ================================================= */}
      {/* MILESTONE TIMELINE */}
      {/* ================================================= */}

      <div className="mb-12">

        <div className="mb-6">
          <p className="font-mono text-xs uppercase tracking-[0.2em] text-ink-soft mb-1">
            Progress
          </p>

          <h2 className="font-display text-xl text-ink">
            Milestones
          </h2>
        </div>

        <div className="flex gap-6 overflow-x-auto pb-2">

          {MILESTONES.map((m) => (
            <MilestoneBadge
              key={m.threshold}
              label={m.label}
              threshold={m.threshold}
              earned={earnedLabels.has(
                m.label
              )}
              isNext={
                history?.nextMilestone
                  ?.label === m.label
              }
            />
          ))}
        </div>
      </div>

      {/* ================================================= */}
      {/* DONATION RECORDS */}
      {/* ================================================= */}

      <div>

        <div className="mb-6">
          <p className="font-mono text-xs uppercase tracking-[0.2em] text-ink-soft mb-1">
            History
          </p>

          <h2 className="font-display text-xl text-ink">
            Donation records
          </h2>
        </div>

        {history?.records?.length ? (
          <div className="space-y-3">

            {history.records.map((r) => (
              <div
                key={r._id}
                className="flex items-center justify-between p-4 border border-line rounded-xl bg-white gap-4"
              >
                <div>

                  <p className="font-medium text-ink">
                    {new Date(
                      r.date
                    ).toLocaleDateString(
                      undefined,
                      {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                      }
                    )}
                  </p>

                  <p className="text-sm text-ink-soft">
                    {r.hospital || "—"}{" "}
                    {r.location
                      ? `· ${r.location}`
                      : ""}
                  </p>
                </div>

                <div className="flex items-center gap-2 shrink-0">

                  <span className="font-mono text-sm px-3 py-1 rounded-full bg-crimson-light text-crimson">
                    {r.bloodGroup}
                  </span>

                  <button
                    onClick={() =>
                      openEditForm(r)
                    }
                    className="text-sm font-medium text-ink-soft hover:text-ink"
                  >
                    Edit
                  </button>

                  <button
                    onClick={() =>
                      handleDeleteRecord(
                        r._id
                      )
                    }
                    className="text-sm font-medium text-ink-soft hover:text-crimson"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-ink-soft">
            No donations logged yet. Add your first
            one above.
          </p>
        )}
      </div>
    </div>
  );
}