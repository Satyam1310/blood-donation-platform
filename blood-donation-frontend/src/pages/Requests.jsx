import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import api from "../api/axios";
import { useAuth } from "../context/AuthContext";

const URGENCY_STYLES = {
  critical: "bg-crimson-light text-crimson-dark",
  medium: "bg-amber-light text-amber",
  low: "bg-line text-ink-soft",
};

const REPORT_THRESHOLD = 10;

export default function Requests() {
  const { user } = useAuth();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [reportedIds, setReportedIds] = useState(new Set());

  const loadRequests = async () => {
    setLoading(true);
    try {
      const res = await api.get("/requests", { params: { status: "open" } });
      setRequests(res.data.requests);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRequests();
  }, []);

  const handleRespond = async (id) => {
    try {
      await api.put(`/requests/${id}/respond`);
      loadRequests();
    } catch (err) {
      console.error(err);
    }
  };

  const handleReport = async (id) => {
    try {
      await api.put(`/requests/${id}/report`);
      setReportedIds((prev) => new Set(prev).add(id));
      loadRequests();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-6 py-16">
      <div className="flex items-start justify-between flex-wrap gap-4 mb-10">
        <div>
          <h1 className="font-display text-3xl text-ink mb-1">Open requests</h1>
          <p className="text-ink-soft">
            Patients and hospitals currently looking for donors. Moderation here is
            public — if a request gets {REPORT_THRESHOLD} reports it's automatically taken down.
          </p>
        </div>
        {user && (
          <Link
            to="/start-request"
            className="px-5 py-2.5 rounded-full bg-crimson text-white font-medium hover:bg-crimson-dark transition-colors"
          >
            Start a request
          </Link>
        )}
      </div>

      {loading ? (
        <p className="text-ink-soft font-mono text-sm">Loading requests…</p>
      ) : requests.length === 0 ? (
        <p className="text-ink-soft">No open requests right now.</p>
      ) : (
        <div className="space-y-4">
          {requests.map((r) => {
            const isOwnRequest = user && r.requester?._id === user.id;
            const alreadyReported = reportedIds.has(r._id) || r.reportedBy?.includes(user?.id);

            return (
              <div key={r._id} className="p-5 border border-line rounded-2xl bg-white">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-3 mb-1 flex-wrap">
                      <span className="font-mono font-semibold text-crimson">{r.bloodGroup}</span>
                      <span
                        className={`text-xs font-medium px-2.5 py-1 rounded-full ${
                          URGENCY_STYLES[r.urgency] || URGENCY_STYLES.medium
                        }`}
                      >
                        {r.urgency}
                      </span>
                      {r.reportCount > 0 && (
                        <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-line text-ink-soft">
                          {r.reportCount} report{r.reportCount > 1 ? "s" : ""}
                        </span>
                      )}
                    </div>
                    <p className="font-medium text-ink">{r.hospital}</p>
                    <p className="text-sm text-ink-soft">
                      {r.city} · {r.unitsNeeded} unit{r.unitsNeeded > 1 ? "s" : ""} needed
                    </p>
                  </div>

                  {user && (
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => handleRespond(r._id)}
                        disabled={r.respondedDonors?.includes(user.id)}
                        className="px-4 py-2 rounded-full border border-line text-sm font-medium hover:border-crimson hover:text-crimson transition-colors disabled:opacity-50 whitespace-nowrap"
                      >
                        {r.respondedDonors?.includes(user.id) ? "Responded" : "I can help"}
                      </button>
                      {!isOwnRequest && (
                        <button
                          onClick={() => handleReport(r._id)}
                          disabled={alreadyReported}
                          className="text-xs font-medium text-ink-soft hover:text-crimson disabled:opacity-50 whitespace-nowrap"
                        >
                          {alreadyReported ? "Reported" : "Report"}
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
