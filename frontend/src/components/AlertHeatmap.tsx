import { useEffect, useState, useCallback } from 'react';
import { MapContainer, TileLayer, CircleMarker, Popup, Polygon } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import axios from 'axios';
import { RefreshCw } from 'lucide-react';
import { t, translateZone } from '../i18n';
import type { Language } from '../i18n';

interface AlertHeatmapProps {
  lang: Language;
  cities: any[];
  theme: 'light' | 'dark';
}

const ISRAEL_CENTER = { lat: 31.7683, lng: 35.2137 };

type PresetRange = 'day' | 'week' | 'month' | 'year' | 'custom';

export default function AlertHeatmap({ lang, cities, theme }: AlertHeatmapProps) {
  const [preset, setPreset] = useState<PresetRange>('week');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [heatmapCounts, setHeatmapCounts] = useState<{ [key: string]: number }>({});
  const [polygonsRegistry, setPolygonsRegistry] = useState<{ [key: string]: [number, number][] }>({});
  const [loading, setLoading] = useState(false);

  // Load polygons GeoJSON database on mount
  useEffect(() => {
    axios.get('/api/polygons')
      .then(res => {
        setPolygonsRegistry(res.data);
      })
      .catch(err => {
        console.error('Failed to load polygons in Heatmap view.', err);
      });
  }, []);

  // Fetch heatmap aggregated counts based on time range filters
  const fetchHeatmap = useCallback(() => {
    setLoading(true);
    let startTimestamp: number | null = null;
    let endTimestamp: number | null = null;

    const now = Date.now();

    if (preset === 'day') {
      startTimestamp = now - 24 * 60 * 60 * 1000;
    } else if (preset === 'week') {
      startTimestamp = now - 7 * 24 * 60 * 60 * 1000;
    } else if (preset === 'month') {
      startTimestamp = now - 30 * 24 * 60 * 60 * 1000;
    } else if (preset === 'year') {
      startTimestamp = now - 365 * 24 * 60 * 60 * 1000;
    } else if (preset === 'custom') {
      if (startDate) {
        startTimestamp = new Date(startDate).getTime();
      }
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        endTimestamp = end.getTime();
      }
    }

    const params: any = {};
    if (startTimestamp) params.startTimestamp = startTimestamp;
    if (endTimestamp) params.endTimestamp = endTimestamp;

    axios.get('/api/alerts/heatmap', { params })
      .then(res => {
        setHeatmapCounts(res.data);
      })
      .catch(err => {
        console.error('Failed to retrieve alert heatmap counts.', err);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [preset, startDate, endDate]);

  useEffect(() => {
    fetchHeatmap();
  }, [fetchHeatmap]);

  // Color helper based on warning count density
  const getDensityStyle = (count: number) => {
    if (count <= 1) {
      return { color: '#ffe082', fillColor: '#ffe082', fillOpacity: 0.4 };
    }
    if (count <= 5) {
      return { color: '#ffb74d', fillColor: '#ffb74d', fillOpacity: 0.5 };
    }
    if (count <= 15) {
      return { color: '#ff7043', fillColor: '#ff7043', fillOpacity: 0.6 };
    }
    if (count <= 50) {
      return { color: '#f44336', fillColor: '#f44336', fillOpacity: 0.7 };
    }
    return { color: '#b71c1c', fillColor: '#b71c1c', fillOpacity: 0.8 };
  };

  // Compile active polygons and circle markers list
  const heatmapFeatures: Array<{
    cityNameHeb: string;
    cityNameEng: string;
    cityNameArb: string;
    zoneName: string;
    lat: number;
    lng: number;
    count: number;
    polygonCoords?: [number, number][];
    style: { color: string; fillColor: string; fillOpacity: number };
  }> = [];

  Object.entries(heatmapCounts).forEach(([hebName, count]) => {
    // Match db name to preloaded cities catalog
    const cleaned = hebName.split(' - ')[0].trim();
    const city = cities.find(c => c.name === cleaned || c.value === cleaned || hebName.includes(c.name));

    if (city) {
      heatmapFeatures.push({
        cityNameHeb: city.name,
        cityNameEng: city.name_en,
        cityNameArb: city.name_ar || city.name_en,
        zoneName: city.zone || '',
        lat: city.lat,
        lng: city.lng,
        count,
        polygonCoords: polygonsRegistry[city.id],
        style: getDensityStyle(count)
      });
    }
  });

  const isRtl = lang === 'he' || lang === 'ar';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', height: '100%', flex: 1, minHeight: 0 }}>
      
      {/* Filters toolbar */}
      <div className="glass-panel heatmap-filters" style={{ padding: '12px 16px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <label style={{ fontSize: '0.7rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
            {t('heatmapSelectRange', lang)}
          </label>
          <div className="heatmap-presets">
            <button 
              className={`heatmap-preset-btn ${preset === 'day' ? 'active' : ''}`}
              onClick={() => setPreset('day')}
            >
              {t('presetDay', lang)}
            </button>
            <button 
              className={`heatmap-preset-btn ${preset === 'week' ? 'active' : ''}`}
              onClick={() => setPreset('week')}
            >
              {t('presetWeek', lang)}
            </button>
            <button 
              className={`heatmap-preset-btn ${preset === 'month' ? 'active' : ''}`}
              onClick={() => setPreset('month')}
            >
              {t('presetMonth', lang)}
            </button>
            <button 
              className={`heatmap-preset-btn ${preset === 'year' ? 'active' : ''}`}
              onClick={() => setPreset('year')}
            >
              {t('presetYear', lang)}
            </button>
            <button 
              className={`heatmap-preset-btn ${preset === 'custom' ? 'active' : ''}`}
              onClick={() => setPreset('custom')}
            >
              {t('presetCustom', lang)}
            </button>
          </div>
        </div>

        {/* Custom Datepicker controls */}
        {preset === 'custom' && (
          <div className="heatmap-custom-range" style={{ marginTop: '16px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>{t('filterStartDate', lang)}</span>
              <input 
                type="date" 
                className="heatmap-date-input" 
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>{t('filterEndDate', lang)}</span>
              <input 
                type="date" 
                className="heatmap-date-input" 
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
          </div>
        )}

        <div style={{ marginInlineStart: 'auto', display: 'flex', gap: '8px', alignItems: 'center' }}>
          {loading && <RefreshCw size={14} className="spin" style={{ color: 'var(--text-muted)' }} />}
          <button 
            onClick={fetchHeatmap} 
            disabled={loading}
            className="heatmap-preset-btn"
            style={{ 
              border: '1px solid var(--border-glass)', 
              background: 'rgba(255,255,255,0.02)',
              borderRadius: '6px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <RefreshCw size={12} className={loading ? 'spin' : ''} />
            {t('btnRefresh', lang)}
          </button>
        </div>
      </div>

      {/* Main Map Container */}
      <div className="glass-panel" style={{ padding: '8px', flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, overflow: 'hidden', position: 'relative' }}>
        <MapContainer
          center={[ISRAEL_CENTER.lat, ISRAEL_CENTER.lng]}
          zoom={8}
          zoomControl={true}
          style={{ height: '100%', width: '100%', borderRadius: '12px' }}
        >
          <TileLayer
            url={theme === 'light' 
              ? "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
              : "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
            }
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
          />

          {/* Render Heatmap Polygons */}
          {heatmapFeatures.map((feat, idx) => {
            if (!feat.polygonCoords) return null;
            const cityName = lang === 'en' ? feat.cityNameEng : lang === 'ar' ? feat.cityNameArb : feat.cityNameHeb;
            
            return (
              <Polygon
                key={`heat-poly-${feat.cityNameHeb}-${idx}`}
                positions={feat.polygonCoords}
                pathOptions={{
                  fillColor: feat.style.fillColor,
                  fillOpacity: feat.style.fillOpacity,
                  color: feat.style.color,
                  weight: 1.5,
                }}
              >
                <Popup>
                  <div style={{ textAlign: 'center' }}>
                    <h3 style={{ margin: '0 0 4px 0', fontSize: '1rem', color: feat.style.color }}>
                      {cityName}
                    </h3>
                    <p style={{ fontSize: '0.8rem', opacity: 0.7, margin: '2px 0' }}>
                      {translateZone(feat.zoneName, lang)}
                    </p>
                    <hr style={{ border: 'none', borderTop: '1px solid rgba(255,255,255,0.15)', margin: '6px 0' }} />
                    <p style={{ fontSize: '0.95rem', fontWeight: 'bold' }}>
                      {feat.count} {t('sirenCount', lang)}
                    </p>
                  </div>
                </Popup>
              </Polygon>
            );
          })}

          {/* Render Heatmap Circle Markers */}
          {heatmapFeatures.map((feat, idx) => {
            if (!feat.lat || !feat.lng) return null;
            const cityName = lang === 'en' ? feat.cityNameEng : lang === 'ar' ? feat.cityNameArb : feat.cityNameHeb;
            
            // Calculate proportional radius
            const markerRadius = Math.min(25, 5 + Math.sqrt(feat.count) * 2.5);

            return (
              <CircleMarker
                key={`heat-marker-${feat.cityNameHeb}-${idx}`}
                center={[feat.lat, feat.lng]}
                radius={markerRadius}
                pathOptions={{
                  fillColor: feat.style.fillColor,
                  fillOpacity: 0.85,
                  color: '#ffffff',
                  weight: 1.2
                }}
              >
                <Popup>
                  <div style={{ textAlign: 'center', minWidth: '130px' }}>
                    <h3 style={{ margin: '0 0 4px 0', fontSize: '1.05rem', color: feat.style.color }}>
                      {cityName}
                    </h3>
                    <p style={{ fontSize: '0.8rem', opacity: 0.7, margin: '2px 0' }}>
                      {translateZone(feat.zoneName, lang)}
                    </p>
                    <hr style={{ border: 'none', borderTop: '1px solid rgba(255,255,255,0.15)', margin: '6px 0' }} />
                    <p style={{ fontSize: '1.1rem', fontWeight: 'bold', color: 'var(--accent-red)' }}>
                      {feat.count} {t('sirenCount', lang)}
                    </p>
                  </div>
                </Popup>
              </CircleMarker>
            );
          })}
        </MapContainer>

        {/* Map Legend */}
        <div 
          dir={isRtl ? 'rtl' : 'ltr'}
          style={{
            position: 'absolute',
            bottom: '20px',
            [isRtl ? 'right' : 'left']: '20px',
            zIndex: 1000,
            padding: '12px',
            borderRadius: '8px',
            textAlign: isRtl ? 'right' : 'left',
          }}
          className={`glass-panel ${isRtl ? 'hebrew' : ''}`}
        >
          <h5 style={{ marginBottom: '8px', fontSize: '0.82rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            {lang === 'he' ? 'צפיפות אזעקות' : lang === 'ar' ? 'كثافة الإنذارات' : 'Siren Density'}
          </h5>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '0.78rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: '#ffe082' }} />
              <span>1 {lang === 'he' ? 'אזעקה' : lang === 'ar' ? 'إنذار' : 'siren'}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: '#ffb74d' }} />
              <span>2 - 5 {t('sirenCount', lang)}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: '#ff7043' }} />
              <span>6 - 15 {t('sirenCount', lang)}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: '#f44336' }} />
              <span>16 - 50 {t('sirenCount', lang)}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: '#b71c1c', boxShadow: '0 0 5px #b71c1c' }} />
              <span>51+ {t('sirenCount', lang)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
