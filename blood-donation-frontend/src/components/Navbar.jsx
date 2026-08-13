import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);

  const handleLogout = () => {
    setMenuOpen(false);
    logout();
    navigate("/");
  };

  const closeMenu = () => {
    setMenuOpen(false);
  };

  const navLink =
    "text-sm font-medium text-ink-soft hover:text-ink transition-colors";

  return (
    <header className="border-b border-line bg-bg/95 backdrop-blur sticky top-0 z-20">
      <nav className="max-w-6xl mx-auto px-6 py-4">

        {/* Desktop / Main Navbar */}
        <div className="flex items-center justify-between">

          {/* Logo */}
          <Link
            to="/"
            onClick={closeMenu}
            className="font-display text-xl font-semibold tracking-tight text-ink"
          >
            LifeLine
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-8">
            <Link to="/search" className={navLink}>
              Find donors
            </Link>

            <Link to="/requests" className={navLink}>
              Requests
            </Link>

            <Link to="/benefits" className={navLink}>
              Benefits
            </Link>

            <Link to="/myths" className={navLink}>
              Myths &amp; facts
            </Link>
          </div>

          {/* Desktop User Actions */}
          <div className="hidden md:flex items-center gap-4">
            {user ? (
              <>
                <Link to="/dashboard" className={navLink}>
                  Dashboard
                </Link>

                <button
                  onClick={handleLogout}
                  className="text-sm font-medium px-4 py-2 rounded-full border border-line hover:border-crimson hover:text-crimson transition-colors"
                >
                  Log out
                </button>
              </>
            ) : (
              <>
                <Link to="/login" className={navLink}>
                  Log in
                </Link>

                <Link
                  to="/signup"
                  className="text-sm font-medium px-4 py-2 rounded-full bg-crimson text-white hover:bg-crimson-dark transition-colors"
                >
                  Join as donor
                </Link>
              </>
            )}
          </div>

          {/* Mobile Menu Button */}
          <button
            type="button"
            onClick={() => setMenuOpen(!menuOpen)}
            className="md:hidden p-2 rounded-lg border border-line text-ink hover:border-crimson hover:text-crimson transition-colors"
            aria-label="Toggle navigation menu"
            aria-expanded={menuOpen}
          >
            {menuOpen ? (
              <span className="text-xl">✕</span>
            ) : (
              <span className="text-xl">☰</span>
            )}
          </button>
        </div>

        {/* Mobile Navigation */}
        {menuOpen && (
          <div className="md:hidden mt-4 pt-4 border-t border-line">
            <div className="flex flex-col gap-1">

              <Link
                to="/search"
                onClick={closeMenu}
                className="px-3 py-3 rounded-lg text-sm font-medium text-ink-soft hover:bg-crimson-light hover:text-crimson transition-colors"
              >
                Find donors
              </Link>

              <Link
                to="/requests"
                onClick={closeMenu}
                className="px-3 py-3 rounded-lg text-sm font-medium text-ink-soft hover:bg-crimson-light hover:text-crimson transition-colors"
              >
                Requests
              </Link>

              <Link
                to="/benefits"
                onClick={closeMenu}
                className="px-3 py-3 rounded-lg text-sm font-medium text-ink-soft hover:bg-crimson-light hover:text-crimson transition-colors"
              >
                Benefits
              </Link>

              <Link
                to="/myths"
                onClick={closeMenu}
                className="px-3 py-3 rounded-lg text-sm font-medium text-ink-soft hover:bg-crimson-light hover:text-crimson transition-colors"
              >
                Myths &amp; facts
              </Link>

              <div className="my-2 border-t border-line" />

              {user ? (
                <>
                  <Link
                    to="/dashboard"
                    onClick={closeMenu}
                    className="px-3 py-3 rounded-lg text-sm font-medium text-ink-soft hover:bg-crimson-light hover:text-crimson transition-colors"
                  >
                    Dashboard
                  </Link>

                  <button
                    onClick={handleLogout}
                    className="mt-1 w-full text-left px-3 py-3 rounded-lg text-sm font-medium text-crimson hover:bg-crimson-light transition-colors"
                  >
                    Log out
                  </button>
                </>
              ) : (
                <>
                  <Link
                    to="/login"
                    onClick={closeMenu}
                    className="px-3 py-3 rounded-lg text-sm font-medium text-ink-soft hover:bg-crimson-light hover:text-crimson transition-colors"
                  >
                    Log in
                  </Link>

                  <Link
                    to="/signup"
                    onClick={closeMenu}
                    className="mt-1 text-center text-sm font-medium px-4 py-3 rounded-full bg-crimson text-white hover:bg-crimson-dark transition-colors"
                  >
                    Join as donor
                  </Link>
                </>
              )}
            </div>
          </div>
        )}
      </nav>
    </header>
  );
}