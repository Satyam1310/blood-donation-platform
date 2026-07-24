export default function DonorCard({ donor }) {
  const eligible = donor.isEligible !== false; // virtual from backend, defaults true if absent

  return (
    <div className="border border-line rounded-2xl p-5 bg-white flex items-center justify-between gap-4">
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 rounded-full bg-crimson-light text-crimson font-mono font-semibold flex items-center justify-center text-sm">
          {donor.bloodGroup}
        </div>
        <div>
          <p className="font-medium text-ink">{donor.user?.name || "Donor"}</p>
          <p className="text-sm text-ink-soft">
            {donor.city}
            {donor.pincode ? ` · ${donor.pincode}` : ""}
          </p>
        </div>
      </div>

      <div className="flex flex-col items-end gap-1">
        <span
          className={`text-xs font-medium px-3 py-1 rounded-full ${
            donor.isAvailable
              ? "bg-teal-light text-teal"
              : "bg-line text-ink-soft"
          }`}
        >
          {donor.isAvailable ? "Available" : "Not available"}
        </span>
        <span className={`text-xs font-mono ${eligible ? "text-teal" : "text-ink-soft"}`}>
          {eligible ? "Eligible now" : "Not yet eligible"}
        </span>
      </div>
    </div>
  );
}
