import React, { useState, useEffect, useRef } from 'react';
import { MapPin, ShieldAlert, Navigation, Compass, Bell, Sun, Wind, Droplets, Thermometer, AlertTriangle, CheckCircle, Award } from 'lucide-react';

function MapTab({ 
  selectedCity, 
  setSelectedCity, 
  envData, 
  analysisData, 
  userProfile,
  cities,
  setCities
}) {
  const mapRef = useRef(null);
  const leafletMap = useRef(null);
  const locationMarker = useRef(null);
  const locationCircle = useRef(null);

  const [locating, setLocating] = useState(false);
  const [fetchingData, setFetchingData] = useState(false);
  const [error, setError] = useState(null);
  const [detectedLoc, setDetectedLoc] = useState(null);
  
  // Custom states for local environmental data
  const [localEnvData, setLocalEnvData] = useState(null);
  const [localAnalysis, setLocalAnalysis] = useState(null);
  const [applied, setApplied] = useState(false);

  // Initialize Map
  useEffect(() => {
    if (!window.L) {
      setError("Leaflet library failed to load. Please check your internet connection.");
      return;
    }

    // Centered on current selected city or default to Mumbai (19.0760, 72.8777)
    const initialLat = 19.0760;
    const initialLon = 72.8777;
    const initialZoom = 9;

    // Create Leaflet Map Instance
    leafletMap.current = window.L.map(mapRef.current, {
      zoomControl: false // Position zoom control customly
    }).setView([initialLat, initialLon], initialZoom);

    // Zoom control at bottom right
    window.L.control.zoom({ position: 'bottomright' }).addTo(leafletMap.current);

    // Add Dark Matter CartoDB Tiles (Premium Dark Theme matching project style)
    window.L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
      maxZoom: 19
    }).addTo(leafletMap.current);

    // Geocode current selected city on mount to center map
    geocodeCity(selectedCity);

    return () => {
      if (leafletMap.current) {
        leafletMap.current.remove();
        leafletMap.current = null;
      }
    };
  }, []);

  // Update map when global selectedCity changes
  useEffect(() => {
    if (leafletMap.current && selectedCity && !detectedLoc) {
      geocodeCity(selectedCity);
    }
  }, [selectedCity]);

  // Synchronize local map data when global data is retrieved
  useEffect(() => {
    if (envData && !detectedLoc) {
      setLocalEnvData(envData);
      setLocalAnalysis(analysisData);
      updateMapHighlight(leafletMap.current.getCenter().lat, leafletMap.current.getCenter().lng, envData.aqi, selectedCity);
    }
  }, [envData, analysisData]);

  // Geocode a City Name to Coordinates
  const geocodeCity = (cityName) => {
    if (!window.L || !leafletMap.current) return;

    fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(cityName)}&limit=1`)
      .then(res => res.json())
      .then(data => {
        if (data && data.length > 0) {
          const lat = parseFloat(data[0].lat);
          const lon = parseFloat(data[0].lon);
          
          leafletMap.current.setView([lat, lon], 10);
          
          // Draw marker and circle if we have environmental data
          if (envData) {
            updateMapHighlight(lat, lon, envData.aqi, cityName);
          }
        }
      })
      .catch(err => console.warn("Error geocoding city:", err));
  };

  // Locate the User
  const handleLocateUser = () => {
    if (!navigator.geolocation) {
      setError("Geolocation is not supported by your browser.");
      return;
    }

    setLocating(true);
    setError(null);
    setApplied(false);

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const lat = position.coords.latitude;
        const lon = position.coords.longitude;

        try {
          // 1. Zoom Map to user coordinates
          if (leafletMap.current) {
            leafletMap.current.setView([lat, lon], 13);
          }

          // 2. Reverse geocode coordinates to City Name using OpenStreetMap Nominatim
          const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&zoom=10`);
          const data = await response.json();
          const address = data.address || {};
          
          // Fallback to extract a valid city/town name
          const cityName = address.city || address.town || address.village || address.suburb || address.county || address.state || "Detected Location";
          const countryName = address.country || "";
          const countryCode = address.country_code ? address.country_code.toUpperCase() : "IN";

          setDetectedLoc({
            lat,
            lon,
            city: cityName,
            country: countryName,
            countryCode: countryCode,
            displayName: data.display_name
          });

          // 3. Fetch environmental data for detected city from backend
          setFetchingData(true);
          const analyticsResponse = await fetch('http://localhost:8000/api/analyze', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              city: cityName,
              name: userProfile.name,
              asthma: userProfile.asthma
            })
          });

          const resData = await analyticsResponse.json();
          setLocalEnvData(resData.environment);
          setLocalAnalysis({
            safety: resData.safety,
            actions: resData.actions,
            weeklyPlan: resData.weekly_plan,
            report: resData.report
          });
          setFetchingData(false);
          setLocating(false);

          // 4. Update Marker and glowing circle on the map
          updateMapHighlight(lat, lon, resData.environment.aqi, cityName);

        } catch (err) {
          console.error("Geocoding or API error:", err);
          setError("Failed to fetch environmental reports for your location.");
          setLocating(false);
          setFetchingData(false);
        }
      },
      (err) => {
        console.error("Geolocation error:", err);
        setError("Location access denied. Please enable location permissions in your browser.");
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  // Helper to place marker and circle with correct AQI colors
  const updateMapHighlight = (lat, lon, aqi, cityName) => {
    if (!window.L || !leafletMap.current) return;

    // Remove existing layers
    if (locationMarker.current) leafletMap.current.removeLayer(locationMarker.current);
    if (locationCircle.current) leafletMap.current.removeLayer(locationCircle.current);

    // Color logic
    let aqiColor = '#10b981'; // safe
    let aqiGlow = 'rgba(16, 185, 129, 0.3)';
    if (aqi > 150) {
      aqiColor = '#ef4444'; // danger
      aqiGlow = 'rgba(239, 68, 68, 0.3)';
    } else if (aqi > 100) {
      aqiColor = '#f59e0b'; // warning
      aqiGlow = 'rgba(245, 158, 11, 0.3)';
    }

    // 1. Create custom pulsing radar icon
    const pulsingRadarIcon = window.L.divIcon({
      className: 'custom-pulsing-marker',
      html: `
        <div style="position: relative; width: 22px; height: 22px;">
          <div style="
            position: absolute;
            width: 14px;
            height: 14px;
            background: ${aqiColor};
            border-radius: 50%;
            top: 4px;
            left: 4px;
            box-shadow: 0 0 10px ${aqiColor};
            border: 2.5px solid #fff;
            z-index: 2;
          "></div>
          <div class="radar-wave" style="
            position: absolute;
            width: 22px;
            height: 22px;
            background: ${aqiColor};
            opacity: 0.45;
            border-radius: 50%;
            top: 0;
            left: 0;
            z-index: 1;
          "></div>
        </div>
      `,
      iconSize: [22, 22],
      iconAnchor: [11, 11]
    });

    // 2. Add Marker
    locationMarker.current = window.L.marker([lat, lon], { icon: pulsingRadarIcon })
      .addTo(leafletMap.current)
      .bindPopup(`<div style="color:#fff;font-family:var(--font-primary);font-size:0.8rem;text-align:center;padding:0.25rem;">
        <strong style="font-size:0.9rem;display:block;margin-bottom:0.25rem;">${cityName}</strong>
        AQI Score: <strong style="color:${aqiColor};">${aqi}</strong>
      </div>`, { closeButton: false })
      .openPopup();

    // 3. Add Glowing boundary Circle
    locationCircle.current = window.L.circle([lat, lon], {
      color: aqiColor,
      fillColor: aqiColor,
      fillOpacity: 0.08,
      weight: 1.5,
      radius: 2000, // 2km radius
      dashArray: '5, 5'
    }).addTo(leafletMap.current);
  };

  // Apply location as active app-wide city
  const applyLocalCity = () => {
    if (detectedLoc) {
      // Add city to list if not present
      const alreadyListed = cities.some(c => c.name.toLowerCase() === detectedLoc.city.toLowerCase());
      if (!alreadyListed) {
        setCities(prev => [...prev, { name: detectedLoc.city, country: detectedLoc.countryCode }]);
      }
      setSelectedCity(detectedLoc.city);
      setApplied(true);
    }
  };

  // Generate Location Environmental Alerts and Notifications
  const getEnvironmentalNotifications = () => {
    if (!localEnvData) return [];

    const alerts = [];
    const aqi = localEnvData.aqi;

    // 1. AQI Alert
    if (aqi > 150) {
      alerts.push({
        type: 'error',
        title: 'Unhealthy Air Quality Warning',
        message: `AQI is critical at ${aqi} PM2.5: ${localEnvData.pm25} µg/m³. Protect your lungs: keep windows closed, avoid outdoor exercise, and wear an N95 mask outdoors.`,
        icon: <ShieldAlert size={18} />
      });
    } else if (aqi > 100) {
      alerts.push({
        type: 'warning',
        title: 'Moderate Air Quality Warning',
        message: `AQI is elevated at ${aqi}. Sensitive groups and children may feel respiratory irritation. Limit long outdoor exercises.`,
        icon: <AlertTriangle size={18} />
      });
    } else {
      alerts.push({
        type: 'success',
        title: 'Optimal Air Quality',
        message: `Healthy Air Index detected (${aqi} AQI). Great day for outdoor ventilation, walking, or cycling!`,
        icon: <CheckCircle size={18} />
      });
    }

    // 2. UV Index Alert
    if (localEnvData.uv_index >= 8) {
      alerts.push({
        type: 'warning',
        title: 'Extreme UV Index Exposure',
        message: `UV Index is dangerously high at ${localEnvData.uv_index.toFixed(1)}. Risk of skin damage is severe. Apply SPF 30+ sunscreen, wear wide-brimmed hats and sunglasses.`,
        icon: <Sun size={18} style={{ color: 'var(--accent-warning)' }} />
      });
    }

    // 3. Temperature & Weather Alert
    if (localEnvData.temperature_c >= 36) {
      alerts.push({
        type: 'warning',
        title: 'Extreme Heat Advisory',
        message: `Local temperature is at ${localEnvData.temperature_c}°C. Avoid dehydration: drink extra fluids and avoid midday sun exposure.`,
        icon: <Thermometer size={18} style={{ color: 'var(--accent-danger)' }} />
      });
    }

    // 4. Pollen Alert
    if (localEnvData.pollen_level === 'high') {
      alerts.push({
        type: 'info',
        title: 'High Pollen Count Notice',
        message: `High pollen allergens detected locally. Consider taking antihistamines if allergic and rinse off pollen after outdoor activities.`,
        icon: <Wind size={18} style={{ color: 'var(--accent-info)' }} />
      });
    }

    // 5. Asthma Profile specific advisory
    if (userProfile.asthma && aqi > 80) {
      alerts.push({
        type: 'error',
        title: 'Personalized Asthma Threat Alert',
        message: `Respiratory Profile Notice: Since you have sensitive airways, carry your emergency inhaler. Ozone and fine particulates are high enough to trigger mild asthma flare-ups.`,
        icon: <ShieldAlert size={18} />
      });
    }

    return alerts;
  };

  const notifications = getEnvironmentalNotifications();

  return (
    <div className="dashboard-grid fade-in">
      <style>{`
        /* Pulsing animation for the radar icon */
        .radar-wave {
          animation: map-pulse-glow 1.8s infinite ease-out;
        }
        @keyframes map-pulse-glow {
          0% {
            transform: scale(0.5);
            opacity: 0.8;
          }
          100% {
            transform: scale(2.2);
            opacity: 0;
          }
        }
      `}</style>

      {/* Map Column */}
      <div className="col-8">
        <div className="glass-panel" style={{ height: '100%', position: 'relative', display: 'flex', flexDirection: 'column', padding: '1rem', minHeight: '520px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.85rem' }}>
            <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Compass size={18} style={{ color: 'var(--accent-info)' }} /> Eco Map: Live Air Quality Tracker
            </h3>
            
            <button 
              onClick={handleLocateUser} 
              className={`glass-btn ${locating ? '' : 'glass-btn-primary'}`} 
              disabled={locating}
              style={{ fontSize: '0.8rem', padding: '0.5rem 1rem' }}
            >
              <Navigation size={14} className={locating ? 'animate-pulse' : ''} />
              {locating ? 'Locating User GPS...' : 'Track My Location'}
            </button>
          </div>

          {/* Leaflet Mount Container */}
          <div ref={mapRef} className="map-container" style={{ flex: 1, borderRadius: '12px', border: '1px solid var(--border-light)', minHeight: '440px', zIndex: 1 }} />
          
          {error && (
            <div style={{ position: 'absolute', bottom: '20px', left: '20px', right: '20px', background: 'rgba(239, 68, 68, 0.95)', color: '#fff', padding: '0.75rem 1rem', borderRadius: '10px', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.5rem', zIndex: 1000, boxShadow: '0 5px 15px rgba(0,0,0,0.3)' }}>
              <AlertTriangle size={16} /> {error}
            </div>
          )}
        </div>
      </div>

      {/* Details & Alerts Sidebar Column */}
      <div className="col-4">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', height: '100%' }}>
          
          {/* Location Report Panel */}
          <div className="glass-panel" style={{ flexShrink: 0 }}>
            <h4 style={{ borderBottom: '1px solid var(--border-light)', paddingBottom: '0.5rem', marginBottom: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <MapPin size={16} style={{ color: 'var(--accent-safe)' }} /> Location Report
            </h4>

            {!localEnvData ? (
              <div style={{ padding: '1.5rem 0', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem' }}>
                <Navigation size={36} style={{ color: 'var(--color-text-muted)', opacity: 0.5 }} />
                <p style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)' }}>Click "Track My Location" to fetch real-time ecological readings for your exact coordinates.</p>
              </div>
            ) : (
              <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                
                <div>
                  <h5 style={{ fontSize: '1.15rem', color: '#fff', fontWeight: 700 }}>
                    {detectedLoc ? detectedLoc.city : selectedCity}
                  </h5>
                  <p style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>
                    {detectedLoc ? `${detectedLoc.country} | Coords: ${detectedLoc.lat.toFixed(4)}, ${detectedLoc.lon.toFixed(4)}` : 'Sourced via Dashboard Select'}
                  </p>
                </div>

                {/* AQI Summary Banner */}
                <div style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '1rem', 
                  background: 'rgba(255, 255, 255, 0.02)', 
                  border: '1px solid var(--border-light)', 
                  borderRadius: '12px', 
                  padding: '0.75rem 1rem' 
                }}>
                  <div style={{ 
                    width: '60px', 
                    height: '60px', 
                    borderRadius: '50%', 
                    border: `3px solid ${localEnvData.aqi <= 50 ? 'var(--accent-safe)' : localEnvData.aqi <= 100 ? 'var(--accent-warning)' : 'var(--accent-danger)'}`, 
                    boxShadow: `0 0 10px ${localEnvData.aqi <= 50 ? 'var(--accent-safe-glow)' : localEnvData.aqi <= 100 ? 'var(--accent-warning-glow)' : 'var(--accent-danger-glow)'}`,
                    display: 'flex', 
                    flexDirection: 'column', 
                    alignItems: 'center', 
                    justifyContent: 'center' 
                  }}>
                    <span style={{ fontSize: '1.25rem', fontWeight: 800, color: '#fff' }}>{localEnvData.aqi}</span>
                    <span style={{ fontSize: '0.5rem', color: 'var(--color-text-secondary)', fontWeight: 600 }}>AQI</span>
                  </div>

                  <div>
                    <span className={`badge ${localEnvData.aqi <= 50 ? 'badge-safe' : localEnvData.aqi <= 100 ? 'badge-warning' : 'badge-danger'}`} style={{ fontSize: '0.65rem' }}>
                      {localEnvData.aqi <= 50 ? 'Good' : localEnvData.aqi <= 100 ? 'Moderate' : 'Unhealthy'}
                    </span>
                    <p style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)', marginTop: '0.25rem', fontWeight: 500 }}>
                      Particulates PM2.5: <span style={{ color: '#fff' }}>{localEnvData.pm25} µg/m³</span>
                    </p>
                  </div>
                </div>

                {/* Metrics Small Grid */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                  <div style={{ background: 'rgba(255,255,255,0.01)', border: '1px solid var(--border-light)', padding: '0.5rem 0.75rem', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Thermometer size={14} style={{ color: 'var(--accent-danger)' }} />
                    <div style={{ fontSize: '0.75rem' }}>
                      <p style={{ color: 'var(--color-text-muted)', fontSize: '0.6rem' }}>Temp</p>
                      <p style={{ color: '#fff', fontWeight: 600 }}>{localEnvData.temperature_c}°C</p>
                    </div>
                  </div>
                  <div style={{ background: 'rgba(255,255,255,0.01)', border: '1px solid var(--border-light)', padding: '0.5rem 0.75rem', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Droplets size={14} style={{ color: 'var(--accent-info)' }} />
                    <div style={{ fontSize: '0.75rem' }}>
                      <p style={{ color: 'var(--color-text-muted)', fontSize: '0.6rem' }}>Humidity</p>
                      <p style={{ color: '#fff', fontWeight: 600 }}>{localEnvData.humidity_pct}%</p>
                    </div>
                  </div>
                  <div style={{ background: 'rgba(255,255,255,0.01)', border: '1px solid var(--border-light)', padding: '0.5rem 0.75rem', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Sun size={14} style={{ color: 'var(--accent-warning)' }} />
                    <div style={{ fontSize: '0.75rem' }}>
                      <p style={{ color: 'var(--color-text-muted)', fontSize: '0.6rem' }}>UV Index</p>
                      <p style={{ color: '#fff', fontWeight: 600 }}>{localEnvData.uv_index.toFixed(1)}</p>
                    </div>
                  </div>
                  <div style={{ background: 'rgba(255,255,255,0.01)', border: '1px solid var(--border-light)', padding: '0.5rem 0.75rem', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Wind size={14} style={{ color: 'var(--accent-purple)' }} />
                    <div style={{ fontSize: '0.75rem' }}>
                      <p style={{ color: 'var(--color-text-muted)', fontSize: '0.6rem' }}>Pollen</p>
                      <p style={{ color: '#fff', fontWeight: 600, textTransform: 'capitalize' }}>{localEnvData.pollen_level}</p>
                    </div>
                  </div>
                </div>

                {/* Apply Button */}
                {detectedLoc && (
                  <button 
                    onClick={applyLocalCity}
                    className={`glass-btn ${applied ? '' : 'glass-btn-primary'}`}
                    style={{ width: '100%', fontSize: '0.8rem', padding: '0.6rem', marginTop: '0.25rem' }}
                    disabled={applied}
                  >
                    {applied ? (
                      <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', color: 'var(--accent-safe)' }}>
                        <CheckCircle size={14} /> Location Synced App-wide
                      </span>
                    ) : 'Apply as App Active City'}
                  </button>
                )}

                {/* AQI.in Integration */}
                <div style={{ marginTop: '0.75rem', borderTop: '1px solid var(--border-light)', paddingTop: '0.75rem' }}>
                  <a 
                    href="https://www.aqi.in/"
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="glass-btn"
                    style={{ width: '100%', fontSize: '0.75rem', padding: '0.5rem', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '0.25rem' }}
                  >
                    Compare Live on AQI.in 🌐
                  </a>
                </div>
              </div>

            )}
          </div>

          {/* Environmental Notifications Panel */}
          <div className="glass-panel" style={{ flexGrow: 1, minHeight: '220px', overflowY: 'auto' }}>
            <h4 style={{ borderBottom: '1px solid var(--border-light)', paddingBottom: '0.5rem', marginBottom: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <Bell size={16} style={{ color: 'var(--accent-info)' }} /> Eco Notifications Feed
            </h4>

            {!localEnvData ? (
              <p style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', textAlign: 'center', paddingTop: '2rem' }}>No alerts compiled. Track location to populate feed.</p>
            ) : (
              <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {notifications.map((notif, index) => (
                  <div 
                    key={index} 
                    style={{ 
                      padding: '0.75rem', 
                      borderRadius: '10px', 
                      background: notif.type === 'error' ? 'rgba(239, 68, 68, 0.06)' : notif.type === 'warning' ? 'rgba(245, 158, 11, 0.06)' : 'rgba(16, 185, 129, 0.06)',
                      borderLeft: `3px solid ${notif.type === 'error' ? 'var(--accent-danger)' : notif.type === 'warning' ? 'var(--accent-warning)' : 'var(--accent-safe)'}`,
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#fff', fontWeight: 600, fontSize: '0.75rem', marginBottom: '0.25rem' }}>
                      <span style={{ color: notif.type === 'error' ? 'var(--accent-danger)' : notif.type === 'warning' ? 'var(--accent-warning)' : 'var(--accent-safe)' }}>
                        {notif.icon}
                      </span>
                      {notif.title}
                    </div>
                    <p style={{ fontSize: '0.7rem', color: 'var(--color-text-secondary)', lineHeight: '1.4' }}>{notif.message}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>
      </div>

    </div>
  );
}

export default MapTab;
