import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const BLOOD_GROUPS = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];

export default function Signup() {
  const { signup } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    phone: "",
    role: "donor",
    bloodGroup: "",
    city: "",
    pincode: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await signup(form);
      navigate("/dashboard");
    } catch (err) {
      setError(err.response?.data?.message || "Signup failed. Please check your details.");
    } finally {
      setLoading(false);
    }
  };

  const inputClass =
    "w-full px-4 py-2.5 rounded-lg border border-line focus:border-crimson outline-none";

  return (
    <div className="max-w-md mx-auto px-6 py-20">
      <h1 className="font-display text-3xl text-ink mb-2">Create your account</h1>
      <p className="text-ink-soft mb-8">
        Every account is a donor account — you can also start a blood request for
        yourself or someone else from your dashboard, once you're signed in.
      </p>

      {error && (
        <div className="mb-6 px-4 py-3 rounded-lg bg-crimson-light text-crimson-dark text-sm">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label className="block text-sm font-medium text-ink mb-1.5">Full name</label>
          <input name="name" required value={form.name} onChange={handleChange} className={inputClass} />
        </div>

        <div>
          <label className="block text-sm font-medium text-ink mb-1.5">Email</label>
          <input
            type="email"
            name="email"
            required
            value={form.email}
            onChange={handleChange}
            className={inputClass}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-ink mb-1.5">Password</label>
          <input
            type="password"
            name="password"
            required
            minLength={6}
            value={form.password}
            onChange={handleChange}
            className={inputClass}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-ink mb-1.5">Phone</label>
          <input name="phone" value={form.phone} onChange={handleChange} className={inputClass} />
        </div>

        <div>
          <label className="block text-sm font-medium text-ink mb-1.5">Account type</label>
          <select name="role" value={form.role} onChange={handleChange} className={inputClass}>
            <option value="donor">Donor</option>
            <option value="hospital">Hospital / organization</option>
          </select>
        </div>

        {form.role === "donor" && (
          <>
            <div>
              <label className="block text-sm font-medium text-ink mb-1.5">Blood group</label>
              <select
                name="bloodGroup"
                required
                value={form.bloodGroup}
                onChange={handleChange}
                className={inputClass}
              >
                <option value="">Select blood group</option>
                {BLOOD_GROUPS.map((bg) => (
                  <option key={bg} value={bg}>
                    {bg}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-ink mb-1.5">City</label>
              <input name="city" required value={form.city} onChange={handleChange} className={inputClass} />
            </div>

            <div>
              <label className="block text-sm font-medium text-ink mb-1.5">Pincode</label>
              <input name="pincode" value={form.pincode} onChange={handleChange} className={inputClass} />
            </div>
          </>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 rounded-full bg-crimson text-white font-medium hover:bg-crimson-dark transition-colors disabled:opacity-60"
        >
          {loading ? "Creating account…" : "Create account"}
        </button>
      </form>

      <p className="mt-6 text-sm text-ink-soft">
        Already have an account?{" "}
        <Link to="/login" className="text-crimson font-medium">
          Log in
        </Link>
      </p>
    </div>
  );
}
