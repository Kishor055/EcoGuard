import React, { useState, useEffect } from 'react';
import { 
  LayoutDashboard, 
  MessageSquare, 
  Brain, 
  Radio, 
  CalendarDays, 
  Award, 
  MapPin, 
  Bell, 
  ShieldAlert,
  User,
  Activity,
  ChevronDown
} from 'lucide-react';

import DashboardTab from './components/DashboardTab';
import AssistantTab from './components/AssistantTab';
import PredictorTab from './components/PredictorTab';
import IotTab from './components/IotTab';
import PlannerTab from './components/PlannerTab';
import EcoTab from './components/EcoTab';
import MapTab from './components/MapTab';


function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [selectedCity, setSelectedCity] = useState('Mumbai');
  const [cities, setCities] = useState([]);
  const [envData, setEnvData] = useState(null);
  const [analysisData, setAnalysisData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [isSidebarActive, setIsSidebarActive] = useState(false);

  // User profile state
  const [userProfile, setUserProfile] = useState({
    name: 'Kishor',
    asthma: false
  });

  // Global Points and Alerts (for IoT simulator and checklist)
  const [ecoPoints, setEcoPoints] = useState(120);
  const [iotAlerts, setIotAlerts] = useState([]);
  const [unreadAlertsCount, setUnreadAlertsCount] = useState(0);
  const [showAlertDropdown, setShowAlertDropdown] = useState(false);

  // Load suggestions on mount
  useEffect(() => {
    fetch('http://localhost:8000/api/city-suggestions')
      .then(res => res.json())
      .then(data => setCities(data))
      .catch(err => {
        console.warn('Fallback to static cities list due to backend load:', err);
        setCities([
          { name: 'Mumbai', country: 'IN' },
          { name: 'Delhi', country: 'IN' },
          { name: 'London', country: 'UK' },
          { name: 'New York', country: 'US' },
          { name: 'Tokyo', country: 'JP' },
          { name: 'Sydney', country: 'AU' }
        ]);
      });
  }, []);

  // Poll for IoT alerts from the backend every 3 seconds to keep them synchronized
  useEffect(() => {
    const fetchIotAlerts = () => {
      fetch('http://localhost:8000/api/iot-alerts')
        .then(res => res.json())
        .then(data => {
          setIotAlerts(data);
          // Count alerts that occurred in the last minute as new unread
          setUnreadAlertsCount(prev => data.length > prev ? data.length - prev : prev);
        })
        .catch(err => console.debug('No active IoT alerts loaded from backend'));
    };

    fetchIotAlerts();
    const interval = setInterval(fetchIotAlerts, 3000);
    return () => clearInterval(interval);
  }, []);

  // Fetch metrics when city changes or user profile changes
  const fetchEnvData = () => {
    setLoading(true);
    fetch('http://localhost:8000/api/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        city: selectedCity,
        name: userProfile.name,
        asthma: userProfile.asthma
      })
    })
      .then(res => res.json())
      .then(data => {
        setEnvData(data.environment);
        setAnalysisData({
          safety: data.safety,
          actions: data.actions,
          weeklyPlan: data.weekly_plan,
          report: data.report
        });
        setLoading(false);
      })
      .catch(err => {
        console.error('API Error, check if uvicorn server is running:', err);
        // Load mock fallback inside frontend if backend fails
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchEnvData();
  }, [selectedCity, userProfile.asthma]);

  // Clear notifications
  const handleBellClick = () => {
    setShowAlertDropdown(!showAlertDropdown);
    setUnreadAlertsCount(0);
  };

  return (
    <div className="app-container">
      {/* Sidebar Navigation */}
      <aside className={`sidebar ${isSidebarActive ? 'active' : ''}`}>
        <div className="brand-section">
          <div className="brand-logo">
            <Radio size={24} style={{ color: '#fff' }} />
          </div>
          <span className="brand-name">EcoGuard</span>
        </div>

        {/* City Selection dropdown */}
        <div style={{ marginBottom: '1.5rem', position: 'relative' }}>
          <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--color-text-muted)', marginBottom: '0.35rem', fontWeight: 600, textTransform: 'uppercase' }}>Selected City</label>
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <MapPin size={16} style={{ color: 'var(--accent-safe)', position: 'absolute', left: '12px' }} />
            <select 
              value={selectedCity} 
              onChange={(e) => setSelectedCity(e.target.value)}
              className="glass-input" 
              style={{ paddingLeft: '2.2rem', appearance: 'none', cursor: 'pointer' }}
            >
              {cities.map(c => (
                <option key={c.name} value={c.name} style={{ background: 'var(--bg-secondary)', color: '#fff' }}>
                  {c.name} ({c.country})
                </option>
              ))}
            </select>
            <ChevronDown size={16} style={{ color: 'var(--color-text-muted)', position: 'absolute', right: '12px', pointerEvents: 'none' }} />
          </div>
        </div>

        {/* Navigation Menu */}
        <ul className="nav-menu">
          <li 
            className={`nav-item ${activeTab === 'dashboard' ? 'active' : ''}`}
            onClick={() => { setActiveTab('dashboard'); setIsSidebarActive(false); }}
          >
            <LayoutDashboard size={18} />
            <span>Dashboard</span>
          </li>
          <li 
            className={`nav-item ${activeTab === 'map' ? 'active' : ''}`}
            onClick={() => { setActiveTab('map'); setIsSidebarActive(false); }}
          >
            <MapPin size={18} />
            <span>Live Map</span>
          </li>

          <li 
            className={`nav-item ${activeTab === 'assistant' ? 'active' : ''}`}
            onClick={() => { setActiveTab('assistant'); setIsSidebarActive(false); }}
          >
            <MessageSquare size={18} />
            <span>AI Assistant</span>
          </li>
          <li 
            className={`nav-item ${activeTab === 'predictor' ? 'active' : ''}`}
            onClick={() => { setActiveTab('predictor'); setIsSidebarActive(false); }}
          >
            <Brain size={18} />
            <span>AI Predictor</span>
          </li>
          <li 
            className={`nav-item ${activeTab === 'iot' ? 'active' : ''}`}
            onClick={() => { setActiveTab('iot'); setIsSidebarActive(false); }}
          >
            <Radio size={18} />
            <span>IoT Simulator</span>
          </li>
          <li 
            className={`nav-item ${activeTab === 'planner' ? 'active' : ''}`}
            onClick={() => { setActiveTab('planner'); setIsSidebarActive(false); }}
          >
            <CalendarDays size={18} />
            <span>Weekly Planner</span>
          </li>
          <li 
            className={`nav-item ${activeTab === 'eco' ? 'active' : ''}`}
            onClick={() => { setActiveTab('eco'); setIsSidebarActive(false); }}
          >
            <Award size={18} />
            <span>Eco Actions</span>
          </li>
        </ul>

        {/* User profile widget */}
        <div className="user-profile-widget">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
            <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', justifySelf: 'center', justifyContent: 'center' }}>
              <User size={18} style={{ color: 'var(--accent-info)' }} />
            </div>
            <div>
              <p style={{ fontSize: '0.85rem', fontWeight: 600 }}>{userProfile.name}</p>
              <p style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                {userProfile.asthma ? 'Asthma Profile' : 'Standard Profile'}
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.75rem', background: 'rgba(255,255,255,0.03)', padding: '0.5rem 0.75rem', borderRadius: '8px', border: '1px solid var(--border-light)' }}>
            <span style={{ color: 'var(--color-text-secondary)' }}>Eco Points:</span>
            <span style={{ color: 'var(--accent-safe)', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
              <Award size={14} /> {ecoPoints}
            </span>
          </div>

          <button 
            onClick={() => setShowProfileModal(true)}
            className="glass-btn" 
            style={{ width: '100%', padding: '0.5rem', marginTop: '0.75rem', fontSize: '0.8rem' }}
          >
            Edit Profile
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="main-content">
        {/* Header */}
        <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
          <div>
            <h1 style={{ fontSize: '1.75rem', fontWeight: 800 }}>🌱 EcoGuard</h1>
            <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.85rem' }}>
              Real-time ecological intelligence & environmental monitoring
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', position: 'relative' }}>
            {/* Notification Bell */}
            <div 
              onClick={handleBellClick}
              style={{ position: 'relative', width: '40px', height: '40px', borderRadius: '12px', border: '1px solid var(--border-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', background: 'var(--bg-glass)', transition: 'var(--transition-smooth)' }}
            >
              <Bell size={18} />
              {unreadAlertsCount > 0 && (
                <span style={{ position: 'absolute', top: '-4px', right: '-4px', width: '18px', height: '18px', borderRadius: '50%', background: 'var(--accent-danger)', color: '#fff', fontSize: '0.65rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 5px var(--accent-danger-glow)' }}>
                  {unreadAlertsCount}
                </span>
              )}
            </div>

            {/* IoT Alerts dropdown list */}
            {showAlertDropdown && (
              <div className="glass-panel" style={{ position: 'absolute', top: '50px', right: '0', width: '320px', zIndex: 101, maxHeight: '400px', overflowY: 'auto', padding: '1rem' }}>
                <h4 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', borderBottom: '1px solid var(--border-light)', paddingBottom: '0.5rem', marginBottom: '0.75rem', fontSize: '0.95rem' }}>
                  <ShieldAlert size={16} style={{ color: 'var(--accent-danger)' }} />
                  Telemetry Alerts
                </h4>
                {iotAlerts.length === 0 ? (
                  <p style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', textAlign: 'center', padding: '1rem 0' }}>No active telemetry alerts.</p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {iotAlerts.map((alert, idx) => (
                      <div 
                        key={idx} 
                        style={{ 
                          padding: '0.65rem', 
                          borderRadius: '8px', 
                          background: alert.severity === 'critical' ? 'rgba(239, 68, 68, 0.08)' : 'rgba(245, 158, 11, 0.08)',
                          borderLeft: `3px solid ${alert.severity === 'critical' ? 'var(--accent-danger)' : 'var(--accent-warning)'}`,
                          fontSize: '0.75rem'
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--color-text-muted)', marginBottom: '0.15rem' }}>
                          <span>Device: {alert.device_id} ({alert.type})</span>
                          <span>{alert.timestamp}</span>
                        </div>
                        <p style={{ color: '#fff', fontWeight: 500 }}>{alert.message}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Current Condition Quick Badge */}
            {envData && (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', display: 'none' /* Hidden on mobile */ }}>
                <span className={`badge ${envData.aqi <= 50 ? 'badge-safe' : envData.aqi <= 100 ? 'badge-warning' : 'badge-danger'}`}>
                  AQI: {envData.aqi}
                </span>
              </div>
            )}
          </div>
        </header>

        {/* Tab content mount */}
        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '50vh', gap: '1rem' }}>
            <div style={{ width: '40px', height: '40px', border: '3px solid rgba(255,255,255,0.05)', borderTopColor: 'var(--accent-safe)', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
            <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.9rem' }}>Analyzing environmental telemetry...</p>
            <style>{`
              @keyframes spin {
                to { transform: rotate(360deg); }
              }
            `}</style>
          </div>
        ) : (
          <div className="fade-in">
            {activeTab === 'dashboard' && (
              <DashboardTab envData={envData} analysisData={analysisData} />
            )}
            {activeTab === 'map' && (
              <MapTab 
                selectedCity={selectedCity} 
                setSelectedCity={setSelectedCity} 
                envData={envData} 
                analysisData={analysisData} 
                userProfile={userProfile}
                cities={cities}
                setCities={setCities}
              />
            )}

            {activeTab === 'assistant' && (
              <AssistantTab selectedCity={selectedCity} userProfile={userProfile} />
            )}
            {activeTab === 'predictor' && (
              <PredictorTab />
            )}
            {activeTab === 'iot' && (
              <IotTab />
            )}
            {activeTab === 'planner' && (
              <PlannerTab weeklyPlan={analysisData?.weeklyPlan} city={selectedCity} />
            )}
            {activeTab === 'eco' && (
              <EcoTab ecoPoints={ecoPoints} setEcoPoints={setEcoPoints} />
            )}
          </div>
        )}
      </main>

      {/* Edit Profile Modal */}
      {showProfileModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div className="glass-panel" style={{ width: '380px', padding: '2rem' }}>
            <h3 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <User style={{ color: 'var(--accent-info)' }} /> Update User Profile
            </h3>
            
            <div style={{ marginBottom: '1.25rem' }}>
              <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--color-text-secondary)', marginBottom: '0.35rem' }}>Your Name</label>
              <input 
                type="text" 
                value={userProfile.name}
                onChange={(e) => setUserProfile({ ...userProfile, name: e.target.value })}
                className="glass-input" 
              />
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
              <input 
                type="checkbox" 
                id="asthma-check"
                checked={userProfile.asthma}
                onChange={(e) => setUserProfile({ ...userProfile, asthma: e.target.checked })}
                style={{ width: '18px', height: '18px', accentColor: 'var(--accent-safe)', cursor: 'pointer' }}
              />
              <label htmlFor="asthma-check" style={{ fontSize: '0.9rem', cursor: 'pointer' }}>
                I have asthma / sensitive respiratory conditions
              </label>
            </div>

            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
              <button 
                onClick={() => setShowProfileModal(false)}
                className="glass-btn glass-btn-primary"
                style={{ flex: 1 }}
              >
                Save Profile
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
