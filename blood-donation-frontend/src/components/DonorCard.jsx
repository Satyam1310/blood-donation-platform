import { useNavigate } from "react-router-dom";

export default function DonorCard({ donor }) {
  const navigate = useNavigate();

  const calculateEligibility = () => {
    if (!donor.lastDonationDate) {
      return true;
    }

    const eligibleDate = new Date(donor.lastDonationDate);
    eligibleDate.setDate(eligibleDate.getDate() + 90);

    return eligibleDate <= new Date();
  };

  const calculateAvailability = () => {
    if (!donor.lastDonationDate) {
      return true;
    }

    const availableDate = new Date(donor.lastDonationDate);
    availableDate.setDate(availableDate.getDate() + 30);

    return availableDate <= new Date();
  };

  const eligible = calculateEligibility();
  const available = calculateAvailability();

  const handleViewProfile = () => {
    navigate(`/donors/${donor._id}`);
  };

  return (
    <div
      onClick={handleViewProfile}
      className="p-5 border border-line rounded-2xl bg-white cursor-pointer hover:shadow-md hover:border-crimson/30 transition-all"
    >
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-crimson-light text-crimson flex items-center justify-center font-bold text-lg">
            {donor.bloodGroup}
          </div>

          <div>
            <h3 className="text-lg font-semibold text-ink">
              {donor.user?.name || "Donor"}
            </h3>

            <p className="text-sm text-ink-soft">
              {donor.city}
              {donor.pincode ? ` · ${donor.pincode}` : ""}
            </p>
          </div>
        </div>

        <div className="flex flex-col items-end gap-1">
          <span
            className={`text-xs font-medium px-3 py-1 rounded-full ${
              available
                ? "bg-teal-light text-teal"
                : "bg-line text-ink-soft"
            }`}
          >
            {available ? "Available" : "Not available"}
          </span>

          <span
            className={`text-xs font-mono ${
              eligible ? "text-teal" : "text-ink-soft"
            }`}
          >
            {eligible ? "Eligible now" : "Not yet eligible"}
          </span>
        </div>
      </div>

      <div className="mt-4 pt-3 border-t border-line flex justify-end">
        <span className="text-sm font-medium text-crimson">
          View profile →
        </span>
      </div>
    </div>
  );
}