import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  const navLink = "text-sm font-medium text-ink-soft hover:text-ink transition-colors";

  return (
    <header className="border-b border-line bg-bg/95 backdrop-blur sticky top-0 z-20">
      <nav className="max-w-6xl mx-auto flex items-center justify-between px-6 py-4">
        <Link to="/" className="font-display text-xl font-semibold tracking-tight text-ink">
          LifeLine
        </Link>

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

        <div className="flex items-center gap-4">
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
      </nav>
    </header>
  );
}
