import { useEffect, useState } from 'react';
import axios from 'axios';
import { Radio, RefreshCw, AlertTriangle, ShieldCheck, Activity, ChevronUp, ChevronDown, Volume2 } from 'lucide-react';
import { t } from '../i18n';
import type { Language } from '../i18n';

interface StatusState {
  status: string;
  clientsConnected: number;
  environment: string;
  latency: number;
}

interface StatusCardProps {
  isConnected: boolean;
  lang: Language;
  cities: any[];
  
  soundMode: 'none' | 'all' | 'custom';
  setSoundMode: (mode: 'none' | 'all' | 'custom') => void;
  
  volume: number;
  setVolume: (vol: number) => void;
  
  ttsEnabled: boolean;
  setTtsEnabled: (enabled: boolean) => void;
  
  subscribedZones: any[];
  setSubscribedZones: (zones: any[]) => void;
}

// Play the real Israeli air raid siren (צפירה) using the siren.mp3 static asset
export function playIsraeliSiren(volume: number = 0.8, onEnded?: () => void) {
  try {
    const audio = new Audio('/siren.mp3');
    audio.volume = volume;
    if (onEnded) {
      audio.onended = onEnded;
    }
    audio.play();
    return audio;
  } catch (err) {
    console.error('Failed to play Israeli siren audio.', err);
  }
}

function Tooltip({ text, children }: { text: string; children: React.ReactNode }) {
  return (
    <span className="diagnostics-tooltip-wrapper">
      {children}
      <span className="diagnostics-tooltip">{text}</span>
    </span>
  );
}

export default function StatusCard({
  isConnected,
  lang,
  cities,
  soundMode,
  setSoundMode,
  volume,
  setVolume,
  ttsEnabled,
  setTtsEnabled,
  subscribedZones,
  setSubscribedZones
}: StatusCardProps) {
  const [status, setStatus] = useState<StatusState | null>(null);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [sirenPlaying, setSirenPlaying] = useState(false);
  
  // Custom multiselect search state
  const [searchTerm, setSearchTerm] = useState('');
  const [dropdownOpen, setDropdownOpen] = useState(false);

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

  const fetchStatus = () => {
    setLoading(true);
    const start = Date.now();
    axios.get('/api/status')
      .then(res => {
        setStatus({
          ...res.data,
          latency: Date.now() - start
        });
      })
      .catch(err => {
        console.error('Failed to retrieve backend status.', err);
        setStatus(null);
      })
      .finally(() => {
        setLoading(false);
      });
  };

  const handleTestSiren = () => {
    if (sirenPlaying) return;
    setSirenPlaying(true);
    playIsraeliSiren(volume, () => {
      setSirenPlaying(false);
    });
  };

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 30000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="diagnostics-bar">
      {/* Collapsed summary bar — always visible */}
      <button 
        className="diagnostics-toggle"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="diagnostics-summary">
          <Activity size={14} style={{ opacity: 0.7 }} />
          <span className="diagnostics-label">{t('diagnosticsTitle', lang)}</span>
          
          {/* Compact inline status indicators */}
          <span className="diagnostics-inline-status">
            <span 
              className={`diagnostics-dot ${isConnected ? 'green' : 'red'}`} 
              title={isConnected ? 'SSE Connected' : 'SSE Disconnected'}
            />
            <span 
              className={`diagnostics-dot ${status ? 'green' : 'red'}`} 
              title={status ? 'API Online' : 'API Offline'}
            />
            {status && <span className="diagnostics-latency" dir="ltr">{status.latency}ms</span>}
          </span>
        </div>
        {expanded ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
      </button>

      {/* Expanded diagnostics panel */}
      {expanded && (
        <div className="diagnostics-expanded">
          <div className="diagnostics-grid">
            
            {/* SSE Connection */}
            <Tooltip text={t('tooltipSSE', lang)}>
              <div className="diagnostics-item">
                <span className="diagnostics-item-label">{t('sseStream', lang)}</span>
                <span 
                  className="diagnostics-item-value"
                  style={{ color: isConnected ? 'var(--accent-green)' : 'var(--accent-red)' }}
                >
                  <Radio size={13} className={isConnected ? 'pulse' : ''} />
                  {isConnected ? t('statusLive', lang) : t('statusDisconnected', lang)}
                </span>
              </div>
            </Tooltip>

            {/* API Handshake */}
            <Tooltip text={t('tooltipAPI', lang)}>
              <div className="diagnostics-item">
                <span className="diagnostics-item-label">{t('apiHandshake', lang)}</span>
                <span 
                  className="diagnostics-item-value"
                  style={{ color: status ? 'var(--accent-green)' : 'var(--accent-red)' }}
                >
                  {status ? <ShieldCheck size={13} /> : <AlertTriangle size={13} />}
                  {status ? t('statusSecure', lang) : t('statusOffline', lang)}
                </span>
              </div>
            </Tooltip>

            {/* Latency */}
            {status && (
              <Tooltip text={t('tooltipLatency', lang)}>
                <div className="diagnostics-item">
                  <span className="diagnostics-item-label">{t('networkLatency', lang)}</span>
                  <span className="diagnostics-item-value" dir="ltr">{status.latency} ms</span>
                </div>
              </Tooltip>
            )}

            {/* Active Connections */}
            {status && (
              <Tooltip text={t('tooltipConnections', lang)}>
                <div className="diagnostics-item">
                  <span className="diagnostics-item-label">{t('broadcasterSubs', lang)}</span>
                  <span className="diagnostics-item-value">
                    {status.clientsConnected} {lang === 'ar' ? 'أجهزة' : (lang === 'he' ? 'צמתים' : 'nodes')}
                  </span>
                </div>
              </Tooltip>
            )}
          </div>

          {/* Warning Settings Panel */}
          <div className="settings-grid">
            {/* Alert Mode Selection */}
            <div className="settings-group">
              <label>{t('soundMode', lang)}</label>
              <select 
                value={soundMode} 
                onChange={(e) => setSoundMode(e.target.value as any)}
                className="settings-select"
              >
                <option value="none">{t('soundNone', lang)}</option>
                <option value="all">{t('soundAll', lang)}</option>
                <option value="custom">{t('soundCustom', lang)}</option>
              </select>
            </div>

            {/* Custom subscriptions searchable multiselect */}
            {soundMode === 'custom' && (
              <div className="settings-group searchable-multiselect">
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
            <div className="settings-group">
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
            <div className="settings-group" style={{ flexDirection: 'row', alignItems: 'center', gap: '8px', minHeight: '38px', marginTop: '16px' }}>
              <input 
                type="checkbox" 
                id="tts-toggle" 
                style={{ cursor: 'pointer', width: '16px', height: '16px' }}
                checked={ttsEnabled}
                onChange={(e) => setTtsEnabled(e.target.checked)}
              />
              <label htmlFor="tts-toggle" style={{ cursor: 'pointer', fontSize: '0.75rem', textTransform: 'none', color: 'var(--text-primary)', userSelect: 'none' }}>
                {t('enableTts', lang)}
              </label>
            </div>
          </div>

          {/* Action buttons */}
          <div className="diagnostics-actions">
            <button onClick={fetchStatus} disabled={loading} className="diagnostics-btn">
              <RefreshCw size={12} className={loading ? 'spin' : ''} />
              {t('btnCheck', lang)}
            </button>
            <button 
              onClick={handleTestSiren} 
              disabled={sirenPlaying} 
              className="diagnostics-btn siren-btn"
            >
              <Volume2 size={12} />
              {sirenPlaying ? t('playingTest', lang) : t('testSiren', lang)}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
