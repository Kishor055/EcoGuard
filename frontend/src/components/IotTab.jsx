import React, { useState, useEffect, useRef } from 'react';
import { Radio, Play, Square, AlertTriangle, Zap, Flame, Truck } from 'lucide-react';

function IotTab() {
  const [streaming, setStreaming] = useState(false);
  const [deviceId, setDeviceId] = useState('sensor-gw-01');
  const [pm25, setPm25] = useState(35);
  const [gas, setGas] = useState(15);
  const [noise, setNoise] = useState(52);
  const [temp, setTemp] = useState(26);
  const [humidity, setHumidity] = useState(60);
  
  const [history, setHistory] = useState([]);
  const [localAlerts, setLocalAlerts] = useState([]);
  
  const canvasRef = useRef(null);
  const streamIntervalRef = useRef(null);

  // Draw telemetry chart on canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Draw Grid Lines
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.03)';
    ctx.lineWidth = 1;
    const gridSpacing = 30;
    for (let x = 0; x < canvas.width; x += gridSpacing) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, canvas.height);
      ctx.stroke();
    }
    for (let y = 0; y < canvas.height; y += gridSpacing) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(canvas.width, y);
      ctx.stroke();
    }

    if (history.length < 2) {
      ctx.fillStyle = 'var(--color-text-muted)';
      ctx.font = '12px var(--font-primary)';
      ctx.fillText('Awaiting Telemetry Stream Connection...', canvas.width/2 - 100, canvas.height/2);
      return;
    }

    // Draw Line helper
    const drawLine = (dataKey, strokeColor, shadowColor, maxVal) => {
      ctx.beginPath();
      ctx.strokeStyle = strokeColor;
      ctx.shadowColor = shadowColor;
      ctx.shadowBlur = 8;
      ctx.lineWidth = 2;

      history.forEach((point, idx) => {
        const x = (idx / (history.length - 1)) * (canvas.width - 20) + 10;
        // Map value to canvas height (inverted Y)
        const y = canvas.height - ((point[dataKey] / maxVal) * (canvas.height - 30) + 15);
        
        if (idx === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      });
      ctx.stroke();
      
      // Draw end dot
      const lastPointIdx = history.length - 1;
      const lastX = (lastPointIdx / (history.length - 1)) * (canvas.width - 20) + 10;
      const lastY = canvas.height - ((history[lastPointIdx][dataKey] / maxVal) * (canvas.height - 30) + 15);
      
      ctx.beginPath();
      ctx.arc(lastX, lastY, 4, 0, 2*Math.PI);
      ctx.fillStyle = strokeColor;
      ctx.shadowBlur = 12;
      ctx.fill();
    };

    // Draw lines for PM2.5 (max 250), Gas (max 100), Noise (max 100)
    drawLine('pm25', 'var(--accent-purple)', 'var(--accent-purple-glow)', 250);
    drawLine('gas', 'var(--accent-warning)', 'var(--accent-warning-glow)', 100);
    drawLine('noise', 'var(--accent-info)', 'var(--accent-info-glow)', 100);

    // Reset shadow for next drawing operations
    ctx.shadowBlur = 0;
  }, [history]);

  // Handle ingestion packet trigger
  const ingestPacket = (overrideData = null) => {
    const packet = overrideData || {
      device_id: deviceId,
      pm25: parseFloat(pm25),
      temperature: parseFloat(temp),
      humidity: parseFloat(humidity),
      gas_level: parseFloat(gas),
      noise_level: parseFloat(noise)
    };

    fetch('http://localhost:8000/api/iot-ingest', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(packet)
    })
      .then(res => res.json())
      .then(data => {
        // Log locally
        setHistory(prev => {
          const updated = [...prev, packet];
          return updated.slice(-15); // limit length to 15 points
        });

        if (data.alerts_triggered && data.alerts_triggered.length > 0) {
          setLocalAlerts(prev => [...data.alerts_triggered, ...prev].slice(0, 10));
        }
      })
      .catch(err => {
        console.warn('Ingestion failed, simulating local client logging:', err);
        // Local fallback logic
        const alerts = [];
        if (packet.pm25 > 150) alerts.push({ severity: 'critical', type: 'AQI', message: `Local Ingest: High PM2.5 (${packet.pm25})!` });
        if (packet.gas_level > 60) alerts.push({ severity: 'critical', type: 'Gas Leak', message: `Local Ingest: High VOCs (${packet.gas_level})!` });
        if (packet.noise_level > 85) alerts.push({ severity: 'warning', type: 'Noise', message: `Local Ingest: High decibels (${packet.noise_level} dB)!` });
        
        setHistory(prev => {
          const updated = [...prev, packet];
          return updated.slice(-15);
        });
        if (alerts.length > 0) {
          const stamped = alerts.map(a => ({ ...a, timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }), device_id: packet.device_id }));
          setLocalAlerts(prev => [...stamped, ...prev].slice(0, 10));
        }
      });
  };

  // Toggle telemetry loop
  useEffect(() => {
    if (streaming) {
      streamIntervalRef.current = setInterval(() => {
        // Add minor random fluctuation to current sliders
        const drift = (val, max, min, factor = 2) => {
          const offset = (Math.random() - 0.5) * factor;
          return Math.max(min, Math.min(max, Math.round(val + offset)));
        };

        const currentPm = drift(pm25, 250, 1, 3);
        const currentGas = drift(gas, 100, 1, 2);
        const currentNoise = drift(noise, 100, 30, 4);

        setPm25(currentPm);
        setGas(currentGas);
        setNoise(currentNoise);

        ingestPacket({
          device_id: deviceId,
          pm25: currentPm,
          temperature: parseFloat(temp),
          humidity: parseFloat(humidity),
          gas_level: currentGas,
          noise_level: currentNoise
        });
      }, 1500);
    } else {
      if (streamIntervalRef.current) clearInterval(streamIntervalRef.current);
    }

    return () => {
      if (streamIntervalRef.current) clearInterval(streamIntervalRef.current);
    };
  }, [streaming, pm25, gas, noise, temp, humidity, deviceId]);

  const handleToggleStream = () => {
    setStreaming(!streaming);
  };

  // Anomaly Bursts
  const triggerWildfireBurst = () => {
    const fireData = {
      device_id: deviceId,
      pm25: 230,
      temperature: 42,
      humidity: 15,
      gas_level: 85,
      noise_level: 55
    };
    setPm25(230);
    setTemp(42);
    setHumidity(15);
    setGas(85);
    ingestPacket(fireData);
  };

  const triggerTrafficBurst = () => {
    const trafficData = {
      device_id: deviceId,
      pm25: 135,
      temperature: 31,
      humidity: 50,
      gas_level: 45,
      noise_level: 92
    };
    setPm25(135);
    setTemp(31);
    setHumidity(50);
    setGas(45);
    setNoise(92);
    ingestPacket(trafficData);
  };

  return (
    <div className="dashboard-grid">
      
      {/* Simulation Controls Column */}
      <div className="col-4" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', borderBottom: '1px solid var(--border-light)', paddingBottom: '0.5rem' }}>
            <Radio size={18} style={{ color: 'var(--accent-info)' }} /> Sensor Telemetry Gateway
          </h3>

          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)', minWidth: '70px' }}>Gate ID:</span>
            <input 
              type="text" 
              value={deviceId} 
              onChange={(e) => setDeviceId(e.target.value)}
              className="glass-input" 
              style={{ padding: '0.4rem 0.75rem', fontSize: '0.85rem' }}
              disabled={streaming}
            />
          </div>

          {/* Sliders */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: 'var(--color-text-secondary)' }}>
              <span>Base PM2.5</span>
              <span>{pm25} µg/m³</span>
            </div>
            <input 
              type="range" min="1" max="250" value={pm25} 
              onChange={(e) => setPm25(parseInt(e.target.value))} 
              className="glass-slider" disabled={streaming}
            />
          </div>

          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: 'var(--color-text-secondary)' }}>
              <span>Base VOCs / Toxic Gas</span>
              <span>{gas} ppm</span>
            </div>
            <input 
              type="range" min="1" max="100" value={gas} 
              onChange={(e) => setGas(parseInt(e.target.value))} 
              className="glass-slider" disabled={streaming}
            />
          </div>

          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: 'var(--color-text-secondary)' }}>
              <span>Base Noise Level</span>
              <span>{noise} dB</span>
            </div>
            <input 
              type="range" min="30" max="100" value={noise} 
              onChange={(e) => setNoise(parseInt(e.target.value))} 
              className="glass-slider" disabled={streaming}
            />
          </div>

          <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
            <button 
              onClick={handleToggleStream} 
              className={`glass-btn ${streaming ? 'glass-btn-danger' : 'glass-btn-primary'}`}
              style={{ flex: 1 }}
            >
              {streaming ? (
                <>
                  <Square size={16} fill="currentColor" /> Stop Stream
                </>
              ) : (
                <>
                  <Play size={16} fill="currentColor" /> Start Broadcast
                </>
              )}
            </button>
            
            {!streaming && (
              <button 
                onClick={() => ingestPacket()} 
                className="glass-btn" 
                style={{ padding: '0.75rem 1rem' }}
              >
                Ingest 1x
              </button>
            )}
          </div>
        </div>

        {/* Anomaly Burst triggers */}
        <div className="glass-panel">
          <h4 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem', fontSize: '0.95rem' }}>
            <Zap size={16} style={{ color: 'var(--accent-warning)' }} /> Anomaly Injection Panel
          </h4>
          <p style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginBottom: '1rem', lineHeight: '1.4' }}>
            Inject high-stress telemetry patterns to immediately test safety agent alert mechanisms.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <button 
              onClick={triggerWildfireBurst} 
              className="glass-btn" 
              style={{ fontSize: '0.8rem', justifyContent: 'flex-start', gap: '0.75rem', padding: '0.65rem' }}
            >
              <Flame size={16} style={{ color: 'var(--accent-danger)' }} /> Simulate Wildfire Alert
            </button>
            <button 
              onClick={triggerTrafficBurst} 
              className="glass-btn" 
              style={{ fontSize: '0.8rem', justifyContent: 'flex-start', gap: '0.75rem', padding: '0.65rem' }}
            >
              <Truck size={16} style={{ color: 'var(--accent-info)' }} /> Industrial Traffic Peak
            </button>
          </div>
        </div>
      </div>

      {/* Oscillosope Screen & Ingest Log */}
      <div className="col-8" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        {/* Oscilloscope canvas */}
        <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', height: '320px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-light)', paddingBottom: '0.5rem', marginBottom: '0.75rem' }}>
            <h4 style={{ fontSize: '0.95rem', fontWeight: 600 }}>📡 Live Telemetry Stream Oscilloscope</h4>
            <div style={{ display: 'flex', gap: '0.75rem', fontSize: '0.7rem', fontWeight: 600 }}>
              <span style={{ color: 'var(--accent-purple)', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>● PM2.5 (1-250)</span>
              <span style={{ color: 'var(--accent-warning)', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>● VOC Gas (1-100)</span>
              <span style={{ color: 'var(--accent-info)', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>● Noise (30-100dB)</span>
            </div>
          </div>
          <div style={{ flex: 1, position: 'relative', width: '100%', background: '#070a12', borderRadius: '12px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.03)' }}>
            <canvas 
              ref={canvasRef} 
              width="580" 
              height="230" 
              style={{ width: '100%', height: '100%', display: 'block' }}
            />
          </div>
        </div>

        {/* Live Ingestion Alerts Log */}
        <div className="glass-panel" style={{ flex: 1, overflowY: 'auto', maxHeight: '250px' }}>
          <h4 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', borderBottom: '1px solid var(--border-light)', paddingBottom: '0.5rem', marginBottom: '0.75rem', fontSize: '0.95rem' }}>
            <AlertTriangle size={16} style={{ color: 'var(--accent-warning)' }} /> Live Gateway Threat Monitor
          </h4>
          {localAlerts.length === 0 ? (
            <p style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', textAlign: 'center', padding: '1.5rem 0' }}>
              No critical sensor threshold violations detected in active gateway.
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {localAlerts.map((alert, idx) => (
                <div 
                  key={idx} 
                  style={{ 
                    padding: '0.65rem 0.85rem', 
                    borderRadius: '8px', 
                    background: alert.severity === 'critical' ? 'rgba(239, 68, 68, 0.08)' : 'rgba(245, 158, 11, 0.08)',
                    borderLeft: `4px solid ${alert.severity === 'critical' ? 'var(--accent-danger)' : 'var(--accent-warning)'}`,
                    fontSize: '0.8rem',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}
                >
                  <div>
                    <span style={{ fontWeight: 600, marginRight: '0.5rem', textTransform: 'uppercase', color: alert.severity === 'critical' ? 'var(--accent-danger)' : 'var(--accent-warning)' }}>
                      [{alert.severity}]
                    </span>
                    <span style={{ color: '#fff' }}>{alert.message}</span>
                  </div>
                  <span style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)' }}>{alert.timestamp}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

    </div>
  );
}

export default IotTab;
