import { useEffect, useState } from 'react';
import axios from 'axios';
import { Award, Loader2 } from 'lucide-react';
import { t, translateCity } from '../i18n';
import type { Language } from '../i18n';

interface CityStats {
  city: string;
  count: number;
}

interface LeaderboardProps {
  lang: Language;
  cities: any[];
  onCityClick?: (city: string) => void;
}

const COLORS = ['#ff334b', '#ff9100', '#00e5ff', '#ffea00', '#00e676', '#9335ee', '#ff4081', '#7c4dff', '#ffc400', '#00b0ff'];

export default function TopCitiesLeaderboard({ lang, cities, onCityClick }: LeaderboardProps) {
  const [data, setData] = useState<CityStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [timeframe, setTimeframe] = useState<'1h' | '24h' | '7d' | '30d' | '1y' | 'all'>('all');

  useEffect(() => {
    let active = true;
    setLoading(true);
    
    const params: any = {};
    const now = Date.now();
    
    if (timeframe === '1h') params.startTimestamp = now - 3600000;
    else if (timeframe === '24h') params.startTimestamp = now - 86400000;
    else if (timeframe === '7d') params.startTimestamp = now - 7 * 86400000;
    else if (timeframe === '30d') params.startTimestamp = now - 30 * 86400000;
    else if (timeframe === '1y') params.startTimestamp = now - 365 * 86400000;

    axios.get('/api/alerts/stats', { params })
      .then(res => {
        if (active) {
          setData(res.data.topCities);
        }
      })
      .catch(err => {
        console.error('Failed to fetch leaderboard stats.', err);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => { active = false; };
  }, [timeframe]);

  const maxCount = data.length > 0 ? data[0].count : 1;

  const timeframes: { id: typeof timeframe; key: string }[] = [
    { id: '1h', key: 'tf1H' },
    { id: '24h', key: 'tf24H' },
    { id: '7d', key: 'tf7D' },
    { id: '30d', key: 'tf30D' },
    { id: '1y', key: 'tf1Y' },
    { id: 'all', key: 'tfAll' },
  ];

  return (
    <div className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column' }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', gap: '16px' }}>
        <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
          <Award size={18} />
          {t('leaderboardTitle', lang)}
        </h3>
        
        {/* Timeframe Toggle */}
        <div style={{ 
          display: 'flex', 
          background: 'rgba(0,0,0,0.3)', 
          borderRadius: '8px',
          padding: '4px',
          direction: lang === 'he' || lang === 'ar' ? 'rtl' : 'ltr'
        }}>
          {timeframes.map(tf => (
            <button
              key={tf.id}
              onClick={() => setTimeframe(tf.id)}
              style={{
                padding: '6px 12px',
                fontSize: '0.8rem',
                border: 'none',
                background: timeframe === tf.id ? 'var(--accent-red)' : 'transparent',
                color: timeframe === tf.id ? '#fff' : 'var(--text-muted)',
                borderRadius: '6px',
                cursor: 'pointer',
                fontWeight: timeframe === tf.id ? 'bold' : 'normal',
                transition: 'all 0.2s'
              }}
            >
              {t(tf.key, lang)}
            </button>
          ))}
        </div>
      </div>

      <div style={{ minHeight: '300px', position: 'relative' }}>
        {loading ? (
          <div style={{ position: 'absolute', inset: 0, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
            <Loader2 size={32} className="spin" style={{ color: 'var(--accent-red)' }} />
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {data.length === 0 ? (
              <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '40px 0' }}>
                {t('noCitiesLogged', lang)}
              </div>
            ) : (
              data.map((city, idx) => {
                const translatedName = translateCity(city.city, lang, cities);
                const percentage = Math.max((city.count / maxCount) * 100, 2);
                const color = COLORS[idx % COLORS.length];

                return (
                  <div 
                    key={city.city}
                    onClick={() => onCityClick && onCityClick(city.city)}
                    style={{ 
                      display: 'flex', 
                      flexDirection: 'column', 
                      gap: '4px',
                      cursor: onCityClick ? 'pointer' : 'default',
                      position: 'relative'
                    }}
                    title={lang === 'he' ? `סנן לפי ${translatedName}` : `Filter by ${translatedName}`}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', zIndex: 1, padding: '0 4px' }}>
                      <span style={{ fontWeight: '500' }}>{idx + 1}. {translatedName}</span>
                      <span style={{ fontWeight: 'bold' }}>{city.count.toLocaleString(lang)} {t('alertsUnit', lang)}</span>
                    </div>
                    {/* Progress Bar Background */}
                    <div style={{ 
                      width: '100%', 
                      height: '8px', 
                      background: 'rgba(255,255,255,0.05)', 
                      borderRadius: '4px',
                      overflow: 'hidden'
                    }}>
                      <div style={{ 
                        width: `${percentage}%`, 
                        height: '100%', 
                        background: color,
                        borderRadius: '4px',
                        transition: 'width 0.5s ease-out'
                      }} />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>
    </div>
  );
}
