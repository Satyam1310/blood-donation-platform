import { useState } from "react";
import api from "../api/axios";
import DonorCard from "../components/DonorCard";

const BLOOD_GROUPS = ["", "A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];

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
    setFilters({ ...filters, [name]: type === "checkbox" ? checked : value });
  };

  const handleSearch = async (e) => {
    e.preventDefault();
    setLoading(true);
    setSearched(true);
    try {
      const params = {};
      if (filters.bloodGroup) params.bloodGroup = filters.bloodGroup;
      if (filters.city) params.city = filters.city;
      if (filters.availableOnly) params.availableOnly = "true";
      if (filters.eligibleOnly) params.eligibleOnly = "true";

      const res = await api.get("/donors/search", { params });
      setDonors(res.data.donors);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-6 py-16">
      <h1 className="font-display text-3xl text-ink mb-2">Find a donor</h1>
      <p className="text-ink-soft mb-8">Search by blood group, location, and availability.</p>

      <form
        onSubmit={handleSearch}
        className="p-6 border border-line rounded-2xl bg-white mb-10 grid sm:grid-cols-2 gap-4"
      >
        <div>
          <label className="block text-sm font-medium text-ink mb-1.5">Blood group</label>
          <select
            name="bloodGroup"
            value={filters.bloodGroup}
            onChange={handleChange}
            className="w-full px-4 py-2.5 rounded-lg border border-line focus:border-crimson outline-none"
          >
            {BLOOD_GROUPS.map((bg) => (
              <option key={bg} value={bg}>
                {bg || "Any blood group"}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-ink mb-1.5">City</label>
          <input
            name="city"
            value={filters.city}
            onChange={handleChange}
            placeholder="e.g. Jamshedpur"
            className="w-full px-4 py-2.5 rounded-lg border border-line focus:border-crimson outline-none"
          />
        </div>

        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="availableOnly"
            name="availableOnly"
            checked={filters.availableOnly}
            onChange={handleChange}
            className="w-4 h-4 accent-crimson"
          />
          <label htmlFor="availableOnly" className="text-sm text-ink">
            Available only
          </label>
        </div>

        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="eligibleOnly"
            name="eligibleOnly"
            checked={filters.eligibleOnly}
            onChange={handleChange}
            className="w-4 h-4 accent-crimson"
          />
          <label htmlFor="eligibleOnly" className="text-sm text-ink">
            Eligible now only
          </label>
        </div>

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

      <div className="space-y-3">
        {searched && !loading && donors.length === 0 && (
          <p className="text-ink-soft">No donors matched those filters. Try widening your search.</p>
        )}
        {donors.map((donor) => (
          <DonorCard key={donor._id} donor={donor} />
        ))}
      </div>
    </div>
  );
}
