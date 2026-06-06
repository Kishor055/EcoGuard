import React from 'react';
import { CalendarDays, Sun, Thermometer, CloudRain, CheckCircle, HelpCircle, AlertCircle } from 'lucide-react';

function PlannerTab({ weeklyPlan, city }) {
  if (!weeklyPlan) {
    return (
      <div style={{ textAlign: 'center', padding: '3rem' }}>
        <p style={{ color: 'var(--color-text-secondary)' }}>Loading weekly schedule plan...</p>
      </div>
    );
  }

  const getSuitabilityIcon = (suitability) => {
    switch (suitability) {
      case 'Optimal':
        return <CheckCircle size={18} style={{ color: 'var(--accent-safe)' }} />;
      case 'Moderate':
        return <HelpCircle size={18} style={{ color: 'var(--accent-warning)' }} />;
      default:
        return <AlertCircle size={18} style={{ color: 'var(--accent-danger)' }} />;
    }
  };

  const getSuitabilityColor = (suitability) => {
    switch (suitability) {
      case 'Optimal': return 'var(--accent-safe)';
      case 'Moderate': return 'var(--accent-warning)';
      default: return 'var(--accent-danger)';
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      
      {/* Overview Intro Card */}
      <div className="glass-panel" style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
        <div style={{ padding: '0.85rem', borderRadius: '14px', background: 'rgba(16, 185, 129, 0.1)', color: 'var(--accent-safe)' }}>
          <CalendarDays size={24} />
        </div>
        <div>
          <h3 style={{ fontSize: '1.25rem', fontWeight: 700 }}>7-Day Environmental Suitability Forecast</h3>
          <p style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)', marginTop: '0.15rem' }}>
            Multi-agent analysis of weather, air safety indices, and micro-climate parameters for <strong>{city}</strong>.
          </p>
        </div>
      </div>

      {/* Grid of days */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {weeklyPlan.map((day, index) => {
          const suitabilityColor = getSuitabilityColor(day.suitability);
          
          return (
            <div 
              key={index} 
              className="glass-panel"
              style={{ 
                display: 'grid', 
                gridTemplateColumns: '2fr 1.5fr 1.5fr 3fr 4fr', 
                alignItems: 'center',
                gap: '1rem',
                borderLeft: `4px solid ${suitabilityColor}`,
                padding: '1.25rem 1.5rem',
                flexWrap: 'wrap'
              }}
            >
              {/* Date & Day */}
              <div>
                <h4 style={{ fontSize: '1rem', fontWeight: 700, color: '#fff' }}>{day.day_name}</h4>
                <span style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>{day.date}</span>
              </div>

              {/* AQI Indicator */}
              <div>
                <span style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', display: 'block', fontWeight: 600, textTransform: 'uppercase' }}>AQI Forecast</span>
                <span style={{ fontSize: '1.1rem', fontWeight: 800, color: suitabilityColor }}>
                  {day.aqi}
                </span>
              </div>

              {/* Temperature & Rain */}
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.8rem', color: 'var(--color-text-secondary)', marginBottom: '0.15rem' }}>
                  <Thermometer size={14} /> {day.temp}°C
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.8rem', color: 'var(--color-text-secondary)' }}>
                  <CloudRain size={14} /> {day.rainfall} mm
                </div>
              </div>

              {/* Outdoor Suitability Badge & short mood */}
              <div>
                <span style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', display: 'block', fontWeight: 600, textTransform: 'uppercase', marginBottom: '0.25rem' }}>Outdoor Activities</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                  {getSuitabilityIcon(day.suitability)}
                  <span style={{ fontSize: '0.8rem', fontWeight: 600, color: suitabilityColor }}>
                    {day.suitability}
                  </span>
                </div>
              </div>

              {/* Plant Irrigation / Ecology recommendation */}
              <div style={{ borderLeft: '1px solid var(--border-light)', paddingLeft: '1.25rem' }}>
                <span style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', display: 'block', fontWeight: 600, textTransform: 'uppercase', marginBottom: '0.15rem' }}>Conservation Irrigation Schedule</span>
                <p style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)', lineHeight: '1.4' }}>
                  {day.plant_care}
                </p>
              </div>

            </div>
          );
        })}
      </div>

    </div>
  );
}

export default PlannerTab;
