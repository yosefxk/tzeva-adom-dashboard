import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, CircleMarker, Popup, Polygon, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import axios from 'axios';
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

interface AlertMapProps {
  activeAlerts: ActiveAlert[];
  lang: Language;
  cities: any[];
  theme: 'light' | 'dark';
}

const ISRAEL_CENTER = { lat: 31.7683, lng: 35.2137 };

function MapController({ activeAlerts }: { activeAlerts: ActiveAlert[] }) {
  const map = useMap();

  useEffect(() => {
    if (activeAlerts.length > 0) {
      const coords = activeAlerts.flatMap(alert => alert.coords);
      if (coords.length > 0) {
        const latestCoord = coords[coords.length - 1];
        map.setView([latestCoord.lat, latestCoord.lng], 9, { animate: true });
      }
    }
  }, [activeAlerts, map]);

  return null;
}

export default function AlertMap({ activeAlerts, lang, cities, theme }: AlertMapProps) {
  const [polygonsRegistry, setPolygonsRegistry] = useState<{ [key: string]: [number, number][] }>({});

  // Load polygons GeoJSON database on startup
  useEffect(() => {
    axios.get('/api/polygons')
      .then(res => {
        setPolygonsRegistry(res.data);
      })
      .catch(err => {
        console.error('Failed to load polygons GeoJSON dictionary.', err);
      });
  }, []);

  // Match active alert location names to city IDs to pull polygons
  const activeAlertPolygons: Array<{
    alertId: string;
    cityId: number;
    nameHeb: string;
    nameEng: string;
    coordinates: [number, number][];
    color: string;
  }> = [];

  activeAlerts.forEach(alert => {
    alert.locations.forEach(locName => {
      const cleaned = locName.split(' - ')[0].trim();
      const match = cities.find(c => c.name === cleaned || c.value === cleaned || locName.includes(c.name));
      if (match && polygonsRegistry[match.id]) {
        activeAlertPolygons.push({
          alertId: alert.id,
          cityId: match.id,
          nameHeb: match.name,
          nameEng: match.name_en,
          coordinates: polygonsRegistry[match.id],
          color: alert.category === 2 || alert.category === 102 ? '#ff9100' : '#ff334b' // Orange for drones, Red for rockets
        });
      }
    });
  });

  const isRtl = lang === 'he' || lang === 'ar';

  const getRtlStyle = (): React.CSSProperties => {
    return isRtl ? { right: '20px', left: 'auto' } : { left: '20px', right: 'auto' };
  };

  return (
    <div style={{ height: '550px', width: '100%', position: 'relative' }}>
      <MapContainer
        center={[ISRAEL_CENTER.lat, ISRAEL_CENTER.lng]}
        zoom={8}
        zoomControl={true}
        style={{ height: '100%', width: '100%' }}
      >
        <TileLayer
          url={theme === 'light' 
            ? "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
            : "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          }
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
        />

        <MapController activeAlerts={activeAlerts} />

        {/* Render Glowing Danger Zone Polygons */}
        {activeAlertPolygons.map((poly, idx) => {
          const translatedName = translateCity(poly.nameHeb, lang, cities);
          const subLabel = lang === 'he' ? poly.nameEng : poly.nameHeb;

          return (
            <Polygon
              key={`poly-${poly.alertId}-${poly.cityId}-${idx}`}
              positions={poly.coordinates}
              pathOptions={{
                fillColor: poly.color,
                fillOpacity: 0.35,
                color: poly.color,
                weight: 2,
                dashArray: '4, 4'
              }}
            >
              <Popup>
                <div style={{ textAlign: 'center' }}>
                  <h4 style={{ color: poly.color }}>🚨 {t('activeDangerZone', lang)}</h4>
                  <p style={{ fontSize: '1.25rem', fontWeight: 'bold', margin: '4px 0' }}>{translatedName}</p>
                  {translatedName !== subLabel && (
                    <p style={{ fontSize: '0.85rem', opacity: 0.7 }}>{subLabel}</p>
                  )}
                </div>
              </Popup>
            </Polygon>
          );
        })}

        {/* Render pulsating beacon CircleMarkers */}
        {activeAlerts.flatMap(alert => 
          alert.coords.map((c, idx) => {
            const isDrone = alert.category === 2 || alert.category === 102;
            const markerColor = isDrone ? '#ff9100' : '#ff334b';
            
            const translatedName = translateCity(c.label, lang, cities);
            const subLabel = lang === 'he' ? c.labelEn : c.label;
            const threatInfo = translateThreat(alert.category, lang);
            
            return (
              <CircleMarker
                key={`marker-${alert.id}-${idx}`}
                center={[c.lat, c.lng]}
                radius={10}
                pathOptions={{
                  fillColor: markerColor,
                  fillOpacity: 0.8,
                  color: '#ffffff',
                  weight: 1.5
                }}
              >
                <Popup>
                  <div style={{ textAlign: 'center', minWidth: '150px' }}>
                    <h3 style={{ color: markerColor, margin: '2px 0 6px 0', fontSize: '1rem' }}>
                      {threatInfo.title}
                    </h3>
                    <p style={{ fontSize: '1.25rem', fontWeight: 'bold', margin: '4px 0' }}>{translatedName}</p>
                    {translatedName !== subLabel && (
                      <p style={{ fontSize: '0.85rem', opacity: 0.7, margin: '2px 0' }}>{subLabel}</p>
                    )}
                    <hr style={{ border: 'none', borderTop: '1px solid rgba(255,255,255,0.15)', margin: '8px 0' }} />
                    <p style={{ fontSize: '0.85rem', color: '#ffea00', fontWeight: 'bold' }}>
                      {t('shelterTime', lang)}: {alert.countdown} {lang === 'ar' ? 'ثانية' : (lang === 'he' ? 'שניות' : 'seconds')}
                    </p>
                    {alert.isDrill && (
                      <p style={{ fontSize: '0.75rem', color: '#aaa', marginTop: '4px' }}>
                        ⚠️ {t('testDrill', lang)}
                      </p>
                    )}
                  </div>
                </Popup>
              </CircleMarker>
            );
          })
        )}
      </MapContainer>
      
      {/* Floating map legend overlay */}
      <div 
        dir={isRtl ? 'rtl' : 'ltr'}
        style={{
          position: 'absolute',
          bottom: '20px',
          zIndex: 1000,
          padding: '12px',
          borderRadius: '8px',
          textAlign: isRtl ? 'right' : 'left',
          ...getRtlStyle()
        }}
        className={`glass-panel ${isRtl ? 'hebrew' : ''}`}
      >
        <h5 style={{ marginBottom: '8px', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '1px' }}>{t('legendTitle', lang)}</h5>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '0.8rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexDirection: 'row' }}>
            <span style={{ display: 'inline-block', width: '12px', height: '12px', borderRadius: '50%', backgroundColor: '#ff334b', boxShadow: '0 0 8px #ff334b' }}></span>
            <span>{t('legendRocket', lang)}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexDirection: 'row' }}>
            <span style={{ display: 'inline-block', width: '12px', height: '12px', borderRadius: '50%', backgroundColor: '#ff9100', boxShadow: '0 0 8px #ff9100' }}></span>
            <span>{t('legendDrone', lang)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
