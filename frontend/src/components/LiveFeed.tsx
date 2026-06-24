import { useState } from 'react';
import { Volume2, VolumeX, ShieldAlert, Zap, Clock, Info } from 'lucide-react';
import { t, translateCity, translateThreat } from '../i18n';
import type { Language } from '../i18n';

interface Coords {
  lat: number;
  lng: number;
  label: string;
  labelEn: string;
}

interface ActiveAlert {
  id: string;
  timestamp: number;
  category: number;
  title: string;
  locations: string[];
  locationsEn: string[];
  coords: Coords[];
  countdown: number;
  isDrill: boolean;
}

interface LiveFeedProps {
  alerts: ActiveAlert[];
  soundEnabled: boolean;
  setSoundEnabled: (enabled: boolean) => void;
  lang: Language;
  cities: any[];
}

// Programmatic red-alert siren synthesizer using native Web Audio API oscillators
export function playSyntheticSiren() {
  try {
    const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const osc = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();
    
    osc.type = 'sawtooth';
    
    const now = audioCtx.currentTime;
    osc.frequency.setValueAtTime(440, now);
    osc.frequency.linearRampToValueAtTime(850, now + 1.2);
    osc.frequency.linearRampToValueAtTime(440, now + 2.4);
    osc.frequency.linearRampToValueAtTime(850, now + 3.6);
    osc.frequency.linearRampToValueAtTime(440, now + 4.8);
    
    gainNode.gain.setValueAtTime(0.25, now);
    gainNode.gain.exponentialRampToValueAtTime(0.01, now + 5.0);
    
    osc.connect(gainNode);
    gainNode.connect(audioCtx.destination);
    
    osc.start(now);
    osc.stop(now + 5.0);
  } catch (err) {
    console.error('Failed to play synthesized alert audio.', err);
  }
}

export default function LiveFeed({ alerts, soundEnabled, setSoundEnabled, lang, cities }: LiveFeedProps) {
  const [sirenPlaying, setSirenPlaying] = useState(false);

  const handleTestSiren = () => {
    setSirenPlaying(true);
    playSyntheticSiren();
    setTimeout(() => {
      setSirenPlaying(false);
    }, 5000);
  };

  return (
    <div className="glass-panel" style={{ padding: '20px', display: 'flex', flexDirection: 'column', height: '100%', minHeight: '350px' }}>
      
      {/* Header controls */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', borderBottom: '1px solid var(--border-glass)', paddingBottom: '12px' }}>
        <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '1.1rem' }}>
          <ShieldAlert size={18} className="live-beacon red" style={{ margin: 0 }} />
          {t('liveFeedTitle', lang)}
        </h3>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button 
            onClick={() => setSoundEnabled(!soundEnabled)} 
            style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '6px', 
              padding: '6px 10px',
              fontSize: '0.8rem',
              borderColor: soundEnabled ? 'var(--accent-red)' : 'var(--border-glass)'
            }}
            title={soundEnabled ? 'Mute' : 'Unmute'}
          >
            {soundEnabled ? <Volume2 size={14} style={{ color: 'var(--accent-red)' }} /> : <VolumeX size={14} />}
            {soundEnabled ? t('sirenOn', lang) : t('muted', lang)}
          </button>
          
          <button 
            onClick={handleTestSiren} 
            disabled={sirenPlaying}
            style={{ padding: '6px 10px', fontSize: '0.8rem' }}
          >
            {sirenPlaying ? t('playingTest', lang) : t('testSiren', lang)}
          </button>
        </div>
      </div>

      {/* Scrolling Alerts Box */}
      <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '420px' }}>
        {alerts.length === 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', minHeight: '200px', color: 'var(--text-muted)', gap: '10px' }}>
            <Zap size={24} style={{ opacity: 0.5 }} />
            <span style={{ fontSize: '0.9rem' }}>{t('noActiveAlarms', lang)}</span>
            <span style={{ fontSize: '0.75rem', opacity: 0.7 }}>{t('awaitingEvents', lang)}</span>
          </div>
        ) : (
          alerts.map((alert) => {
            const isDrone = alert.category === 2 || alert.category === 102;
            const alertClass = isDrone ? 'aircraft-alert' : alert.isDrill ? 'drill-alert' : 'red-alert';
            const alertTime = new Date(alert.timestamp).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
            
            const threatInfo = translateThreat(alert.category, lang);
            const resolvedCities = alert.locations.map(loc => translateCity(loc, lang, cities)).join(', ');

            return (
              <div 
                key={alert.id} 
                className={`alert-item-card ${alertClass}`}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span 
                    style={{ 
                      fontWeight: 'bold', 
                      color: isDrone ? 'var(--accent-orange)' : 'var(--accent-red)',
                      fontSize: '0.95rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px'
                    }}
                  >
                    {threatInfo.title}
                  </span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    <Clock size={12} />
                    {alertTime}
                  </span>
                </div>

                <div 
                  className={lang === 'he' ? 'hebrew' : ''} 
                  style={{ 
                    fontSize: '1.2rem', 
                    fontWeight: 'bold', 
                    margin: '4px 0',
                    textAlign: (lang === 'he' || lang === 'ar') ? 'right' : 'left'
                  }}
                >
                  {resolvedCities}
                </div>

                <div 
                  style={{ 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'center', 
                    marginTop: '8px', 
                    fontSize: '0.8rem',
                    background: 'rgba(255, 234, 0, 0.05)',
                    padding: '6px 10px',
                    borderRadius: '6px'
                  }}
                >
                  <span style={{ color: '#ffea00', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: '500' }}>
                    <Info size={12} />
                    {t('shelterTime', lang)}: {alert.countdown}s
                  </span>
                  <span style={{ color: 'var(--text-muted)' }}>
                    {alert.isDrill ? t('testDrill', lang) : t('immediateThreat', lang)}
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>

    </div>
  );
}
