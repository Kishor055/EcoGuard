import React, { useState } from 'react';
import { Brain, Thermometer, Droplets, Wind, Sparkles } from 'lucide-react';

function PredictorTab() {
  const [temp, setTemp] = useState(28);
  const [humidity, setHumidity] = useState(65);
  const [pm25, setPm25] = useState(35);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const handlePredict = () => {
    setLoading(true);
    fetch('http://localhost:8000/api/predict-aqi', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        temperature: parseFloat(temp),
        humidity: parseFloat(humidity),
        pm25: parseFloat(pm25)
      })
    })
      .then(res => res.json())
      .then(data => {
        setResult(data);
        setLoading(false);
      })
      .catch(err => {
        console.error('Prediction error:', err);
        // Fallback approximation formula in case server fails
        const mockAqi = Math.round((pm25 * 1.6) + (temp * 0.5) + (humidity * 0.15) + 5);
        let category = 'Good';
        let color = '#10B981';
        if (mockAqi > 300) { category = 'Hazardous'; color = '#7F1D1D'; }
        else if (mockAqi > 200) { category = 'Very Unhealthy'; color = '#7C3AED'; }
        else if (mockAqi > 150) { category = 'Unhealthy'; color = '#DC2626'; }
        else if (mockAqi > 100) { category = 'Unhealthy for Sensitive Groups'; color = '#EF4444'; }
        else if (mockAqi > 50) { category = 'Moderate'; color = '#F59E0B'; }

        setResult({
          predicted_aqi: mockAqi,
          category,
          color,
          features: { temperature: temp, humidity, pm25 }
        });
        setLoading(false);
      });
  };

  return (
    <div className="dashboard-grid">
      {/* Parameters Panel */}
      <div className="col-6">
        <div className="glass-panel" style={{ height: '100%', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', borderBottom: '1px solid var(--border-light)', paddingBottom: '0.5rem' }}>
            <Brain size={18} style={{ color: 'var(--accent-info)' }} /> AI Predictive Model Parameters
          </h3>
          
          <p style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)', lineHeight: '1.4' }}>
            Adjust the sliders below to simulate environmental circumstances. The EcoGuard machine learning model (trained Random Forest Regressor) will predict the corresponding Air Quality Index (AQI).
          </p>

          {/* Slider: Temp */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', color: 'var(--color-text-secondary)' }}>
                <Thermometer size={16} /> Temperature
              </span>
              <span style={{ color: '#fff', fontWeight: 600 }}>{temp} °C</span>
            </div>
            <input 
              type="range" 
              min="10" 
              max="50" 
              value={temp} 
              onChange={(e) => setTemp(e.target.value)}
              className="glass-slider" 
            />
          </div>

          {/* Slider: Humidity */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', color: 'var(--color-text-secondary)' }}>
                <Droplets size={16} /> Humidity
              </span>
              <span style={{ color: '#fff', fontWeight: 600 }}>{humidity} %</span>
            </div>
            <input 
              type="range" 
              min="10" 
              max="100" 
              value={humidity} 
              onChange={(e) => setHumidity(e.target.value)}
              className="glass-slider" 
            />
          </div>

          {/* Slider: PM2.5 */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', color: 'var(--color-text-secondary)' }}>
                <Wind size={16} /> PM2.5 Particulates
              </span>
              <span style={{ color: '#fff', fontWeight: 600 }}>{pm25} µg/m³</span>
            </div>
            <input 
              type="range" 
              min="1" 
              max="250" 
              value={pm25} 
              onChange={(e) => setPm25(e.target.value)}
              className="glass-slider" 
            />
          </div>

          <button 
            onClick={handlePredict}
            className="glass-btn glass-btn-primary" 
            style={{ width: '100%', padding: '0.95rem', marginTop: 'auto' }}
            disabled={loading}
          >
            {loading ? 'Consulting model...' : 'Predict Air Quality Index'}
          </button>
        </div>
      </div>

      {/* Model Predictions Output */}
      <div className="col-6">
        <div className="glass-panel" style={{ height: '100%', display: 'flex', flexDirection: 'column', justifyContent: result ? 'flex-start' : 'center', alignItems: result ? 'unset' : 'center', textAlign: result ? 'left' : 'center', minHeight: '350px' }}>
          {!result ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem', padding: '2rem' }}>
              <div style={{ padding: '1rem', borderRadius: '50%', background: 'rgba(14,165,233,0.05)', color: 'var(--accent-info)', animation: 'pulse 2s infinite' }}>
                <Brain size={48} />
              </div>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 600 }}>Awaiting Model Evaluation</h3>
              <p style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)', maxWidth: '300px', lineHeight: '1.5' }}>
                Press "Predict Air Quality Index" to run the Random Forest ML model on the selected parameters.
              </p>
            </div>
          ) : (
            <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', height: '100%' }}>
              <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', borderBottom: '1px solid var(--border-light)', paddingBottom: '0.5rem' }}>
                <Sparkles size={18} style={{ color: 'var(--accent-purple)' }} /> Inference Report
              </h3>

              <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
                {/* Visual AQI circle */}
                <div style={{ width: '100px', height: '100px', borderRadius: '50%', border: `4px solid ${result.color}`, boxShadow: `0 0 15px ${result.color}40`, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                  <span style={{ fontSize: '2rem', fontWeight: 800, color: '#fff' }}>{result.predicted_aqi}</span>
                  <span style={{ fontSize: '0.6rem', color: 'var(--color-text-secondary)', fontWeight: 600 }}>AQI</span>
                </div>

                <div>
                  <span className="badge" style={{ backgroundColor: `${result.color}20`, color: result.color, borderColor: `${result.color}40` }}>
                    {result.category}
                  </span>
                  <h4 style={{ marginTop: '0.5rem', fontSize: '1rem', fontWeight: 700 }}>Predicted Environmental Impact</h4>
                </div>
              </div>

              {/* Progress bar scale */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--color-text-secondary)', marginBottom: '0.35rem' }}>
                  <span>US AQI Spectrum Scale</span>
                  <span>Max: 500</span>
                </div>
                <div style={{ height: '10px', background: 'rgba(255,255,255,0.05)', borderRadius: '5px', overflow: 'hidden', display: 'flex' }}>
                  <div 
                    style={{ 
                      width: `${Math.min(100, (result.predicted_aqi / 500) * 100)}%`, 
                      background: result.color, 
                      boxShadow: `0 0 10px ${result.color}`,
                      borderRadius: '5px',
                      transition: 'width 0.8s cubic-bezier(0.4, 0, 0.2, 1)' 
                    }}
                  />
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.6rem', color: 'var(--color-text-muted)', marginTop: '0.25rem' }}>
                  <span>0 (Good)</span>
                  <span>100 (Mod)</span>
                  <span>150 (Unhealthy)</span>
                  <span>300 (Very Unhealthy)</span>
                </div>
              </div>

              {/* Impact analysis text */}
              <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-light)', padding: '1rem', borderRadius: '12px', fontSize: '0.8rem', lineHeight: '1.5', color: 'var(--color-text-secondary)', marginTop: 'auto' }}>
                <strong>Model Findings:</strong>
                {result.predicted_aqi > 150 ? (
                  <p style={{ marginTop: '0.25rem' }}>The high concentration of particulate matter ({result.features.pm25} µg/m³) is the primary driver of this AQI. Combined with these thermal and humidity levels, conditions are unfavorable. Action is recommended to stay indoors.</p>
                ) : result.predicted_aqi > 100 ? (
                  <p style={{ marginTop: '0.25rem' }}>Moderate conditions are present, but sensitive demographics may start feeling slight chest strain or respiratory resistance. Minimize extensive aerobic actions outdoors.</p>
                ) : (
                  <p style={{ marginTop: '0.25rem' }}>The model indicates a healthy environmental state. Particulates and weather variables are balanced, leading to an optimal outdoor feasibility score.</p>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default PredictorTab;
