import { useState } from "react";
import { Link } from "react-router-dom";
import axios from "../api/axios";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();

    setMessage("");
    setError("");
    setLoading(true);

    try {
      const response = await axios.post(
        "/auth/forgot-password",
        { email }
      );

      setMessage(response.data.message);
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Unable to process password reset request."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto px-6 py-20">
      <h1 className="font-display text-3xl text-ink mb-2">
        Forgot your password?
      </h1>

      <p className="text-ink-soft mb-8">
        Enter your email address and we'll send you a
        link to reset your password.
      </p>

      {message && (
        <div className="mb-6 px-4 py-3 rounded-lg bg-green-50 text-green-700 text-sm">
          {message}
        </div>
      )}

      {error && (
        <div className="mb-6 px-4 py-3 rounded-lg bg-crimson-light text-crimson-dark text-sm">
          {error}
        </div>
      )}

      <form
        onSubmit={handleSubmit}
        className="space-y-5"
      >
        <div>
          <label className="block text-sm font-medium text-ink mb-1.5">
            Email
          </label>

          <input
            type="email"
            required
            value={email}
            onChange={(e) =>
              setEmail(e.target.value)
            }
            className="w-full px-4 py-2.5 rounded-lg border border-line focus:border-crimson outline-none"
            placeholder="you@example.com"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 rounded-full bg-crimson text-white font-medium hover:bg-crimson-dark transition-colors disabled:opacity-60"
        >
          {loading
            ? "Sending…"
            : "Send reset link"}
        </button>
      </form>

      <p className="mt-6 text-sm text-ink-soft">
        Remember your password?{" "}
        <Link
          to="/login"
          className="text-crimson font-medium"
        >
          Log in
        </Link>
      </p>
    </div>
  );
}