import React, { useState } from 'react';
import { Award, CheckSquare, Square, Check, Lock, Unlock, AlertCircle } from 'lucide-react';

function EcoTab({ ecoPoints, setEcoPoints }) {
  // Checklist items
  const [tasks, setTasks] = useState([
    { id: 1, text: 'Carried a reusable bottle or mug instead of purchasing plastic cups', pts: 15, checked: false },
    { id: 2, text: 'Avoided buying single-use plastics (bags, straws, utensils) all day', pts: 20, checked: false },
    { id: 3, text: 'Walked, bicycled, or utilized public transportation instead of driving a single-occupancy vehicle', pts: 30, checked: false },
    { id: 4, text: 'Switched off vampire electronics at the socket when not in active use', pts: 10, checked: false },
    { id: 5, text: 'Composted organic kitchen vegetable waste to reduce landfill waste', pts: 25, checked: false },
    { id: 6, text: 'Planted a domestic herb, seedling, or tree sapling', pts: 50, checked: false }
  ]);

  const [notif, setNotif] = useState(null);

  const toggleTask = (id) => {
    const task = tasks.find(t => t.id === id);
    if (!task) return;
    
    const nextState = !task.checked;
    const pointDiff = nextState ? task.pts : -task.pts;
    
    setTasks(prevTasks => prevTasks.map(t => t.id === id ? { ...t, checked: nextState } : t));
    setEcoPoints(prev => prev + pointDiff);
    
    if (nextState) {
      setNotif(`+${task.pts} Eco Points earned! Keep up the amazing work!`);
      setTimeout(() => setNotif(null), 3000);
    }
  };

  // Badge thresholds
  const badges = [
    { title: 'Bronze Sprout', points: 100, desc: 'Initiated active ecological stewardship by adopting basic habits.', icon: '🌱' },
    { title: 'Silver Balcony', points: 200, desc: 'Engaged in multiple community guidelines to limit daily municipal waste.', icon: '🌿' },
    { title: 'Gold Canopy', points: 300, desc: 'Outstanding energy conservation efforts, helping reduce greenhouse emissions.', icon: '🌳' },
    { title: 'Eco Guardian Supreme', points: 500, desc: 'Elite carbon-offset champion. Exceptional commitment to Earth safety.', icon: '🌍' }
  ];

  return (
    <div className="dashboard-grid">
      
      {/* Daily Checklist Column */}
      <div className="col-8">
        <div className="glass-panel" style={{ height: '100%', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-light)', paddingBottom: '0.75rem' }}>
            <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <CheckSquare size={18} style={{ color: 'var(--accent-safe)' }} /> Daily Carbon Reduction Checklist
            </h3>
            <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', fontWeight: 600 }}>Reset daily</span>
          </div>

          <p style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)', lineHeight: '1.4' }}>
            Choose the eco-conservation tasks you successfully completed today. Checking them off will instantly record your green actions and add points to your Eco Profile.
          </p>

          {/* Floating point banner alert */}
          {notif && (
            <div className="fade-in" style={{ padding: '0.65rem 1rem', background: 'rgba(16, 185, 129, 0.12)', border: '1px solid var(--accent-safe)', borderRadius: '10px', fontSize: '0.8rem', color: '#fff', display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 600 }}>
              <Check size={16} style={{ color: 'var(--accent-safe)', strokeWidth: 3 }} /> {notif}
            </div>
          )}

          {/* Tasks List */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {tasks.map(t => (
              <div 
                key={t.id}
                onClick={() => toggleTask(t.id)}
                style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '1rem', 
                  padding: '1rem',
                  borderRadius: '12px',
                  background: t.checked ? 'rgba(16, 185, 129, 0.04)' : 'rgba(255,255,255,0.01)',
                  border: '1px solid',
                  borderColor: t.checked ? 'rgba(16, 185, 129, 0.2)' : 'var(--border-light)',
                  cursor: 'pointer',
                  transition: 'var(--transition-smooth)'
                }}
              >
                {t.checked ? (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '22px', height: '22px', borderRadius: '6px', background: 'var(--accent-safe)', color: '#fff' }}>
                    <Check size={14} style={{ strokeWidth: 3 }} />
                  </div>
                ) : (
                  <div style={{ width: '22px', height: '22px', borderRadius: '6px', border: '2px solid var(--color-text-muted)' }} />
                )}
                
                <span style={{ fontSize: '0.85rem', flex: 1, color: t.checked ? '#fff' : 'var(--color-text-secondary)', textDecoration: t.checked ? 'line-through' : 'none' }}>
                  {t.text}
                </span>

                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: t.checked ? 'var(--accent-safe)' : 'var(--accent-info)', padding: '0.25rem 0.5rem', borderRadius: '6px', background: t.checked ? 'rgba(16,185,129,0.1)' : 'rgba(14,165,233,0.08)' }}>
                  +{t.pts} pts
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Badges Column */}
      <div className="col-4">
        <div className="glass-panel" style={{ height: '100%', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', borderBottom: '1px solid var(--border-light)', paddingBottom: '0.75rem' }}>
            <Award size={18} style={{ color: 'var(--accent-warning)' }} /> Environmental Achievements
          </h3>

          <div style={{ textAlign: 'center', padding: '1rem 0', background: 'rgba(255,255,255,0.02)', borderRadius: '16px', border: '1px solid var(--border-light)' }}>
            <span style={{ fontSize: '0.7rem', color: 'var(--color-text-secondary)', textTransform: 'uppercase', fontWeight: 600 }}>Total Earned Score</span>
            <h2 style={{ fontSize: '2.5rem', fontWeight: 800, color: 'var(--accent-warning)', fontFamily: 'var(--font-display)', marginTop: '0.25rem' }}>{ecoPoints}</h2>
            <p style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '0.25rem' }}>Accumulate points to unlock higher ranks</p>
          </div>

          {/* Badges List */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {badges.map((b, idx) => {
              const unlocked = ecoPoints >= b.points;
              
              return (
                <div 
                  key={idx}
                  style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '1rem',
                    padding: '0.75rem',
                    borderRadius: '12px',
                    background: unlocked ? 'rgba(245, 158, 11, 0.04)' : 'rgba(255,255,255,0.01)',
                    border: '1px solid',
                    borderColor: unlocked ? 'rgba(245, 158, 11, 0.2)' : 'var(--border-light)',
                    opacity: unlocked ? 1 : 0.6
                  }}
                >
                  {/* Badge Icon */}
                  <div style={{ fontSize: '1.75rem', width: '45px', height: '45px', borderRadius: '10px', background: unlocked ? 'rgba(245, 158, 11, 0.1)' : 'rgba(255,255,255,0.03)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: unlocked ? '1px solid rgba(245, 158, 11, 0.2)' : 'none' }}>
                    {b.icon}
                  </div>

                  {/* Details */}
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <h4 style={{ fontSize: '0.85rem', fontWeight: 700, color: unlocked ? '#fff' : 'var(--color-text-secondary)' }}>{b.title}</h4>
                      <span style={{ fontSize: '0.65rem', color: unlocked ? 'var(--accent-warning)' : 'var(--color-text-muted)', fontWeight: 600 }}>
                        {b.points} pts
                      </span>
                    </div>
                    <p style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', lineHeight: '1.3', marginTop: '0.15rem' }}>{b.desc}</p>
                  </div>

                  {/* Lock/Unlock Icon */}
                  <div style={{ color: unlocked ? 'var(--accent-warning)' : 'var(--color-text-muted)' }}>
                    {unlocked ? <Unlock size={14} /> : <Lock size={14} />}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

    </div>
  );
}

export default EcoTab;
