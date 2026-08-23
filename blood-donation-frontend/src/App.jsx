import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";

import Navbar from "./components/Navbar";
import ProtectedRoute from "./components/ProtectedRoute";

import Home from "./pages/Home";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import Dashboard from "./pages/Dashboard";
import SearchDonors from "./pages/SearchDonors";
import DonorProfile from "./pages/DonorProfile";
import Requests from "./pages/Requests";
import StartRequest from "./pages/StartRequest";
import Benefits from "./pages/Benefits";
import Myths from "./pages/Myths";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <div className="min-h-screen flex flex-col">
          <Navbar />

          <main className="flex-1">
            <Routes>
              <Route path="/" element={<Home />} />

              <Route
                path="/login"
                element={<Login />}
              />

              <Route
                path="/signup"
                element={<Signup />}
              />

              <Route
                path="/forgot-password"
                element={<ForgotPassword />}
              />

              <Route
                path="/reset-password/:token"
                element={<ResetPassword />}
              />

              {/* Donor search requires login */}
              <Route
                path="/search"
                element={
                  <ProtectedRoute>
                    <SearchDonors />
                  </ProtectedRoute>
                }
              />

              {/* Individual donor profile requires login */}
              <Route
                path="/donors/:id"
                element={
                  <ProtectedRoute>
                    <DonorProfile />
                  </ProtectedRoute>
                }
              />

              {/* Blood requests */}
              <Route
                path="/requests"
                element={<Requests />}
              />

              <Route
                path="/benefits"
                element={<Benefits />}
              />

              <Route
                path="/myths"
                element={<Myths />}
              />

              {/* Dashboard */}
              <Route
                path="/dashboard"
                element={
                  <ProtectedRoute>
                    <Dashboard />
                  </ProtectedRoute>
                }
              />

              {/* Create blood request */}
              <Route
                path="/start-request"
                element={
                  <ProtectedRoute>
                    <StartRequest />
                  </ProtectedRoute>
                }
              />
            </Routes>
          </main>
        </div>
      </AuthProvider>
    </BrowserRouter>
  );
}