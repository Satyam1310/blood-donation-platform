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
        part.charAt(0).toUpperCase() + part.slice(1)
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

  // Complete personal profile editing
  const [showProfileForm, setShowProfileForm] = useState(false);
  const [profileForm, setProfileForm] = useState({
    name: "",
    email: "",
    phone: "",
    bloodGroup: "",
    city: "",
    pincode: "",
    isAvailable: true,
  });
  const [profileSubmitting, setProfileSubmitting] = useState(false);

  // Contact privacy settings
  const [showPrivacy, setShowPrivacy] = useState(false);
  const [privacyForm, setPrivacyForm] = useState({
    showPhone: false,
    showEmail: false,
  });
  const [privacySubmitting, setPrivacySubmitting] = useState(false);
  const [privacyMessage, setPrivacyMessage] = useState("");
  const [privacyError, setPrivacyError] = useState("");

  // Email verification
  const [showEmailVerification, setShowEmailVerification] =
    useState(false);
  const [verificationCode, setVerificationCode] = useState("");
  const [verificationSending, setVerificationSending] =
    useState(false);
  const [verificationSubmitting, setVerificationSubmitting] =
    useState(false);
  const [verificationMessage, setVerificationMessage] =
    useState("");
  const [verificationError, setVerificationError] =
    useState("");
  const [verificationLocked, setVerificationLocked] = useState(false);

  const loadProfile = async () => {
    try {
      const res = await api.get("/donors/me");
      setProfile(res.data.profile);
    } catch (err) {
      console.error(err);
    }
  };

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

  const loadProfileIntoForm = async () => {
    try {
      const res = await api.get("/donors/me");
      const currentProfile = res.data.profile;
      const user = currentProfile?.user || {};

      setProfileForm({
        name: user.name || "",
        email: user.email || "",
        phone: user.phone || "",
        bloodGroup: currentProfile?.bloodGroup || "",
        city: currentProfile?.city || "",
        pincode: currentProfile?.pincode || "",
        isAvailable: currentProfile?.isAvailable ?? true,
      });

      setPrivacyForm({
        showPhone: user.showPhone === true,
        showEmail: user.showEmail === true,
      });
    } catch (err) {
      console.error(err);

      setError(
        err.response?.data?.message ||
          "Unable to load your profile."
      );
    }
  };

  useEffect(() => {
    loadHistory();
    loadProfile();
  }, []);

  const handleChange = (e) => {
    setForm({
      ...form,
      [e.target.name]: e.target.value,
    });
  };

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
        await api.post("/donors/history", form);
      }

      setForm(EMPTY_RECORD_FORM);
      setShowForm(false);
      setEditingId(null);

      await loadHistory();
      await loadProfile();
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
      await api.delete(`/donors/history/${id}`);
      await loadHistory();
      await loadProfile();
    } catch (err) {
      console.error(err);
    }
  };

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
        type === "checkbox" ? checked : value,
    });
  };

  const handleSaveProfile = async (e) => {
    e.preventDefault();

    setProfileSubmitting(true);
    setError("");

    try {
      const res = await api.put(
        "/donors/me",
        profileForm
      );

      /*
       * If the email was changed, the backend marks the
       * new email as unverified.
       */
      if (
        res.data?.requiresEmailVerification ||
        res.data?.emailChanged
      ) {
        setShowEmailVerification(true);
        setVerificationCode("");
        setVerificationMessage("");
        setVerificationError("");
      }

      await loadProfile();
      await loadHistory();

      setShowProfileForm(false);
    } catch (err) {
      console.error(err);

      setError(
        err.response?.data?.message ||
          "Failed to update your profile."
      );
    } finally {
      setProfileSubmitting(false);
    }
  };

  const handlePrivacyChange = (e) => {
    const {
      name,
      checked,
    } = e.target;

    setPrivacyForm((current) => ({
      ...current,
      [name]: checked,
    }));

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
          updatedUser?.showPhone === true,
        showEmail:
          updatedUser?.showEmail === true,
      });

      await loadProfile();

      setPrivacyMessage(
        "Privacy settings updated successfully."
      );
    } catch (err) {
      console.error(err);

      setPrivacyError(
        err.response?.data?.message ||
          "Failed to update privacy settings."
      );
    } finally {
      setPrivacySubmitting(false);
    }
  };

  // ---------------------------------------------------------
  // EMAIL VERIFICATION
  // ---------------------------------------------------------

  const handleSendVerificationCode = async () => {
    setVerificationSending(true);
    setVerificationMessage("");
    setVerificationError("");

    try {
      const res = await api.post(
        "/auth/verify/email/send"
      );

      setVerificationMessage(
        res.data?.message ||
          "Verification code sent to your email."
      );

      setVerificationCode("");
      setShowEmailVerification(true);
    } catch (err) {
      console.error(err);

      setVerificationError(
        err.response?.data?.message ||
          "Failed to send verification code."
      );
    } finally {
      setVerificationSending(false);
    }
  };

  const handleVerifyEmail = async (e) => {
    e.preventDefault();

    setVerificationMessage("");
    setVerificationError("");

    if (!/^\d{6}$/.test(verificationCode)) {
      setVerificationError(
        "Please enter the 6-digit verification code."
      );
      return;
    }

    setVerificationSubmitting(true);

    try {
      const res = await api.post(
        "/auth/verify/email",
        {
          code: verificationCode,
        }
      );

      setVerificationMessage(
        res.data?.message ||
          "Email verified successfully."
      );

      setVerificationCode("");

      await loadProfile();

      /*
       * Keep the success message visible briefly.
       * The section can then be closed by the user.
       */
    } catch (err) {
      console.error(err);

    const message =
      err.response?.data?.message ||
      "Email verification failed.";

    if (err.response?.status === 429) {
      setVerificationLocked(true);
    }

    const attemptsRemaining =
      err.response?.data?.attemptsRemaining;

    if (attemptsRemaining !== undefined) {
      setVerificationError(
        `${message}. ${attemptsRemaining} attempt${
          attemptsRemaining === 1 ? "" : "s"
        } remaining.`
      );
    } else {
      setVerificationError(message);
    }
    } finally {
      setVerificationSubmitting(false);
    }
  };

  const openEmailVerification = () => {
    setVerificationMessage("");
    setVerificationError("");
    setVerificationCode("");
    setShowEmailVerification(true);
  };

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

  const emailVerified =
    profile?.user?.emailVerified === true;

  return (
    <div className="max-w-5xl mx-auto px-6 py-16">

      {/* =====================================================
          COMPLETE OWN PROFILE
      ====================================================== */}

      <section
        className={`mb-8 overflow-hidden rounded-3xl border border-line bg-white transition-all duration-300 ${
          showProfileForm || showPrivacy
            ? "shadow-lg -translate-y-0.5"
            : "shadow-sm hover:shadow-md hover:-translate-y-1"
        }`}
      >
        <div className="px-6 sm:px-8 pt-7 pb-6 border-b border-line">
          <div className="flex items-start justify-between gap-6 flex-wrap">

            <div className="flex items-center gap-5 min-w-0">

              <div className="w-20 h-20 rounded-full bg-crimson-light text-crimson font-display text-2xl font-semibold flex items-center justify-center shrink-0 transition-transform duration-300 hover:scale-105">
                {(profile?.user?.name ||
                  history?.donor?.name ||
                  "Y")
                  .charAt(0)
                  .toUpperCase()}
              </div>

              <div className="min-w-0">

                <p className="font-mono text-xs uppercase tracking-[0.2em] text-ink-soft mb-1">
                  Your profile
                </p>

                <h1 className="font-display text-3xl sm:text-4xl text-ink leading-tight break-words">
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

            <div className="flex items-center gap-3">

              <button
                type="button"
                onClick={() => {
                  setShowProfileForm(false);

                  if (!showPrivacy) {
                    setPrivacyMessage("");
                    setPrivacyError("");
                    loadProfileIntoForm();
                  }

                  setShowPrivacy(
                    (current) => !current
                  );
                }}
                className="px-5 py-2.5 rounded-full border border-line text-sm font-medium hover:border-crimson hover:text-crimson transition-colors"
              >
                {showPrivacy
                  ? "Close privacy"
                  : "Privacy"}
              </button>

              <button
                type="button"
                onClick={() => {
                  setShowPrivacy(false);

                  setShowProfileForm(
                    (current) => !current
                  );

                  if (!showProfileForm) {
                    setError("");
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
        </div>

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

            {/* EMAIL */}

            <div className="p-5 rounded-2xl bg-line/30 min-w-0">

              <p className="text-xs uppercase tracking-widest text-ink-soft mb-2">
                Email
              </p>

              <p className="text-sm sm:text-base font-medium text-ink break-all leading-relaxed">
                {profile?.user?.email ||
                  "Not available"}
              </p>

              <div className="flex items-center gap-2 flex-wrap mt-2">

                <span
                  className={`text-xs px-2.5 py-1 rounded-full ${
                    emailVerified
                      ? "bg-teal-light text-teal"
                      : "bg-line text-ink-soft"
                  }`}
                >
                  {emailVerified
                    ? "Email verified"
                    : "Email not verified"}
                </span>

                {!emailVerified && (
                  <button
                    type="button"
                    onClick={
                      openEmailVerification
                    }
                    className="text-xs px-2.5 py-1 rounded-full bg-crimson-light text-crimson font-medium hover:opacity-80 transition-opacity"
                  >
                    Verify email
                  </button>
                )}

              </div>

            </div>

            {/* PHONE */}

            <div className="p-5 rounded-2xl bg-line/30 min-w-0">

              <p className="text-xs uppercase tracking-widest text-ink-soft mb-2">
                Phone
              </p>

              <p className="text-sm sm:text-base font-medium text-ink break-words">
                {profile?.user?.phone ||
                  "Not available"}
              </p>

              <span className="inline-block mt-2 text-xs px-2.5 py-1 rounded-full bg-teal-light text-teal">
                {profile?.user?.phoneVerified
                  ? "Phone verified"
                  : "Phone not verified"}
              </span>

            </div>

            {/* BLOOD GROUP */}

            <div className="p-5 rounded-2xl bg-line/30">

              <p className="text-xs uppercase tracking-widest text-ink-soft mb-2">
                Blood group
              </p>

              <p className="font-mono text-xl font-semibold text-crimson">
                {profile?.bloodGroup || "—"}
              </p>

            </div>

            {/* PINCODE */}

            <div className="p-5 rounded-2xl bg-line/30">

              <p className="text-xs uppercase tracking-widest text-ink-soft mb-2">
                Pincode
              </p>

              <p className="text-sm sm:text-base font-medium text-ink">
                {profile?.pincode ||
                  "Not set"}
              </p>

            </div>

            {/* CITY */}

            <div className="p-5 rounded-2xl bg-line/30">

              <p className="text-xs uppercase tracking-widest text-ink-soft mb-2">
                City
              </p>

              <p className="text-sm sm:text-base font-medium text-ink">
                {profile?.city ||
                  "Not set"}
              </p>

            </div>

            {/* AVAILABILITY */}

            <div className="p-5 rounded-2xl bg-line/30">

              <p className="text-xs uppercase tracking-widest text-ink-soft mb-2">
                Availability
              </p>

              <p
                className={
                  profile?.isAvailable
                    ? "text-sm font-medium text-teal"
                    : "text-sm font-medium text-ink-soft"
                }
              >
                {profile?.isAvailable
                  ? "Available"
                  : "Not available"}
              </p>

            </div>

            {/* ELIGIBILITY */}

            <div className="p-5 rounded-2xl bg-line/30">

              <p className="text-xs uppercase tracking-widest text-ink-soft mb-2">
                Eligibility
              </p>

              <p
                className={
                  history?.isEligibleNow
                    ? "text-sm font-medium text-teal"
                    : "text-sm font-medium text-ink"
                }
              >
                {history?.isEligibleNow
                  ? "Eligible now"
                  : history?.nextEligibleDate
                  ? `Eligible ${new Date(
                      history.nextEligibleDate
                    ).toLocaleDateString(
                      undefined,
                      {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                      }
                    )}`
                  : "Not currently eligible"}
              </p>

            </div>

            {/* TOTAL DONATIONS */}

            <div className="p-5 rounded-2xl bg-line/30">

              <p className="text-xs uppercase tracking-widest text-ink-soft mb-2">
                Total donations
              </p>

              <p className="text-sm font-medium text-ink">
                {totalDonations}
              </p>

            </div>

          </div>
        </div>
      </section>

      {/* =====================================================
          EMAIL VERIFICATION
      ====================================================== */}

      {showEmailVerification && !emailVerified && (
        <section className="mb-8 p-6 sm:p-8 border border-line rounded-2xl bg-white animate-[fadeIn_0.25s_ease-out]">

          <div className="flex items-start justify-between gap-4 flex-wrap">

            <div>
              <p className="font-mono text-xs uppercase tracking-[0.2em] text-ink-soft mb-1">
                Account security
              </p>

              <h2 className="font-display text-2xl text-ink">
                Verify your email
              </h2>

              <p className="text-sm text-ink-soft mt-2">
                Your email address is currently not verified.
                Verify it to confirm that you own this email
                address.
              </p>

              <p className="text-sm font-medium text-ink mt-2 break-all">
                {profile?.user?.email}
              </p>
            </div>

            <button
              type="button"
              onClick={() =>
                setShowEmailVerification(false)
              }
              className="text-sm text-ink-soft hover:text-crimson transition-colors"
            >
              Close
            </button>

          </div>

          {verificationMessage && (
            <div className="mt-5 px-4 py-3 rounded-lg bg-teal-light text-teal text-sm">
              {verificationMessage}
            </div>
          )}

          {verificationError && (
            <div className="mt-5 px-4 py-3 rounded-lg bg-crimson-light text-crimson text-sm">
              {verificationError}
            </div>
          )}

          <div className="mt-6">

            <button
              type="button"
              onClick={handleSendVerificationCode}
              disabled={verificationLocked || verificationSending}
              className="px-5 py-2.5 rounded-full bg-ink text-white font-medium hover:opacity-90 transition-opacity disabled:opacity-60"
            >
              {verificationSending
                ? "Sending…"
                : "Send verification code"}
            </button>

          </div>

          <form
            onSubmit={handleVerifyEmail}
            className="mt-6 pt-6 border-t border-line"
          >

            <label className="block text-sm font-medium text-ink mb-2">
              Verification code
            </label>

            <div className="flex flex-col sm:flex-row gap-3">

              <input
                type="text"
                inputMode="numeric"
                maxLength={6}
                autoComplete="one-time-code"
                placeholder="Enter 6-digit code"
                value={verificationCode}
                disabled={verificationLocked}
                onChange={(e) => {
                  const value =
                    e.target.value
                      .replace(/\D/g, "")
                      .slice(0, 6);

                  setVerificationCode(value);
                  setVerificationError("");
                }}
                className={`${inputClass} sm:max-w-xs text-center tracking-[0.35em] font-mono`}
              />

              <button
                type="submit"
                disabled={
                  verificationLocked ||
                  verificationSubmitting ||
                  verificationCode.length !== 6
                }
                className="px-5 py-2.5 rounded-full bg-crimson text-white font-medium hover:bg-crimson-dark transition-colors disabled:opacity-60"
              >
                {verificationSubmitting
                  ? "Verifying…"
                  : "Verify email"}
              </button>

            </div>

            <p className="mt-3 text-xs text-ink-soft">
              The verification code is valid for 10 minutes.
            </p>

          </form>

        </section>
      )}

      {/* =====================================================
          EDIT COMPLETE PERSONAL PROFILE
      ====================================================== */}

      {showProfileForm && (
        <form
          onSubmit={handleSaveProfile}
          className="mb-8 p-6 sm:p-8 border border-line rounded-2xl bg-white grid sm:grid-cols-2 gap-5 animate-[fadeIn_0.25s_ease-out]"
        >

          <div className="sm:col-span-2">

            <p className="font-mono text-xs uppercase tracking-[0.2em] text-ink-soft mb-1">
              Edit profile
            </p>

            <h2 className="font-display text-2xl text-ink">
              Update your personal information
            </h2>

          </div>

          {error && (
            <div className="sm:col-span-2 px-4 py-3 rounded-lg bg-crimson-light text-crimson text-sm">
              {error}
            </div>
          )}

          <div>

            <label className="block text-sm font-medium text-ink mb-1.5">
              Full name
            </label>

            <input
              name="name"
              type="text"
              required
              value={profileForm.name}
              onChange={handleProfileChange}
              className={inputClass}
            />

          </div>

          <div>

            <label className="block text-sm font-medium text-ink mb-1.5">
              Email
            </label>

            <input
              name="email"
              type="email"
              required
              value={profileForm.email}
              onChange={handleProfileChange}
              className={inputClass}
            />

            <p className="mt-1.5 text-xs text-ink-soft">
              Changing your email will require
              verification of the new address.
            </p>

          </div>

          <div>

            <label className="block text-sm font-medium text-ink mb-1.5">
              Phone
            </label>

            <input
              name="phone"
              type="tel"
              value={profileForm.phone}
              onChange={handleProfileChange}
              className={inputClass}
            />

            <p className="mt-1.5 text-xs text-ink-soft">
              Phone verification is treated as
              verified in V2.
            </p>

          </div>

          <div>

            <label className="block text-sm font-medium text-ink mb-1.5">
              Blood group
            </label>

            <select
              name="bloodGroup"
              required
              value={profileForm.bloodGroup}
              onChange={handleProfileChange}
              className={inputClass}
            >
              <option value="">
                Select blood group
              </option>

              {[
                "A+",
                "A-",
                "B+",
                "B-",
                "AB+",
                "AB-",
                "O+",
                "O-",
              ].map((group) => (
                <option
                  key={group}
                  value={group}
                >
                  {group}
                </option>
              ))}
            </select>

          </div>

          <div>

            <label className="block text-sm font-medium text-ink mb-1.5">
              City
            </label>

            <input
              name="city"
              type="text"
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
              type="text"
              inputMode="numeric"
              value={profileForm.pincode}
              onChange={handleProfileChange}
              className={inputClass}
            />

          </div>

          <div className="sm:col-span-2 p-4 rounded-xl bg-line/30 flex items-start gap-3">

            <input
              type="checkbox"
              id="profileIsAvailable"
              name="isAvailable"
              checked={profileForm.isAvailable}
              onChange={handleProfileChange}
              className="w-4 h-4 mt-1 accent-crimson"
            />

            <div>

              <label
                htmlFor="profileIsAvailable"
                className="text-sm font-medium text-ink cursor-pointer"
              >
                I'm currently available to donate
              </label>

              <p className="text-xs text-ink-soft mt-1">
                Availability means you are willing to be
                contacted. It does not override the
                90-day eligibility rule.
              </p>

            </div>

          </div>

          <div className="sm:col-span-2 flex gap-3">

            <button
              type="submit"
              disabled={profileSubmitting}
              className="px-5 py-2.5 rounded-full bg-ink text-white font-medium hover:opacity-90 transition-opacity disabled:opacity-60"
            >
              {profileSubmitting
                ? "Saving…"
                : "Save profile"}
            </button>

            <button
              type="button"
              onClick={() =>
                setShowProfileForm(false)
              }
              disabled={profileSubmitting}
              className="px-5 py-2.5 rounded-full border border-line text-ink font-medium hover:border-ink transition-colors disabled:opacity-60"
            >
              Cancel
            </button>

          </div>

        </form>
      )}

      {/* =====================================================
          PRIVACY
      ====================================================== */}

      {showPrivacy && (
        <form
          onSubmit={handleSavePrivacy}
          className="mb-8 p-6 sm:p-8 border border-line rounded-2xl bg-white animate-[fadeIn_0.25s_ease-out]"
        >

          <p className="font-mono text-xs uppercase tracking-[0.2em] text-ink-soft mb-1">
            Privacy
          </p>

          <h2 className="font-display text-2xl text-ink">
            Contact privacy
          </h2>

          <p className="text-sm text-ink-soft mt-1 mb-6">
            Choose which verified contact details other
            logged-in users can see on your donor profile.
          </p>

          <div className="space-y-5">

            <label className="flex items-start gap-3 cursor-pointer">

              <input
                type="checkbox"
                name="showPhone"
                checked={privacyForm.showPhone}
                onChange={handlePrivacyChange}
                className="w-4 h-4 mt-1 accent-crimson"
              />

              <span>

                <span className="block text-sm font-medium text-ink">
                  Show my phone number
                </span>

                <span className="block text-xs text-ink-soft mt-1">
                  Your phone can be displayed to
                  authenticated users viewing your
                  donor profile.
                </span>

              </span>

            </label>

            <label className="flex items-start gap-3 cursor-pointer">

              <input
                type="checkbox"
                name="showEmail"
                checked={privacyForm.showEmail}
                onChange={handlePrivacyChange}
                className="w-4 h-4 mt-1 accent-crimson"
              />

              <span>

                <span className="block text-sm font-medium text-ink">
                  Show my email address
                </span>

                <span className="block text-xs text-ink-soft mt-1">
                  Your email can be displayed only when
                  it is verified.
                </span>

              </span>

            </label>

          </div>

          <div className="mt-5 p-4 rounded-xl bg-line/30 text-xs text-ink-soft leading-relaxed">
            Contact information is only exposed when
            the corresponding privacy setting is enabled
            and the contact method is verified.
          </div>

          {privacyMessage && (
            <div className="mt-4 px-4 py-3 rounded-lg bg-teal-light text-teal text-sm">
              {privacyMessage}
            </div>
          )}

          {privacyError && (
            <div className="mt-4 px-4 py-3 rounded-lg bg-crimson-light text-crimson text-sm">
              {privacyError}
            </div>
          )}

          <div className="mt-5 flex gap-3">

            <button
              type="submit"
              disabled={privacySubmitting}
              className="px-5 py-2.5 rounded-full bg-ink text-white font-medium hover:opacity-90 transition-opacity disabled:opacity-60"
            >
              {privacySubmitting
                ? "Saving…"
                : "Save privacy settings"}
            </button>

            <button
              type="button"
              onClick={() =>
                setShowPrivacy(false)
              }
              disabled={privacySubmitting}
              className="px-5 py-2.5 rounded-full border border-line text-ink font-medium hover:border-ink transition-colors disabled:opacity-60"
            >
              Close
            </button>

          </div>

        </form>
      )}

      {/* =====================================================
          DONATION JOURNEY HEADER
      ====================================================== */}

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

      {/* =====================================================
          DONATION FORM
      ====================================================== */}

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

      {/* =====================================================
          ELIGIBILITY CALCULATOR
      ====================================================== */}

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
              ).toLocaleDateString(undefined, {
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </p>
          )}

        </div>

        <div className="w-32 text-crimson/50">
          <PulseLine />
        </div>

      </div>

      {/* =====================================================
          STATS
      ====================================================== */}

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
            {history?.estimatedLivesImpacted || 0}
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

      {/* =====================================================
          MILESTONE TIMELINE
      ====================================================== */}

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
              earned={earnedLabels.has(m.label)}
              isNext={
                history?.nextMilestone?.label ===
                m.label
              }
            />
          ))}

        </div>

      </div>

      {/* =====================================================
          DONATION RECORDS
      ====================================================== */}

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
                      handleDeleteRecord(r._id)
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
            No donations logged yet. Add your first one above.
          </p>

        )}

      </div>

    </div>
  );
}