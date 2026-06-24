import { useEffect, useState } from 'react';
import { ShieldAlert, Map, History, BarChart2, Bell, Sun, Moon } from 'lucide-react';
import AlertMap from './components/AlertMap';
import AlertHistory from './components/AlertHistory';
import AlertStats from './components/AlertStats';
import LiveFeed, { playSyntheticSiren } from './components/LiveFeed';
import StatusCard from './components/StatusCard';
import { t, translateCity } from './i18n';
import type { Language } from './i18n';

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

export default function App() {
  const [activeAlerts, setActiveAlerts] = useState<ActiveAlert[]>([]);
  const [sessionAlerts, setSessionAlerts] = useState<ActiveAlert[]>([]);
  
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [isConnected, setIsConnected] = useState(false);
  const [activeTab, setActiveTab] = useState<'map' | 'history' | 'stats'>('map');

  // Multi-Language State
  const [lang, setLang] = useState<Language>('en');
  const [cities, setCities] = useState<any[]>([]);

  // Theme State
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    return (localStorage.getItem('theme') as 'light' | 'dark') || 'dark';
  });

  // Sync theme to root element
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  // Request HTML5 notification permission on load
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  // Update HTML layout direction for RTL support (Hebrew & Arabic)
  useEffect(() => {
    document.documentElement.dir = (lang === 'he' || lang === 'ar') ? 'rtl' : 'ltr';
    document.documentElement.lang = lang;
  }, [lang]);

  // Load cities registry once at root level to share across all screens
  useEffect(() => {
    fetch('/api/cities')
      .then(res => res.json())
      .then(data => {
        setCities(data);
        console.log(`Cities catalog pre-loaded: ${data.length} records.`);
      })
      .catch(err => {
        console.error('Failed to pre-fetch cities register.', err);
      });
  }, []);

  // Establish SSE stream subscription
  useEffect(() => {
    let sse: EventSource | null = null;
    let reconnectTimeout: any = null;

    function connect() {
      // Proxied automatically in dev by Vite, relative in prod
      sse = new EventSource('/api/alerts/live');

      sse.onopen = () => {
        console.log('SSE Alert stream connection established.');
        setIsConnected(true);
      };

      sse.onerror = (err) => {
        console.error('SSE connection failed. Reconnecting in 5s...', err);
        setIsConnected(false);
        sse?.close();
        reconnectTimeout = setTimeout(connect, 5000);
      };

      sse.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data);
          
          if (payload.type === 'connected') {
            console.log('Handshake verified.');
          } else if (payload.type === 'alert') {
            const alert: ActiveAlert = payload.data;
            console.log('New alert received:', alert);

            // 1. Audio siren synthesis
            if (soundEnabled) {
              playSyntheticSiren();
            }

            // 2. HTML5 desktop push notifications
            if ('Notification' in window && Notification.permission === 'granted') {
              // Resolve notification text in chosen language
              const localizedTitle = lang === 'he' ? alert.title : (lang === 'ar' ? 'إنذار طوارئ' : 'Emergency Alert');
              const resolvedCities = alert.locations.map(loc => translateCity(loc, lang, cities)).join(', ');
              
              new Notification(`🚨 ${localizedTitle}`, {
                body: `${resolvedCities}\nCountdown: ${alert.countdown}s`,
                requireInteraction: true
              });
            }

            // 3. Add to state
            setActiveAlerts(prev => {
              if (prev.some(a => a.id === alert.id)) return prev;
              return [...prev, alert];
            });

            setSessionAlerts(prev => {
              if (prev.some(a => a.id === alert.id)) return prev;
              return [alert, ...prev];
            });

            // 4. Auto-clear active alert indicator on map after 10 minutes
            setTimeout(() => {
              setActiveAlerts(prev => prev.filter(a => a.id !== alert.id));
            }, 10 * 60 * 1000);
          }
        } catch (err) {
          console.error('Failed to parse incoming SSE message.', err);
        }
      };
    }

    connect();

    return () => {
      sse?.close();
      if (reconnectTimeout) clearTimeout(reconnectTimeout);
    };
  }, [soundEnabled, lang, cities]);

  return (
    <div className="app-container">
      
      {/* HEADER SECTION */}
      <header className="app-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ padding: '8px', background: 'rgba(255,51,75,0.1)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <ShieldAlert size={24} style={{ color: 'var(--accent-red)' }} />
          </div>
          <div>
            <h1 style={{ fontSize: '1.25rem', fontWeight: 800, letterSpacing: '0.5px' }}>
              {t('appTitle', lang)} <span style={{ color: 'var(--accent-red)', fontWeight: 'bold' }}>{t('appLive', lang)}</span>
            </h1>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{t('appSubtitle', lang)}</p>
          </div>
        </div>

        {/* Tab switcher navigation bar */}
        <div style={{ display: 'flex', gap: '8px' }}>
          <button 
            onClick={() => setActiveTab('map')} 
            className={activeTab === 'map' ? 'primary' : ''}
            style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem' }}
          >
            <Map size={16} />
            {t('tabRadar', lang)}
          </button>
          
          <button 
            onClick={() => setActiveTab('history')} 
            className={activeTab === 'history' ? 'primary' : ''}
            style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem' }}
          >
            <History size={16} />
            {t('tabLogs', lang)}
          </button>

          <button 
            onClick={() => setActiveTab('stats')} 
            className={activeTab === 'stats' ? 'primary' : ''}
            style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem' }}
          >
            <BarChart2 size={16} />
            {t('tabStats', lang)}
          </button>
        </div>

        {/* Settings, Language, & Notifications */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {/* Theme Toggle Button */}
          <button
            onClick={() => setTheme(prev => prev === 'light' ? 'dark' : 'light')}
            style={{
              padding: '6px 10px',
              fontSize: '0.8rem',
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid var(--border-glass)',
              borderRadius: '6px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontWeight: 600
            }}
            title={theme === 'light' ? 'Switch to Dark Mode' : 'Switch to Light Mode'}
          >
            {theme === 'light' ? <Moon size={14} /> : <Sun size={14} />}
            {theme === 'light' ? t('themeDark', lang) : t('themeLight', lang)}
          </button>

          {/* Language Selector Dropdown */}
          <select 
            value={lang} 
            onChange={(e) => setLang(e.target.value as Language)}
            style={{ 
              padding: '6px 10px', 
              fontSize: '0.8rem', 
              background: 'rgba(255,255,255,0.05)', 
              border: '1px solid var(--border-glass)', 
              borderRadius: '6px', 
              cursor: 'pointer',
              fontWeight: 600
            }}
          >
            <option value="en">English</option>
            <option value="he">עברית</option>
            <option value="ar">العربية</option>
          </select>

          {/* Browser Notification Switcher */}
          <span 
            onClick={() => {
              if (Notification.permission === 'default') {
                Notification.requestPermission();
              }
            }}
            style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '6px', 
              fontSize: '0.8rem', 
              color: 'var(--text-secondary)',
              cursor: 'pointer'
            }}
          >
            <Bell size={14} style={{ color: Notification.permission === 'granted' ? 'var(--accent-green)' : 'var(--text-muted)' }} />
            {Notification.permission === 'granted' ? t('notificationsEnabled', lang) : t('enableNotifications', lang)}
          </span>
        </div>
      </header>

      {/* SIDEBAR PANEL */}
      <aside className="app-sidebar">
        <StatusCard isConnected={isConnected} lang={lang} />
        
        <LiveFeed 
          alerts={sessionAlerts} 
          soundEnabled={soundEnabled} 
          setSoundEnabled={setSoundEnabled} 
          lang={lang}
          cities={cities}
        />
      </aside>

      {/* MAIN CONTENT VIEW WINDOW */}
      <main className="app-main">
        {activeTab === 'map' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div className="glass-panel" style={{ padding: '8px', overflow: 'hidden' }}>
              <AlertMap activeAlerts={activeAlerts} lang={lang} cities={cities} theme={theme} />
            </div>
            
            {activeAlerts.length > 0 && (
              <div 
                className="glass-panel" 
                style={{ 
                  padding: '16px', 
                  borderLeft: '4px solid var(--accent-red)', 
                  background: 'rgba(255,51,75,0.03)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}
              >
                <div>
                  <h3 style={{ color: 'var(--accent-red)', fontSize: '1.1rem', marginBottom: '4px' }}>⚠️ {t('activeSirensDetected', lang)}</h3>
                  <p style={{ fontSize: '0.9rem' }}>
                    {t('alarmsCurrentlyActive', lang)}: <strong>{activeAlerts.map(a => a.locations.map(loc => translateCity(loc, lang, cities)).join(', ')).join(' | ')}</strong>
                  </p>
                </div>
                <div style={{ display: 'flex', gap: '10px' }} className="wave-container">
                  <div className="wave-bar"></div>
                  <div className="wave-bar"></div>
                  <div className="wave-bar"></div>
                  <div className="wave-bar"></div>
                  <div className="wave-bar"></div>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'history' && <AlertHistory lang={lang} cities={cities} />}

        {activeTab === 'stats' && <AlertStats lang={lang} cities={cities} />}
      </main>

    </div>
  );
}
