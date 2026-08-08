import { useState } from "react";
import api from "../api/axios";
import DonorCard from "../components/DonorCard";

const BLOOD_GROUPS = [
  "",
  "A+",
  "A-",
  "B+",
  "B-",
  "AB+",
  "AB-",
  "O+",
  "O-",
];

export default function SearchDonors() {
  const [filters, setFilters] = useState({
    bloodGroup: "",
    city: "",
    availableOnly: false,
    eligibleOnly: false,
  });

  const [donors, setDonors] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  const handleChange = (e) => {
    const { name, type, value, checked } = e.target;

    setFilters({
      ...filters,
      [name]: type === "checkbox" ? checked : value,
    });
  };

  const handleSearch = async (e) => {
    e.preventDefault();

    const city = filters.city.trim();

    // Blood group and city are required.
    if (!filters.bloodGroup || !city) {
      setSearched(true);
      setDonors([]);
      return;
    }

    setLoading(true);
    setSearched(true);

    try {
      const params = {
        bloodGroup: filters.bloodGroup,
        city,
      };

      if (filters.availableOnly) {
        params.availableOnly = "true";
      }

      if (filters.eligibleOnly) {
        params.eligibleOnly = "true";
      }

      const res = await api.get("/donors/search", {
        params,
      });

      setDonors(res.data.donors || []);
    } catch (err) {
      console.error(err);
      setDonors([]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-6 py-10">
      <h1 className="text-4xl font-bold text-ink">
        Find a donor
      </h1>

      <p className="mt-2 text-lg text-ink-soft">
        Find suitable blood donors in your city.
      </p>

      <form
        onSubmit={handleSearch}
        className="mt-8 p-6 border border-line rounded-2xl bg-white mb-10 grid sm:grid-cols-2 gap-4"
      >
        {/* Blood group */}
        <div>
          <label className="block text-sm font-medium text-ink mb-1.5">
            Blood group <span className="text-crimson">*</span>
          </label>

          <select
            name="bloodGroup"
            value={filters.bloodGroup}
            onChange={handleChange}
            required
            className="w-full px-4 py-2.5 rounded-lg border border-line focus:border-crimson outline-none"
          >
            {BLOOD_GROUPS.map((bg) => (
              <option key={bg} value={bg}>
                {bg || "Select blood group"}
              </option>
            ))}
          </select>
        </div>

        {/* City */}
        <div>
          <label className="block text-sm font-medium text-ink mb-1.5">
            City <span className="text-crimson">*</span>
          </label>

          <input
            name="city"
            value={filters.city}
            onChange={handleChange}
            placeholder="e.g. Jamshedpur"
            required
            className="w-full px-4 py-2.5 rounded-lg border border-line focus:border-crimson outline-none"
          />
        </div>

        {/* Available only */}
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="availableOnly"
            name="availableOnly"
            checked={filters.availableOnly}
            onChange={handleChange}
            className="w-4 h-4 accent-crimson"
          />

          <label
            htmlFor="availableOnly"
            className="text-sm text-ink"
          >
            Available only
          </label>
        </div>

        {/* Eligible only */}
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="eligibleOnly"
            name="eligibleOnly"
            checked={filters.eligibleOnly}
            onChange={handleChange}
            className="w-4 h-4 accent-crimson"
          />

          <label
            htmlFor="eligibleOnly"
            className="text-sm text-ink"
          >
            Eligible now only
          </label>
        </div>

        {/* Search button */}
        <div className="sm:col-span-2">
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-2.5 rounded-full bg-crimson text-white font-medium hover:bg-crimson-dark transition-colors disabled:opacity-60"
          >
            {loading ? "Searching…" : "Search"}
          </button>
        </div>
      </form>

      {/* Validation message */}
      {searched &&
        !loading &&
        (!filters.bloodGroup || !filters.city.trim()) && (
          <p className="mb-6 text-sm text-crimson">
            Please select a blood group and enter a city to
            search for donors.
          </p>
        )}

      {/* Results */}
      <div className="space-y-3">
        {searched &&
          !loading &&
          filters.bloodGroup &&
          filters.city.trim() &&
          donors.length === 0 && (
            <p className="text-ink-soft">
              No donors matched those filters. Try another
              blood group or city.
            </p>
          )}

        {donors.map((donor) => (
          <DonorCard
            key={donor._id}
            donor={donor}
          />
        ))}
      </div>
    </div>
  );
}