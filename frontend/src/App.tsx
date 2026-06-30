import { useEffect, useState, useRef } from 'react';
import { ShieldAlert, Map, History, BarChart2, Bell, Sun, Moon, Globe, Settings, Volume2 } from 'lucide-react';
import AlertMap from './components/AlertMap';
import AlertHistory from './components/AlertHistory';
import AlertStats from './components/AlertStats';
import AlertHeatmap from './components/AlertHeatmap';
import LiveFeed from './components/LiveFeed';
import StatusCard from './components/StatusCard';
import { playIsraeliSiren, playBeepSound } from './utils/sound';
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

function FlagIcon({ country }: { country: "us" | "il" | "sa" }) {
  if (country === "il") {
    return (
      <svg width="15" stroke="#d4d4d8" strokeWidth="0.5" height="10" viewBox="0 0 220 160" style={{ display: 'inline-block', verticalAlign: 'middle', marginRight: '6px', borderRadius: '1.5px', boxShadow: '0 1px 2px rgba(0,0,0,0.2)' }}>
        <rect width="220" height="160" fill="white"/>
        <rect y="15" width="220" height="25" fill="#0038a8"/>
        <rect y="120" width="220" height="25" fill="#0038a8"/>
        <text x="110" y="92" fontSize="42" fill="#0038a8" fontWeight="bold" textAnchor="middle" fontFamily="sans-serif">✡</text>
      </svg>
    );
  }
  if (country === "sa") {
    return (
      <svg width="15" stroke="#d4d4d8" strokeWidth="0.5" height="10" viewBox="0 0 30 20" style={{ display: 'inline-block', verticalAlign: 'middle', marginRight: '6px', borderRadius: '1.5px', boxShadow: '0 1px 2px rgba(0,0,0,0.2)' }}>
        <rect width="30" height="20" fill="#006c35"/>
        <path d="M6 14h18M18 12l2 2-2 2" stroke="white" strokeWidth="1" fill="none"/>
        <text x="15" y="10" fontSize="8" fill="white" textAnchor="middle" fontFamily="sans-serif">⚔</text>
      </svg>
    );
  }
  return (
    <svg width="15" stroke="#d4d4d8" strokeWidth="0.5" height="10" viewBox="0 0 74 50" style={{ display: 'inline-block', verticalAlign: 'middle', marginRight: '6px', borderRadius: '1.5px', boxShadow: '0 1px 2px rgba(0,0,0,0.2)' }}>
      <rect width="74" height="50" fill="#b22234"/>
      <path d="M0,3.8h74M0,11.5h74M0,19.2h74M0,26.9h74M0,34.6h74M0,42.3h74" stroke="white" strokeWidth="3.8"/>
      <rect width="32" height="27" fill="#3c3b6e"/>
      <g fill="white" fontSize="5" fontFamily="sans-serif" textAnchor="middle">
        <text x="6" y="9">★</text>
        <text x="14" y="9">★</text>
        <text x="22" y="9">★</text>
        <text x="10" y="16">★</text>
        <text x="18" y="16">★</text>
        <text x="26" y="16">★</text>
        <text x="6" y="23">★</text>
        <text x="14" y="23">★</text>
        <text x="22" y="23">★</text>
      </g>
    </svg>
  );
}

export default function App() {
  // Multi-Language State (declared early to be accessible by downstream filter methods)
  const [lang, setLang] = useState<Language>(() => {
    const path = window.location.pathname;
    const pathLang = path.split('/')[1];
    if (pathLang === 'he' || pathLang === 'en' || pathLang === 'ar') {
      return pathLang as Language;
    }
    const saved = localStorage.getItem('language');
    if (saved === 'he' || saved === 'en' || saved === 'ar') {
      return saved as Language;
    }
    return 'he';
  });
  const [cities, setCities] = useState<any[]>([]);

  // Sync language selection to URL path segment and localStorage
  useEffect(() => {
    localStorage.setItem('language', lang);
    const expectedPath = '/' + lang;
    if (window.location.pathname !== expectedPath) {
      window.history.pushState(null, '', expectedPath);
    }
  }, [lang]);

  // Handle back/forward navigation popstate events
  useEffect(() => {
    const handlePopState = () => {
      const path = window.location.pathname;
      const pathLang = path.split('/')[1];
      if (pathLang === 'he' || pathLang === 'en' || pathLang === 'ar') {
        setLang(pathLang as Language);
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const [activeAlerts, setActiveAlerts] = useState<ActiveAlert[]>([]);
  const [sessionAlerts, setSessionAlerts] = useState<ActiveAlert[]>([]);
  
  // Warnings and Audio configurations
  const [soundMode, setSoundMode] = useState<'none' | 'all' | 'custom'>(() => {
    return (localStorage.getItem('soundMode') as 'none' | 'all' | 'custom') || 'none';
  });
  const [volume, setVolume] = useState<number>(() => {
    const val = localStorage.getItem('sirenVolume');
    return val !== null ? parseFloat(val) : 0.8;
  });
  const [ttsEnabled, setTtsEnabled] = useState<boolean>(() => {
    return localStorage.getItem('ttsEnabled') === 'true';
  });
  const [subscribedZones, setSubscribedZones] = useState<any[]>(() => {
    try {
      const val = localStorage.getItem('subscribedZones');
      return val ? JSON.parse(val) : [];
    } catch {
      return [];
    }
  });

  // Sync settings state to localStorage
  useEffect(() => {
    localStorage.setItem('soundMode', soundMode);
    if (soundMode !== 'none') {
      localStorage.setItem('lastActiveSoundMode', soundMode);
    }
  }, [soundMode]);
  useEffect(() => {
    localStorage.setItem('sirenVolume', volume.toString());
  }, [volume]);
  useEffect(() => {
    localStorage.setItem('ttsEnabled', ttsEnabled.toString());
  }, [ttsEnabled]);
  useEffect(() => {
    localStorage.setItem('subscribedZones', JSON.stringify(subscribedZones));
  }, [subscribedZones]);

  const [soundType, setSoundType] = useState<'siren' | 'beep' | 'mute'>(() => {
    return (localStorage.getItem('soundType') as 'siren' | 'beep' | 'mute') || 'siren';
  });
  useEffect(() => {
    localStorage.setItem('soundType', soundType);
  }, [soundType]);

  const [isConnected, setIsConnected] = useState(false);
  const [activeTab, setActiveTab] = useState<'feed' | 'map' | 'history' | 'stats' | 'heatmap'>(() => {
    return window.innerWidth <= 1024 ? 'feed' : 'map';
  });
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(() => window.innerWidth <= 1024);

  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth <= 1024;
      setIsMobile(mobile);
      if (!mobile && activeTab === 'feed') {
        setActiveTab('map');
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [activeTab]);

  // Modal specific search & test siren state variables
  const [searchTerm, setSearchTerm] = useState('');
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [sirenPlaying, setSirenPlaying] = useState(false);

  // Extract unique HFC zones
  const uniqueZones = Array.from(new Set(cities.map(c => c.zone).filter(Boolean))).map(zoneHeb => {
    const match = cities.find(c => c.zone === zoneHeb);
    return {
      type: 'zone',
      id: `zone-${zoneHeb}`,
      name: zoneHeb,
      name_en: match?.zone_en || zoneHeb,
      value: zoneHeb
    };
  });

  const cityItems = cities.map(c => ({
    type: 'city',
    id: `city-${c.id}`,
    name: c.name,
    name_en: c.name_en,
    value: c.name
  }));

  const allItems = [...uniqueZones, ...cityItems];

  const filteredItems = searchTerm.trim() === ''
    ? allItems.slice(0, 100)
    : allItems.filter(item => {
        const query = searchTerm.toLowerCase();
        return (
          item.name.toLowerCase().includes(query) ||
          item.name_en.toLowerCase().includes(query)
        );
      });

  const handleSelectItem = (item: any) => {
    if (!subscribedZones.some(z => z.id === item.id)) {
      setSubscribedZones([...subscribedZones, item]);
    }
    setSearchTerm('');
    setDropdownOpen(false);
  };

  const handleRemoveItem = (id: string) => {
    setSubscribedZones(subscribedZones.filter(z => z.id !== id));
  };

  const handleTestSiren = () => {
    if (sirenPlaying) return;
    setSirenPlaying(true);
    const onEnded = () => setSirenPlaying(false);
    
    if (soundType === 'siren') {
      playIsraeliSiren(volume, onEnded);
    } else if (soundType === 'beep') {
      playBeepSound(volume, 3.0, onEnded);
    } else {
      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification('🚨 Test Alert Notification', {
          body: 'Visual popups are active.',
        });
      }
      setSirenPlaying(false);
    }
  };

  // Multi-Language State (declared at top of component)

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

  // References for SSE loop to prevent stream reconnection on settings changes
  const soundModeRef = useRef(soundMode);
  const volumeRef = useRef(volume);
  const ttsEnabledRef = useRef(ttsEnabled);
  const subscribedZonesRef = useRef(subscribedZones);
  const soundTypeRef = useRef(soundType);
  const langRef = useRef(lang);
  const citiesRef = useRef(cities);

  useEffect(() => { soundModeRef.current = soundMode; }, [soundMode]);
  useEffect(() => { volumeRef.current = volume; }, [volume]);
  useEffect(() => { ttsEnabledRef.current = ttsEnabled; }, [ttsEnabled]);
  useEffect(() => { subscribedZonesRef.current = subscribedZones; }, [subscribedZones]);
  useEffect(() => { soundTypeRef.current = soundType; }, [soundType]);
  useEffect(() => { langRef.current = lang; }, [lang]);
  useEffect(() => { citiesRef.current = cities; }, [cities]);

  // TTS announcer engine
  const playTTSAlert = (locations: string[]) => {
    if (!('speechSynthesis' in window)) return;
    
    // Stop any ongoing announcement
    window.speechSynthesis.cancel();
    
    const currentLang = langRef.current;
    const currentCities = citiesRef.current;
    const currentVolume = volumeRef.current;
    
    const translatedCities = locations.map(loc => translateCity(loc, currentLang, currentCities)).join(', ');
    let text = '';
    
    if (currentLang === 'he') {
      text = `צבע אדום ב: ${translatedCities}`;
    } else if (currentLang === 'ar') {
      text = `إنذار في: ${translatedCities}`;
    } else {
      text = `Red alert in: ${translatedCities}`;
    }

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = currentLang === 'he' ? 'he-IL' : currentLang === 'ar' ? 'ar-EG' : 'en-US';
    utterance.volume = currentVolume;
    window.speechSynthesis.speak(utterance);
  };

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

            // 1. Audio siren synthesis & TTS playback
            const currentSoundMode = soundModeRef.current;
            const currentSubscribed = subscribedZonesRef.current;
            const currentCities = citiesRef.current;
            
            let isTargeted = currentSoundMode === 'all';
            if (currentSoundMode === 'custom' && currentSubscribed.length > 0) {
              isTargeted = alert.locations.some(loc => {
                const cleaned = loc.split(' - ')[0].trim();
                const cityMatch = currentCities.find(c => 
                  c.name === cleaned || 
                  c.value === cleaned || 
                  loc.includes(c.name)
                );
                if (!cityMatch) return false;
                
                return currentSubscribed.some(sub => {
                  if (sub.type === 'city') {
                    return sub.value === cityMatch.name;
                  } else if (sub.type === 'zone') {
                    return sub.value === cityMatch.zone;
                  }
                  return false;
                });
              });
            }

            if (isTargeted) {
              const currentType = soundTypeRef.current;
              const currentVolume = volumeRef.current;

              if (currentType === 'siren') {
                playIsraeliSiren(currentVolume);
              } else if (currentType === 'beep') {
                playBeepSound(currentVolume);
              }
              
              if (ttsEnabledRef.current) {
                setTimeout(() => {
                  playTTSAlert(alert.locations);
                }, 800);
              }
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
  }, []);

  return (
    <div className="app-container">

      {/* HEADER SECTION */}
      <header className="app-header">
        <div className="app-header-brand">
          <div className="app-header-logo">
            <ShieldAlert style={{ color: 'var(--accent-red)' }} />
          </div>
          <div>
            <h1 className={`${lang === 'he' ? 'hebrew' : lang === 'ar' ? 'arabic' : ''} app-header-title`} style={{ letterSpacing: lang === 'en' ? '0.5px' : '0' }}>
              {t('appTitle', lang)} <span style={{ color: 'var(--accent-red)', fontWeight: 'bold' }}>{t('appLive', lang)}</span>
            </h1>
            <p className="desktop-only" style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{t('appSubtitle', lang)}</p>
          </div>
        </div>

        {/* Tab switcher navigation bar */}
        <div className="desktop-only" style={{ display: 'flex', gap: '8px' }}>
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

          <button 
            onClick={() => setActiveTab('heatmap')} 
            className={activeTab === 'heatmap' ? 'primary' : ''}
            style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem' }}
          >
            <Globe size={16} />
            {t('tabHeatmap', lang)}
          </button>
        </div>

        {/* Settings, Language, & Notifications */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {/* Settings Gear (Mobile Only) */}
          {isMobile && (
            <button
              onClick={() => setSettingsOpen(true)}
              style={{
                padding: '6px 10px',
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid var(--border-glass)',
                borderRadius: '6px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
              title={t('settingsTitle', lang)}
            >
              <Settings size={16} />
            </button>
          )}

          {/* Language Switcher */}
          <button
            onClick={() => {
              const nextL: Record<Language, Language> = { he: 'en', en: 'ar', ar: 'he' };
              setLang(nextL[lang]);
            }}
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
              fontWeight: 600,
              color: 'var(--text-primary)',
              direction: 'ltr'
            }}
          >
            <FlagIcon country={lang === 'he' ? 'us' : lang === 'en' ? 'sa' : 'il'} />
            <span>{lang === 'he' ? 'EN' : lang === 'en' ? 'AR' : 'עב'}</span>
          </button>

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
            <span className="desktop-only">
              {theme === 'light' ? t('themeDark', lang) : t('themeLight', lang)}
            </span>
          </button>



          {/* Browser Notification Switcher (Desktop only) */}
          {!isMobile && (
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
              title={Notification.permission === 'granted' ? t('notificationsEnabled', lang) : t('enableNotifications', lang)}
            >
              <Bell size={14} style={{ color: Notification.permission === 'granted' ? 'var(--accent-green)' : 'var(--text-muted)' }} />
              <span className="desktop-only">
                {Notification.permission === 'granted' ? t('notificationsEnabled', lang) : t('enableNotifications', lang)}
              </span>
            </span>
          )}
        </div>
      </header>

      {/* SIDEBAR PANEL */}
      {!isMobile && (
        <aside className="app-sidebar">
          <LiveFeed 
            alerts={sessionAlerts} 
            soundMode={soundMode}
            onOpenSettings={() => setSettingsOpen(true)}
            lang={lang}
            cities={cities}
          />
        </aside>
      )}

      {/* MAIN CONTENT VIEW WINDOW */}
      <main className="app-main">
        {activeTab === 'feed' && isMobile && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', height: '100%', flex: 1, minHeight: 0 }}>
            <LiveFeed 
              alerts={sessionAlerts} 
              soundMode={soundMode}
              onOpenSettings={() => setSettingsOpen(true)}
              lang={lang}
              cities={cities}
            />
          </div>
        )}

        {activeTab === 'map' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', height: '100%', flex: 1, minHeight: 0 }}>
            <div className="glass-panel" style={{ padding: '8px', overflow: 'hidden', flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
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
                  alignItems: 'center',
                  flexShrink: 0
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

        {activeTab === 'history' && (
          <div style={{ flex: 1, overflowY: 'auto', minHeight: 0 }}>
            <AlertHistory lang={lang} cities={cities} />
          </div>
        )}

        {activeTab === 'stats' && (
          <div style={{ flex: 1, overflowY: 'auto', minHeight: 0 }}>
            <AlertStats lang={lang} cities={cities} />
          </div>
        )}

        {activeTab === 'heatmap' && (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
            <AlertHeatmap lang={lang} cities={cities} theme={theme} />
          </div>
        )}
      </main>

      {/* BOTTOM DIAGNOSTICS BAR */}
      {!isMobile && (
        <StatusCard 
          isConnected={isConnected} 
          lang={lang} 
          cities={cities}
        />
      )}

      {/* MOBILE BOTTOM NAVIGATION BAR */}
      {isMobile && (
        <nav className="mobile-bottom-nav">
          <button 
            className={`bottom-nav-item ${activeTab === 'feed' ? 'active' : ''}`}
            onClick={() => setActiveTab('feed')}
          >
            <Bell size={20} />
            <span>{t('tabFeed', lang)}</span>
          </button>
          <button 
            className={`bottom-nav-item ${activeTab === 'map' ? 'active' : ''}`}
            onClick={() => setActiveTab('map')}
          >
            <Map size={20} />
            <span>{t('tabRadar', lang)}</span>
          </button>
          <button 
            className={`bottom-nav-item ${activeTab === 'heatmap' ? 'active' : ''}`}
            onClick={() => setActiveTab('heatmap')}
          >
            <Globe size={20} />
            <span>{t('tabHeatmap', lang)}</span>
          </button>
          <button 
            className={`bottom-nav-item ${activeTab === 'history' ? 'active' : ''}`}
            onClick={() => setActiveTab('history')}
          >
            <History size={20} />
            <span>{t('tabLogs', lang)}</span>
          </button>
          <button 
            className={`bottom-nav-item ${activeTab === 'stats' ? 'active' : ''}`}
            onClick={() => setActiveTab('stats')}
          >
            <BarChart2 size={20} />
            <span>{t('tabStats', lang)}</span>
          </button>
        </nav>
      )}

      {/* ALERTS CONFIGURATION MODAL */}
      {settingsOpen && (
        <div className="modal-backdrop" onClick={() => setSettingsOpen(false)}>
          <div className="modal-content glass-panel" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className={lang === 'he' ? 'hebrew' : lang === 'ar' ? 'arabic' : ''}>
                {t('settingsTitle', lang)}
              </h3>
              <button className="modal-close" onClick={() => setSettingsOpen(false)}>
                &times;
              </button>
            </div>
            
            <div className="modal-body">
              {/* Alert Mode Selection */}
              <div className="modal-setting-group">
                <label>{t('soundMode', lang)}</label>
                <select 
                  value={soundMode} 
                  onChange={(e) => setSoundMode(e.target.value as any)}
                  className="modal-select"
                >
                  <option value="none">{t('soundNone', lang)}</option>
                  <option value="all">{t('soundAll', lang)}</option>
                  <option value="custom">{t('soundCustom', lang)}</option>
                </select>
              </div>

              {/* Sound Style Selection */}
              <div className="modal-setting-group">
                <label>{t('soundTypeLabel', lang)}</label>
                <select 
                  value={soundType} 
                  onChange={(e) => setSoundType(e.target.value as any)}
                  className="modal-select"
                >
                  <option value="siren">{t('soundTypeSiren', lang)}</option>
                  <option value="beep">{t('soundTypeBeep', lang)}</option>
                  <option value="mute">{t('soundTypeMute', lang)}</option>
                </select>
              </div>

              {/* Custom subscriptions multiselect */}
              {soundMode === 'custom' && (
                <div className="modal-setting-group searchable-multiselect">
                  <label>{t('soundCustom', lang)}</label>
                  <input 
                    type="text" 
                    className="multiselect-search-input"
                    placeholder={t('searchPlaceholder', lang)}
                    value={searchTerm}
                    onFocus={() => setDropdownOpen(true)}
                    onBlur={() => setTimeout(() => setDropdownOpen(false), 200)}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                  
                  {dropdownOpen && (
                    <div className="multiselect-dropdown">
                      {filteredItems.length > 0 ? (
                        <>
                          {filteredItems.some(i => i.type === 'zone') && (
                            <div className="multiselect-group-header">
                              {lang === 'he' ? 'אזורי הנחיות' : lang === 'ar' ? 'المناطق' : 'Guideline Zones'}
                            </div>
                          )}
                          {filteredItems.filter(i => i.type === 'zone').slice(0, 15).map(item => (
                            <div 
                              key={item.id} 
                              className="multiselect-item"
                              onMouseDown={() => handleSelectItem(item)}
                            >
                              {lang === 'he' ? item.name : item.name_en}
                            </div>
                          ))}

                          {filteredItems.some(i => i.type === 'city') && (
                            <div className="multiselect-group-header">
                              {lang === 'he' ? 'יישובים / ערים' : lang === 'ar' ? 'المدن والقرى' : 'Cities / Localities'}
                            </div>
                          )}
                          {filteredItems.filter(i => i.type === 'city').slice(0, 30).map(item => (
                            <div 
                              key={item.id} 
                              className="multiselect-item"
                              onMouseDown={() => handleSelectItem(item)}
                            >
                              {lang === 'he' ? item.name : item.name_en}
                            </div>
                          ))}
                        </>
                      ) : (
                        <div className="multiselect-item" style={{ opacity: 0.5 }}>
                          {lang === 'he' ? 'לא נמצאו תוצאות' : lang === 'ar' ? 'لا توجد نتائج' : 'No matches found'}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Tags/Chips */}
                  <div className="multiselect-chips">
                    {subscribedZones.map(item => (
                      <div key={item.id} className="multiselect-chip">
                        <span>{lang === 'he' ? item.name : item.name_en}</span>
                        <button 
                          className="multiselect-chip-remove"
                          onClick={() => handleRemoveItem(item.id)}
                        >
                          &times;
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Volume Control */}
              <div className="modal-setting-group">
                <label>{t('volume', lang)}</label>
                <div className="volume-control-wrapper">
                  <input 
                    type="range" 
                    min="0" 
                    max="1" 
                    step="0.05"
                    className="volume-slider" 
                    value={volume}
                    onChange={(e) => setVolume(parseFloat(e.target.value))}
                  />
                  <span style={{ fontSize: '0.8rem', fontVariantNumeric: 'tabular-nums', opacity: 0.7 }}>
                    {Math.round(volume * 100)}%
                  </span>
                </div>
              </div>

              {/* TTS Announcer Toggle */}
              <div className="modal-setting-group modal-checkbox-row">
                <input 
                  type="checkbox" 
                  id="tts-toggle" 
                  checked={ttsEnabled}
                  onChange={(e) => setTtsEnabled(e.target.checked)}
                />
                <label htmlFor="tts-toggle">
                  {t('enableTts', lang)}
                </label>
              </div>

              {/* App Preferences Section (Mobile Only to avoid layout overflow in header) */}
              {isMobile && (
                <div style={{ marginTop: '20px', borderTop: '1px solid var(--border-glass)', paddingTop: '16px' }}>
                  <h4 style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: '14px', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 600 }}>
                    {lang === 'he' ? 'העדפות אפליקציה' : lang === 'ar' ? 'تفضيلات التطبيق' : 'App Preferences'}
                  </h4>
                  
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                    {/* Language Selector */}
                    <div className="modal-setting-group">
                      <label>{lang === 'he' ? 'שפה' : lang === 'ar' ? 'اللغة' : 'Language'}</label>
                      <select 
                        value={lang} 
                        onChange={(e) => setLang(e.target.value as Language)}
                        className="modal-select"
                      >
                        <option value="en">English</option>
                        <option value="he">עברית</option>
                        <option value="ar">العربية</option>
                      </select>
                    </div>

                    {/* Theme Toggle */}
                    <div className="modal-setting-group">
                      <label>{lang === 'he' ? 'מצב תצוגה' : lang === 'ar' ? 'מظهر השاشة' : 'Appearance Theme'}</label>
                      <button
                        onClick={() => setTheme(prev => prev === 'light' ? 'dark' : 'light')}
                        style={{
                          width: '100%',
                          padding: '10px 14px',
                          fontSize: '0.85rem',
                          background: 'rgba(255,255,255,0.05)',
                          border: '1px solid var(--border-glass)',
                          borderRadius: '8px',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '8px',
                          fontWeight: 600
                        }}
                      >
                        {theme === 'light' ? <Moon size={14} /> : <Sun size={14} />}
                        {theme === 'light' ? t('themeDark', lang) : t('themeLight', lang)}
                      </button>
                    </div>

                    {/* Browser Notifications Switch */}
                    <div className="modal-setting-group">
                      <label>{lang === 'he' ? 'התראות דפדפן' : lang === 'ar' ? 'إشعارات المتصفح' : 'Browser Notifications'}</label>
                      <button
                        onClick={() => {
                          if (Notification.permission === 'default') {
                            Notification.requestPermission();
                          }
                        }}
                        style={{
                          width: '100%',
                          padding: '10px 14px',
                          fontSize: '0.85rem',
                          background: 'rgba(255,255,255,0.05)',
                          border: '1px solid var(--border-glass)',
                          borderRadius: '8px',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '8px',
                          fontWeight: 600,
                          color: Notification.permission === 'granted' ? 'var(--accent-green)' : 'var(--text-secondary)'
                        }}
                      >
                        <Bell size={14} style={{ color: Notification.permission === 'granted' ? 'var(--accent-green)' : 'var(--text-muted)' }} />
                        {Notification.permission === 'granted' ? t('notificationsEnabled', lang) : t('enableNotifications', lang)}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Action buttons */}
            <div className="modal-actions">
              <button 
                onClick={handleTestSiren} 
                disabled={sirenPlaying} 
                className="diagnostics-btn siren-btn"
                style={{ width: '100%', padding: '10px', justifyContent: 'center' }}
              >
                <Volume2 size={12} />
                {sirenPlaying ? t('playingTest', lang) : t('testSiren', lang)}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
