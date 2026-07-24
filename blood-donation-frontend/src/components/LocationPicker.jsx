import { useState } from "react";
import { MapContainer, TileLayer, Marker, useMapEvents } from "react-leaflet";
import L from "leaflet";

// Leaflet's default marker icons reference image files that don't resolve
// correctly under Vite's bundler — rebuild the icon manually from CDN URLs.
const markerIcon = new L.Icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

function ClickHandler({ onSelect }) {
  useMapEvents({
    click(e) {
      onSelect({ lat: e.latlng.lat, lng: e.latlng.lng });
    },
  });
  return null;
}

// Default center: roughly the center of India, used until the person clicks
// or their device provides a location.
const DEFAULT_CENTER = { lat: 22.5, lng: 78.9 };

export default function LocationPicker({ value, onChange }) {
  const [center] = useState(value || DEFAULT_CENTER);

  const useMyLocation = () => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition((pos) => {
      onChange({ lat: pos.coords.latitude, lng: pos.coords.longitude });
    });
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <p className="text-sm text-ink-soft">
          {value
            ? `Selected: ${value.lat.toFixed(5)}, ${value.lng.toFixed(5)}`
            : "Click the map to drop a pin at the hospital / patient location"}
        </p>
        <button
          type="button"
          onClick={useMyLocation}
          className="text-xs font-medium text-crimson hover:underline whitespace-nowrap"
        >
          Use my location
        </button>
      </div>
      <div className="h-72 rounded-xl overflow-hidden border border-line">
        <MapContainer center={center} zoom={5} style={{ height: "100%", width: "100%" }}>
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <ClickHandler onSelect={onChange} />
          {value && <Marker position={value} icon={markerIcon} />}
        </MapContainer>
      </div>
    </div>
  );
}
