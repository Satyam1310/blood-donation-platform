import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import api from "../api/axios";
import { useAuth } from "../context/AuthContext";

const URGENCY_STYLES = {
  critical: "bg-crimson-light text-crimson-dark",
  medium: "bg-amber-light text-amber",
  low: "bg-line text-ink-soft",
};

const STATUS_STYLES = {
  open: "bg-teal-light text-teal",
  fulfilled: "bg-line text-ink",
  cancelled: "bg-line text-ink-soft",
};

const REPORT_THRESHOLD = 10;

export default function Requests() {
  const { user } = useAuth();

  const [activeTab, setActiveTab] =
    useState("open");

  const [requests, setRequests] = useState([]);
  const [myRequests, setMyRequests] =
    useState([]);

  const [loading, setLoading] =
    useState(true);

  const [myRequestsLoading, setMyRequestsLoading] =
    useState(false);

  const [reportedIds, setReportedIds] =
    useState(new Set());

  const [actionLoading, setActionLoading] =
    useState(null);

  // -------------------------------------------------------
  // LOAD OPEN REQUESTS
  // -------------------------------------------------------

  const loadRequests = async () => {
    setLoading(true);

    try {
      const res =
        await api.get("/requests");

      setRequests(
        res.data.requests || []
      );
    } catch (err) {
      console.error(
        "Failed to load requests:",
        err
      );

      setRequests([]);
    } finally {
      setLoading(false);
    }
  };

  // -------------------------------------------------------
  // LOAD MY REQUESTS
  // -------------------------------------------------------

  const loadMyRequests = async () => {
    if (!user) {
      setMyRequests([]);
      return;
    }

    setMyRequestsLoading(true);

    try {
      const res =
        await api.get("/requests/my");

      setMyRequests(
        res.data.requests || []
      );
    } catch (err) {
      console.error(
        "Failed to load your requests:",
        err
      );

      setMyRequests([]);
    } finally {
      setMyRequestsLoading(false);
    }
  };

  useEffect(() => {
    loadRequests();
  }, []);

  useEffect(() => {
    if (user) {
      loadMyRequests();
    } else {
      setMyRequests([]);
    }
  }, [user]);

  // -------------------------------------------------------
  // I CAN DONATE
  // -------------------------------------------------------

  const handleRespond = async (id) => {
    try {
      setActionLoading(id);

      const res =
        await api.put(
          `/requests/${id}/respond`
        );

      alert(
        res.data.message ||
          "I Can Donate response submitted successfully."
      );

      await loadRequests();
    } catch (err) {
      console.error(
        "Failed to respond to request:",
        err
      );

      const message =
        err.response?.data?.message ||
        "Unable to respond to this request.";

      alert(message);
    } finally {
      setActionLoading(null);
    }
  };

  // -------------------------------------------------------
  // WITHDRAW RESPONSE
  // -------------------------------------------------------

  const handleWithdrawResponse = async (
    id
  ) => {
    const confirmed =
      window.confirm(
        "Are you sure you want to withdraw your donation response?"
      );

    if (!confirmed) {
      return;
    }

    try {
      setActionLoading(id);

      const res =
        await api.delete(
          `/requests/${id}/respond`
        );

      alert(
        res.data.message ||
          "Your donation response has been withdrawn."
      );

      await loadRequests();
    } catch (err) {
      console.error(
        "Failed to withdraw response:",
        err
      );

      const message =
        err.response?.data?.message ||
        "Unable to withdraw your response.";

      alert(message);
    } finally {
      setActionLoading(null);
    }
  };

  // -------------------------------------------------------
  // REPORT
  // -------------------------------------------------------

  const handleReport = async (id) => {
    try {
      setActionLoading(id);

      await api.put(
        `/requests/${id}/report`
      );

      setReportedIds((prev) => {
        const updated = new Set(prev);
        updated.add(id);
        return updated;
      });

      await loadRequests();
    } catch (err) {
      console.error(
        "Failed to report request:",
        err
      );

      const message =
        err.response?.data?.message ||
        "Unable to report this request.";

      alert(message);
    } finally {
      setActionLoading(null);
    }
  };

  // -------------------------------------------------------
  // REQUEST STATUS
  // -------------------------------------------------------

  const handleStatusUpdate = async (
    id,
    status
  ) => {
    const action =
      status === "fulfilled"
        ? "mark this request as fulfilled"
        : "cancel this request";

    const confirmed =
      window.confirm(
        `Are you sure you want to ${action}?`
      );

    if (!confirmed) {
      return;
    }

    try {
      setActionLoading(id);

      await api.put(
        `/requests/${id}/status`,
        { status }
      );

      await Promise.all([
        loadRequests(),
        loadMyRequests(),
      ]);
    } catch (err) {
      console.error(
        "Failed to update request status:",
        err
      );

      const message =
        err.response?.data?.message ||
        "Unable to update this request.";

      alert(message);
    } finally {
      setActionLoading(null);
    }
  };

  // -------------------------------------------------------
  // DELETE FINISHED REQUEST
  // -------------------------------------------------------

  const handleDeleteRequest = async (
    id
  ) => {
    const confirmed =
      window.confirm(
        "Are you sure you want to permanently delete this finished request?"
      );

    if (!confirmed) {
      return;
    }

    try {
      setActionLoading(id);

      await api.delete(
        `/requests/${id}`
      );

      setMyRequests((prev) =>
        prev.filter(
          (request) =>
            request._id !== id
        )
      );
    } catch (err) {
      console.error(
        "Failed to delete request:",
        err
      );

      const message =
        err.response?.data?.message ||
        "Unable to delete this request.";

      alert(message);
    } finally {
      setActionLoading(null);
    }
  };

  // -------------------------------------------------------
  // STATUS BADGE
  // -------------------------------------------------------

  const getRequestStatus = (
    status
  ) => {
    return (
      <span
        className={`text-xs font-medium px-2.5 py-1 rounded-full ${
          STATUS_STYLES[status] ||
          STATUS_STYLES.cancelled
        }`}
      >
        {status === "open"
          ? "Open"
          : status === "fulfilled"
          ? "Fulfilled"
          : status === "cancelled"
          ? "Cancelled"
          : status}
      </span>
    );
  };

  // -------------------------------------------------------
  // RENDER
  // -------------------------------------------------------

  return (
    <div className="max-w-5xl mx-auto px-6 py-10">

      {/* Header */}

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-5 mb-8">

        <div>
          <h1 className="text-4xl font-bold text-ink">
            Blood requests
          </h1>

          <p className="mt-2 text-ink-soft">
            Find people who need blood and
            help when you can.
          </p>
        </div>

        {user && (
          <Link
            to="/start-request"
            className="px-5 py-2.5 rounded-full bg-crimson text-white font-medium hover:bg-crimson-dark transition-colors text-center"
          >
            Start a request
          </Link>
        )}
      </div>

      {/* Tabs */}

      <div className="flex items-center gap-2 border-b border-line mb-8">

        <button
          onClick={() =>
            setActiveTab("open")
          }
          className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
            activeTab === "open"
              ? "border-crimson text-crimson"
              : "border-transparent text-ink-soft hover:text-ink"
          }`}
        >
          Open requests
        </button>

        {user && (
          <button
            onClick={() =>
              setActiveTab("mine")
            }
            className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === "mine"
                ? "border-crimson text-crimson"
                : "border-transparent text-ink-soft hover:text-ink"
            }`}
          >
            My requests
          </button>
        )}
      </div>

      {/* ================================================= */}
      {/* OPEN REQUESTS */}
      {/* ================================================= */}

      {activeTab === "open" && (
        <section>

          <div className="mb-6">
            <p className="text-ink-soft">
              Patients and hospitals currently
              looking for donors. Requests receiving{" "}
              {REPORT_THRESHOLD} reports are
              automatically removed.
            </p>
          </div>

          {loading ? (
            <p className="text-ink-soft font-mono text-sm">
              Loading requests…
            </p>
          ) : requests.length === 0 ? (
            <div className="p-8 border border-line rounded-2xl bg-white text-center">

              <p className="text-ink-soft">
                No open requests right now.
              </p>

              {user && (
                <Link
                  to="/start-request"
                  className="inline-block mt-4 text-sm font-medium text-crimson hover:underline"
                >
                  Start a request
                </Link>
              )}
            </div>
          ) : (
            <div className="space-y-4">

              {requests.map((r) => {
                const userId =
                  user?.id ||
                  user?._id;

                const requesterId =
                  r.requester?._id ||
                  r.requester?.id ||
                  r.requester;

                const isOwnRequest =
                  Boolean(
                    userId &&
                      requesterId
                  ) &&
                  userId.toString() ===
                    requesterId.toString();

                const alreadyResponded =
                  r.respondedDonors?.some(
                    (response) => {
                      const donorId =
                        response?.donor?._id ||
                        response?.donor?.id ||
                        response?.donor;

                      return (
                        donorId?.toString() ===
                        userId?.toString()
                      );
                    }
                  );

                const alreadyReported =
                  reportedIds.has(r._id) ||
                  r.reportedBy?.some(
                    (reportedUserId) =>
                      reportedUserId?.toString() ===
                      userId?.toString()
                  );

                const isLoading =
                  actionLoading ===
                  r._id;

                return (
                  <div
                    key={r._id}
                    className="p-5 border border-line rounded-2xl bg-white"
                  >
                    <div className="flex items-start justify-between gap-4">

                      <div>

                        <div className="flex items-center gap-3 mb-1 flex-wrap">

                          <span className="font-mono font-semibold text-crimson">
                            {r.bloodGroup}
                          </span>

                          <span
                            className={`text-xs font-medium px-2.5 py-1 rounded-full ${
                              URGENCY_STYLES[
                                r.urgency
                              ] ||
                              URGENCY_STYLES.medium
                            }`}
                          >
                            {r.urgency}
                          </span>

                          {r.reportCount >
                            0 && (
                            <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-line text-ink-soft">
                              {r.reportCount}{" "}
                              report
                              {r.reportCount >
                              1
                                ? "s"
                                : ""}
                            </span>
                          )}
                        </div>

                        <p className="font-medium text-ink">
                          {r.hospital}
                        </p>

                        <p className="text-sm text-ink-soft">
                          {r.city} ·{" "}
                          {r.unitsNeeded}{" "}
                          unit
                          {r.unitsNeeded >
                          1
                            ? "s"
                            : ""}{" "}
                          needed
                        </p>
                      </div>

                      {user && (
                        <div className="flex items-center gap-2 shrink-0">

                          {isOwnRequest ? (
                            <span className="text-xs text-ink-soft">
                              Your request
                            </span>
                          ) : alreadyResponded ? (
                            <button
                              onClick={() =>
                                handleWithdrawResponse(
                                  r._id
                                )
                              }
                              disabled={
                                isLoading
                              }
                              className="px-4 py-2 rounded-full border border-line text-sm font-medium hover:border-crimson hover:text-crimson transition-colors disabled:opacity-50 whitespace-nowrap"
                            >
                              {isLoading
                                ? "Please wait…"
                                : "Withdraw"}
                            </button>
                          ) : (
                            <>
                              <button
                                onClick={() =>
                                  handleRespond(
                                    r._id
                                  )
                                }
                                disabled={
                                  isLoading
                                }
                                className="px-4 py-2 rounded-full border border-line text-sm font-medium hover:border-teal hover:text-teal transition-colors disabled:opacity-50 whitespace-nowrap"
                              >
                                {isLoading
                                  ? "Please wait…"
                                  : "I Can Donate"}
                              </button>

                              <button
                                onClick={() =>
                                  handleReport(
                                    r._id
                                  )
                                }
                                disabled={
                                  alreadyReported ||
                                  isLoading
                                }
                                className="text-xs font-medium text-ink-soft hover:text-crimson disabled:opacity-50 whitespace-nowrap"
                              >
                                {alreadyReported
                                  ? "Reported"
                                  : "Report"}
                              </button>
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {user &&
            requests.length > 0 && (
              <p className="mt-6 text-xs text-ink-soft">
                I Can Donate only checks basic
                application rules such as blood-group
                compatibility and donation timing.
                Final donation eligibility and
                transfusion compatibility must be
                confirmed by the blood bank or a
                qualified medical professional.
              </p>
            )}
        </section>
      )}

      {/* ================================================= */}
      {/* MY REQUESTS */}
      {/* ================================================= */}

      {activeTab === "mine" &&
        user && (
          <section>

            <div className="mb-6">
              <p className="text-ink-soft">
                Manage the blood requests you
                have created.
              </p>
            </div>

            {myRequestsLoading ? (
              <p className="text-ink-soft font-mono text-sm">
                Loading your requests…
              </p>
            ) : myRequests.length ===
              0 ? (
              <div className="p-8 border border-line rounded-2xl bg-white text-center">

                <p className="text-ink-soft">
                  You haven't created any blood
                  requests yet.
                </p>

                <Link
                  to="/start-request"
                  className="inline-block mt-4 text-sm font-medium text-crimson hover:underline"
                >
                  Start your first request
                </Link>
              </div>
            ) : (
              <div className="space-y-4">

                {myRequests.map((r) => {
                  const isOpen =
                    r.status === "open";

                  const isFinished =
                    r.status ===
                      "fulfilled" ||
                    r.status ===
                      "cancelled";

                  const responders =
                    Array.isArray(
                      r.respondedDonors
                    )
                      ? r.respondedDonors
                      : [];

                  const isLoading =
                    actionLoading ===
                    r._id;

                  return (
                    <div
                      key={r._id}
                      className="p-5 border border-line rounded-2xl bg-white"
                    >

                      {/* Request information */}

                      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-5">

                        <div>

                          <div className="flex items-center gap-3 mb-2 flex-wrap">

                            <span className="font-mono font-semibold text-crimson">
                              {r.bloodGroup}
                            </span>

                            {getRequestStatus(
                              r.status
                            )}

                            <span
                              className={`text-xs font-medium px-2.5 py-1 rounded-full ${
                                URGENCY_STYLES[
                                  r.urgency
                                ] ||
                                URGENCY_STYLES.medium
                              }`}
                            >
                              {r.urgency}
                            </span>
                          </div>

                          <p className="font-medium text-ink">
                            {r.hospital}
                          </p>

                          <p className="text-sm text-ink-soft mt-1">
                            {r.city} ·{" "}
                            {r.unitsNeeded}{" "}
                            unit
                            {r.unitsNeeded >
                            1
                              ? "s"
                              : ""}{" "}
                            needed
                          </p>

                          <p className="text-xs text-ink-soft mt-2">
                            Created{" "}
                            {new Date(
                              r.createdAt
                            ).toLocaleDateString(
                              "en-IN",
                              {
                                day: "numeric",
                                month: "short",
                                year: "numeric",
                              }
                            )}
                          </p>
                        </div>

                        {/* Request actions */}

                        {isOpen && (
                          <div className="flex items-center gap-2 shrink-0">

                            <button
                              onClick={() =>
                                handleStatusUpdate(
                                  r._id,
                                  "fulfilled"
                                )
                              }
                              disabled={
                                isLoading
                              }
                              className="px-4 py-2 rounded-full border border-line text-sm font-medium hover:border-teal hover:text-teal transition-colors disabled:opacity-50 whitespace-nowrap"
                            >
                              {isLoading
                                ? "Please wait…"
                                : "Mark fulfilled"}
                            </button>

                            <button
                              onClick={() =>
                                handleStatusUpdate(
                                  r._id,
                                  "cancelled"
                                )
                              }
                              disabled={
                                isLoading
                              }
                              className="text-xs font-medium text-ink-soft hover:text-crimson disabled:opacity-50 whitespace-nowrap"
                            >
                              Cancel request
                            </button>
                          </div>
                        )}

                        {isFinished && (
                          <div className="flex items-center gap-2 shrink-0">

                            <button
                              onClick={() =>
                                handleDeleteRequest(
                                  r._id
                                )
                              }
                              disabled={
                                isLoading
                              }
                              className="px-4 py-2 rounded-full border border-line text-sm font-medium text-ink-soft hover:border-crimson hover:text-crimson transition-colors disabled:opacity-50 whitespace-nowrap"
                            >
                              {isLoading
                                ? "Deleting…"
                                : "Delete"}
                            </button>
                          </div>
                        )}
                      </div>

                      {/* ================================================= */}
                      {/* RESPONDING DONORS */}
                      {/* ================================================= */}

                      {isOpen &&
                        responders.length >
                          0 && (
                          <div className="mt-6 pt-5 border-t border-line">

                            <div className="flex items-center justify-between gap-3 mb-4">

                              <div>
                                <h3 className="font-display text-xl text-ink">
                                  Donors ready to help
                                </h3>

                                <p className="text-sm text-ink-soft mt-1">
                                  These donors have
                                  offered to donate
                                  for this request.
                                </p>
                              </div>

                              <span className="font-mono text-sm px-3 py-1 rounded-full bg-teal-light text-teal">
                                {
                                  responders.length
                                }{" "}
                                donor
                                {responders.length >
                                1
                                  ? "s"
                                  : ""}
                              </span>
                            </div>

                            <div className="grid md:grid-cols-2 gap-3">

                              {responders.map(
                                (
                                  response,
                                  index
                                ) => {
                                  const donor =
                                    response?.donor;

                                  if (
                                    !donor
                                  ) {
                                    return null;
                                  }

                                  return (
                                    <div
                                      key={
                                        donor._id ||
                                        index
                                      }
                                      className="p-4 border border-line rounded-xl bg-line/20"
                                    >

                                      <div className="flex items-center justify-between gap-4">

                                        <div className="min-w-0">

                                          <p className="font-medium text-ink truncate">
                                            {donor.name ||
                                              "Donor"}
                                          </p>

                                          <p className="text-sm text-ink-soft mt-1">
                                            {donor.bloodGroup ||
                                              "Blood group unavailable"}

                                            {donor.city &&
                                              ` · ${donor.city}`}
                                          </p>

                                          <div className="flex items-center gap-2 mt-2">

                                            <span
                                              className={`text-xs font-medium px-2 py-1 rounded-full ${
                                                donor.isAvailable
                                                  ? "bg-teal-light text-teal"
                                                  : "bg-line text-ink-soft"
                                              }`}
                                            >
                                              {donor.isAvailable
                                                ? "Available"
                                                : "Not available"}
                                            </span>

                                          </div>
                                        </div>

                                        {donor.donorProfileId ? (
                                          <Link
                                            to={`/donors/${donor.donorProfileId}`}
                                            className="shrink-0 px-4 py-2 rounded-full border border-line text-sm font-medium text-ink hover:border-crimson hover:text-crimson transition-colors"
                                          >
                                            View profile
                                          </Link>
                                        ) : (
                                          <span className="text-xs text-ink-soft">
                                            Profile unavailable
                                          </span>
                                        )}
                                      </div>

                                      {response.respondedAt && (
                                        <p className="text-xs text-ink-soft mt-3">
                                          Responded{" "}
                                          {new Date(
                                            response.respondedAt
                                          ).toLocaleDateString(
                                            "en-IN",
                                            {
                                              day: "numeric",
                                              month: "short",
                                              year: "numeric",
                                            }
                                          )}
                                        </p>
                                      )}
                                    </div>
                                  );
                                }
                              )}
                            </div>

                            <p className="text-xs text-ink-soft mt-4">
                              Contact details are shown
                              only according to each
                              donor's privacy settings and
                              verification status.
                            </p>
                          </div>
                        )}

                      {/* No responders */}

                      {isOpen &&
                        responders.length ===
                          0 && (
                          <div className="mt-5 pt-5 border-t border-line">

                            <p className="text-sm text-ink-soft">
                              No donors have responded
                              yet.
                            </p>
                          </div>
                        )}
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        )}
    </div>
  );
}