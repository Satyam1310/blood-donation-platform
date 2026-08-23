import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import axios from "../api/axios";

export default function ResetPassword() {
  const { token } = useParams();
  const navigate = useNavigate();

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] =
    useState("");

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();

    setMessage("");
    setError("");

    if (password.length < 6) {
      setError(
        "Password must be at least 6 characters long."
      );
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);

    try {
      const response = await axios.post(
        "/auth/reset-password",
        {
          token,
          password,
        }
      );

      setMessage(response.data.message);

      setTimeout(() => {
        navigate("/login");
      }, 2000);
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Unable to reset password. Please request a new reset link."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto px-6 py-20">
      <h1 className="font-display text-3xl text-ink mb-2">
        Reset your password
      </h1>

      <p className="text-ink-soft mb-8">
        Enter a new password for your account.
      </p>

      {message && (
        <div className="mb-6 px-4 py-3 rounded-lg bg-green-50 text-green-700 text-sm">
          {message}
          <div className="mt-1">
            Redirecting to login...
          </div>
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
            New password
          </label>

          <input
            type="password"
            required
            minLength={6}
            value={password}
            onChange={(e) =>
              setPassword(e.target.value)
            }
            className="w-full px-4 py-2.5 rounded-lg border border-line focus:border-crimson outline-none"
            placeholder="••••••••"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-ink mb-1.5">
            Confirm password
          </label>

          <input
            type="password"
            required
            minLength={6}
            value={confirmPassword}
            onChange={(e) =>
              setConfirmPassword(e.target.value)
            }
            className="w-full px-4 py-2.5 rounded-lg border border-line focus:border-crimson outline-none"
            placeholder="••••••••"
          />
        </div>

        <button
          type="submit"
          disabled={loading || !!message}
          className="w-full py-3 rounded-full bg-crimson text-white font-medium hover:bg-crimson-dark transition-colors disabled:opacity-60"
        >
          {loading
            ? "Resetting…"
            : "Reset password"}
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