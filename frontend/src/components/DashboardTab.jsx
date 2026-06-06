import React from 'react';
import { 
  Thermometer, 
  Droplets, 
  Wind, 
  Sun, 
  CloudRain, 
  ShieldAlert, 
  Info, 
  Leaf, 
  FileText 
} from 'lucide-react';

function DashboardTab({ envData, analysisData }) {
  if (!envData) return null;

  // AQI Level Helpers
  const getAqiConfig = (aqi) => {
    if (aqi <= 50) return { label: 'Good', color: 'var(--accent-safe)', text: 'Air quality is satisfactory and poses little to no risk.', glow: 'var(--accent-safe-glow)' };
    if (aqi <= 100) return { label: 'Moderate', color: 'var(--accent-warning)', text: 'Air quality is acceptable; however, sensitive individuals may be affected.', glow: 'var(--accent-warning-glow)' };
    if (aqi <= 150) return { label: 'Unhealthy for Sensitive Groups', color: '#f97316', text: 'Sensitive groups may experience health effects. General public not likely affected.', glow: 'rgba(249, 115, 22, 0.35)' };
    if (aqi <= 200) return { label: 'Unhealthy', color: 'var(--accent-danger)', text: 'Everyone may begin to experience health effects; sensitive groups more seriously.', glow: 'var(--accent-danger-glow)' };
    if (aqi <= 300) return { label: 'Very Unhealthy', color: 'var(--accent-purple)', text: 'Health alert: everyone may experience more serious health effects.', glow: 'var(--accent-purple-glow)' };
    return { label: 'Hazardous', color: '#7f1d1d', text: 'Health warning of emergency conditions. The entire population is more likely to be affected.', glow: 'rgba(127, 29, 29, 0.5)' };
  };

  const aqiConfig = getAqiConfig(envData.aqi);

  return (
    <div className="dashboard-grid">
      {/* Column Left: Main Gauge & Metrics */}
      <div className="col-8" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        
        {/* AQI Overview Panel */}
        <div 
          className="glass-panel" 
          style={{ 
            borderLeft: `5px solid ${aqiConfig.color}`,
            boxShadow: `0 8px 32px 0 ${aqiConfig.glow}`,
            display: 'flex',
            alignItems: 'center',
            gap: '2rem',
            flexWrap: 'wrap'
          }}
        >
          {/* Circular Gauge */}
          <div style={{ position: 'relative', width: '130px', height: '130px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg style={{ transform: 'rotate(-90deg)', width: '130px', height: '130px' }}>
              <circle 
                cx="65" cy="65" r="55" 
                stroke="rgba(255,255,255,0.03)" 
                strokeWidth="10" 
                fill="transparent" 
              />
              <circle 
                cx="65" cy="65" r="55" 
                stroke={aqiConfig.color} 
                strokeWidth="10" 
                fill="transparent" 
                strokeDasharray="345"
                strokeDashoffset={345 - (345 * Math.min(envData.aqi, 350)) / 350}
                style={{ transition: 'stroke-dashoffset 1s ease-in-out', strokeLinecap: 'round' }}
              />
            </svg>
            <div style={{ position: 'absolute', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <span style={{ fontSize: '2rem', fontWeight: 800, fontFamily: 'var(--font-display)', color: '#fff' }}>{envData.aqi}</span>
              <span style={{ fontSize: '0.7rem', color: 'var(--color-text-secondary)', fontWeight: 600, textTransform: 'uppercase' }}>AQI Score</span>
            </div>
          </div>

          {/* Details */}
          <div style={{ flex: 1, minWidth: '220px' }}>
            <span 
              className="badge" 
              style={{ 
                backgroundColor: `${aqiConfig.color}20`, 
                color: aqiConfig.color, 
                border: `1px solid ${aqiConfig.color}40`,
                marginBottom: '0.5rem'
              }}
            >
              {aqiConfig.label}
            </span>
            <h2 style={{ fontSize: '1.4rem', fontWeight: 700, marginBottom: '0.35rem' }}>Air Quality Status</h2>
            <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.85rem', lineHeight: '1.4' }}>
              {aqiConfig.text}
            </p>
          </div>
        </div>

        {/* Environmental Parameter Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
          
          {/* Temperature */}
          <div className="glass-panel" style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{ padding: '0.75rem', borderRadius: '12px', background: 'rgba(14, 165, 233, 0.08)', color: 'var(--accent-info)' }}>
              <Thermometer size={20} />
            </div>
            <div>
              <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.75rem', fontWeight: 600 }}>Temperature</p>
              <h3 style={{ fontSize: '1.25rem', color: '#fff' }}>{envData.temperature_c} °C</h3>
            </div>
          </div>

          {/* Humidity */}
          <div className="glass-panel" style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{ padding: '0.75rem', borderRadius: '12px', background: 'rgba(16, 185, 129, 0.08)', color: 'var(--accent-safe)' }}>
              <Droplets size={20} />
            </div>
            <div>
              <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.75rem', fontWeight: 600 }}>Humidity</p>
              <h3 style={{ fontSize: '1.25rem', color: '#fff' }}>{envData.humidity_pct} %</h3>
            </div>
          </div>

          {/* PM2.5 */}
          <div className="glass-panel" style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{ padding: '0.75rem', borderRadius: '12px', background: 'rgba(168, 85, 247, 0.08)', color: 'var(--accent-purple)' }}>
              <Wind size={20} />
            </div>
            <div>
              <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.75rem', fontWeight: 600 }}>PM2.5 particulate</p>
              <h3 style={{ fontSize: '1.25rem', color: '#fff' }}>{envData.pm25} µg/m³</h3>
            </div>
          </div>

          {/* UV Index */}
          <div className="glass-panel" style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{ padding: '0.75rem', borderRadius: '12px', background: 'rgba(245, 158, 11, 0.08)', color: 'var(--accent-warning)' }}>
              <Sun size={20} />
            </div>
            <div>
              <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.75rem', fontWeight: 600 }}>UV Exposure</p>
              <h3 style={{ fontSize: '1.25rem', color: '#fff' }}>{envData.uv_index} Index</h3>
            </div>
          </div>

          {/* Rainfall */}
          <div className="glass-panel" style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{ padding: '0.75rem', borderRadius: '12px', background: 'rgba(14, 165, 233, 0.08)', color: 'var(--accent-info)' }}>
              <CloudRain size={20} />
            </div>
            <div>
              <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.75rem', fontWeight: 600 }}>Precipitation</p>
              <h3 style={{ fontSize: '1.25rem', color: '#fff' }}>{envData.rainfall_mm} mm</h3>
            </div>
          </div>

          {/* Pollen Level */}
          <div className="glass-panel" style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{ padding: '0.75rem', borderRadius: '12px', background: 'rgba(16, 185, 129, 0.08)', color: 'var(--accent-safe)' }}>
              <Leaf size={20} />
            </div>
            <div>
              <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.75rem', fontWeight: 600 }}>Pollen Level</p>
              <h3 style={{ fontSize: '1.25rem', color: '#fff', textTransform: 'capitalize' }}>{envData.pollen_level}</h3>
            </div>
          </div>

        </div>

        {/* Compiled Report text */}
        {analysisData?.report && (
          <div className="glass-panel">
            <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem', borderBottom: '1px solid var(--border-light)', paddingBottom: '0.5rem' }}>
              <FileText size={18} style={{ color: 'var(--accent-info)' }} /> Compiled Agentic Briefing
            </h3>
            <pre style={{ 
              fontFamily: 'var(--font-primary)', 
              whiteSpace: 'pre-wrap', 
              fontSize: '0.85rem', 
              lineHeight: '1.5',
              color: 'var(--color-text-secondary)',
              background: 'rgba(0,0,0,0.2)',
              padding: '1rem',
              borderRadius: '8px',
              border: '1px solid var(--border-light)'
            }}>
              {analysisData.report.summary_text}
            </pre>
          </div>
        )}

        {/* AQI.in Live Environment Integration */}
        <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', borderBottom: '1px solid var(--border-light)', paddingBottom: '0.5rem', fontSize: '1rem' }}>
            <Leaf size={18} style={{ color: 'var(--accent-safe)' }} /> AQI.in Live Monitor Link
          </h3>
          <p style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)', lineHeight: '1.4' }}>
            Compare EcoGuard telemetry with high-density monitoring stations, local sensors, and Indian CPCB real-time AQI networks on the **AQI.in** platform.
          </p>
          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
            <a 
              href="https://www.aqi.in/"
              target="_blank" 
              rel="noopener noreferrer"
              className="glass-btn glass-btn-primary"
              style={{ fontSize: '0.75rem', padding: '0.6rem 1.1rem', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}
            >
              View Live Dashboard on AQI.in 🌐
            </a>
            <a 
              href="https://www.aqi.in/real-time-most-polluted-city-in-india" 
              target="_blank" 
              rel="noopener noreferrer"
              className="glass-btn"
              style={{ fontSize: '0.75rem', padding: '0.6rem 1.1rem', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}
            >
              India Pollution Leaderboard 📊
            </a>
          </div>
        </div>

      </div>


      {/* Column Right: Safety Advisor & Active Warnings */}
      <div className="col-4" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        
        {/* Active Weather Warnings */}
        {envData.weather_alerts && envData.weather_alerts.length > 0 && (
          <div className="glass-panel pulse-critical" style={{ background: 'rgba(239, 68, 68, 0.05)' }}>
            <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--accent-danger)', marginBottom: '0.75rem', fontSize: '1rem' }}>
              <ShieldAlert size={20} /> Extreme Weather Warnings
            </h3>
            <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
              {envData.weather_alerts.map((alert, idx) => (
                <li 
                  key={idx} 
                  style={{ 
                    fontSize: '0.8rem', 
                    fontWeight: 600, 
                    color: '#fff', 
                    background: 'rgba(239,68,68,0.15)', 
                    padding: '0.5rem 0.75rem', 
                    borderRadius: '8px',
                    border: '1px solid rgba(239,68,68,0.3)'
                  }}
                >
                  {alert}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Safety Guidelines */}
        {analysisData?.safety && (
          <div className="glass-panel">
            <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem', borderBottom: '1px solid var(--border-light)', paddingBottom: '0.5rem', fontSize: '1rem' }}>
              <ShieldAlert size={18} style={{ color: 'var(--accent-warning)' }} /> Safety Advisor Recommendations
            </h3>
            <ul style={{ paddingLeft: '1.2rem', display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
              {analysisData.safety.tips.map((tip, idx) => (
                <li key={idx} style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)', lineHeight: '1.4' }}>
                  {tip}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Community Actions */}
        {analysisData?.actions && (
          <div className="glass-panel">
            <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem', borderBottom: '1px solid var(--border-light)', paddingBottom: '0.5rem', fontSize: '1rem' }}>
              <Leaf size={18} style={{ color: 'var(--accent-safe)' }} /> Recommended Eco-Habits
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {analysisData.actions.map((act, idx) => (
                <div 
                  key={idx} 
                  style={{ 
                    display: 'flex', 
                    gap: '0.75rem', 
                    alignItems: 'flex-start',
                    padding: '0.75rem',
                    background: 'rgba(255,255,255,0.02)',
                    borderRadius: '10px',
                    border: '1px solid var(--border-light)',
                    fontSize: '0.8rem',
                    color: 'var(--color-text-secondary)'
                  }}
                >
                  <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '20px', height: '20px', borderRadius: '50%', background: 'rgba(16,185,129,0.1)', color: 'var(--accent-safe)', fontWeight: 'bold', fontSize: '0.75rem', flexShrink: 0 }}>
                    {idx + 1}
                  </span>
                  <span>{act}</span>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}

export default DashboardTab;
