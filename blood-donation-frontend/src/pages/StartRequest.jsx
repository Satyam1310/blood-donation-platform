import { useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/axios";
import LocationPicker from "../components/LocationPicker";

const BLOOD_GROUPS = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];

export default function StartRequest() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    bloodGroup: "",
    hospital: "",
    city: "",
    unitsNeeded: 1,
    urgency: "medium",
  });
  const [location, setLocation] = useState(null);
  const [document, setDocument] = useState(null);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleFileChange = (e) => setDocument(e.target.files[0] || null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!location) {
      setError("Please select a location on the map.");
      return;
    }
    if (!document) {
      setError("Please attach a hospital document (prescription, admission slip, etc.).");
      return;
    }

    setSubmitting(true);
    try {
      const data = new FormData();
      Object.entries(form).forEach(([key, val]) => data.append(key, val));
      data.append("lat", location.lat);
      data.append("lng", location.lng);
      data.append("document", document);

      await api.post("/requests", data);
      setSubmitted(true);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to submit the request. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const inputClass =
    "w-full px-4 py-2.5 rounded-lg border border-line focus:border-crimson outline-none";

  if (submitted) {
    return (
      <div className="max-w-lg mx-auto px-6 py-24 text-center">
        <h1 className="font-display text-3xl text-ink mb-3">Request submitted</h1>
        <p className="text-ink-soft mb-8">
          Your request is <span className="font-medium text-teal">live now</span> and visible to
          donors. There's no admin approval step — the community keeps things honest instead: if
          enough people report a request as fake, it's automatically taken down.
        </p>
        <button
          onClick={() => navigate("/requests")}
          className="px-6 py-3 rounded-full bg-crimson text-white font-medium hover:bg-crimson-dark transition-colors"
        >
          View requests
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-6 py-16">
      <p className="font-mono text-xs uppercase tracking-widest text-crimson mb-4">
        Need blood?
      </p>
      <h1 className="font-display text-3xl text-ink mb-2">Start a request</h1>
      <p className="text-ink-soft mb-10">
        Fill in the details below. A hospital document is required as proof — your request
        goes live immediately, and stays up unless the community reports it as fake.
      </p>

      {error && (
        <div className="mb-6 px-4 py-3 rounded-lg bg-crimson-light text-crimson-dark text-sm">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-ink mb-1.5">Blood type needed</label>
            <select
              name="bloodGroup"
              required
              value={form.bloodGroup}
              onChange={handleChange}
              className={inputClass}
            >
              <option value="">Select blood type</option>
              {BLOOD_GROUPS.map((bg) => (
                <option key={bg} value={bg}>
                  {bg}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-ink mb-1.5">Units needed</label>
            <input
              type="number"
              name="unitsNeeded"
              min={1}
              required
              value={form.unitsNeeded}
              onChange={handleChange}
              className={inputClass}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-ink mb-1.5">Hospital name</label>
            <input
              name="hospital"
              required
              value={form.hospital}
              onChange={handleChange}
              className={inputClass}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-ink mb-1.5">City</label>
            <input name="city" required value={form.city} onChange={handleChange} className={inputClass} />
          </div>

          <div>
            <label className="block text-sm font-medium text-ink mb-1.5">Urgency</label>
            <select name="urgency" value={form.urgency} onChange={handleChange} className={inputClass}>
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="critical">Critical</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-ink mb-1.5">
            Pin the location on the map
          </label>
          <LocationPicker value={location} onChange={setLocation} />
        </div>

        <div>
          <label className="block text-sm font-medium text-ink mb-1.5">
            Hospital document (prescription, admission slip, blood requisition form)
          </label>
          <input
            type="file"
            accept=".pdf,.jpg,.jpeg,.png"
            onChange={handleFileChange}
            className="w-full text-sm text-ink-soft file:mr-4 file:py-2.5 file:px-4 file:rounded-lg file:border-0 file:bg-crimson-light file:text-crimson-dark file:font-medium file:cursor-pointer"
          />
          <p className="text-xs text-ink-soft mt-1.5">PDF, JPG, or PNG — max 5MB.</p>
        </div>

        <button
          type="submit"
          disabled={submitting}
          className="w-full py-3 rounded-full bg-crimson text-white font-medium hover:bg-crimson-dark transition-colors disabled:opacity-60"
        >
          {submitting ? "Submitting…" : "Submit request for verification"}
        </button>
      </form>
    </div>
  );
}
