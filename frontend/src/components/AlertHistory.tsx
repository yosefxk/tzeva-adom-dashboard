import { useEffect, useState, useCallback } from 'react';
import axios from 'axios';
import { Search, Shield, Download, ChevronLeft, ChevronRight, RefreshCw } from 'lucide-react';
import { t, translateCity, translateThreat, translateZone } from '../i18n';
import type { Language } from '../i18n';

interface Coords {
  lat: number;
  lng: number;
  label: string;
  labelEn: string;
}

interface Alert {
  id: string;
  timestamp: number;
  category: number;
  title: string;
  locations: string[];
  locationsEn: string[];
  description: string;
  isDrill: boolean;
  coords: Coords[];
  zones: string[];
  countdown: number;
}

interface AlertHistoryProps {
  lang: Language;
  cities: any[];
}

const normalizeString = (str: string): string => {
  if (!str) return '';
  return str
    .toLowerCase()
    .replace(/['"\-–—\s,.]/g, '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
};

export default function AlertHistory({ lang, cities }: AlertHistoryProps) {
  const [historyData, setHistoryData] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);

  // Filters
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState<string>('');
  const [isDrill, setIsDrill] = useState<string>('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Autocomplete Suggestions State
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  useEffect(() => {
    if (!search.trim()) {
      setSuggestions([]);
      return;
    }
    const query = normalizeString(search);
    if (!query) {
      setSuggestions([]);
      return;
    }

    // 1. Find matching zones
    const uniqueZonesMap = new Map<string, { name: string; name_en: string }>();
    cities.forEach(c => {
      if (c.zone && !uniqueZonesMap.has(c.zone)) {
        uniqueZonesMap.set(c.zone, {
          name: c.zone,
          name_en: c.zone_en || c.zone
        });
      }
    });

    const matchingZones: any[] = [];
    uniqueZonesMap.forEach((zoneInfo) => {
      const nameNorm = normalizeString(zoneInfo.name);
      const nameEnNorm = normalizeString(zoneInfo.name_en);
      const translatedNorm = normalizeString(translateZone(zoneInfo.name, lang));
      if (nameNorm.includes(query) || nameEnNorm.includes(query) || translatedNorm.includes(query)) {
        matchingZones.push({
          type: 'zone',
          id: `zone-${zoneInfo.name}`,
          name: zoneInfo.name,
          name_en: zoneInfo.name_en,
          value: zoneInfo.name
        });
      }
    });

    // 2. Find matching cities
    const matchingCities: any[] = [];
    cities.forEach(c => {
      const nameNorm = normalizeString(c.name);
      const nameEnNorm = normalizeString(c.name_en);
      const nameArNorm = normalizeString(c.name_ar || '');
      
      if (nameNorm.includes(query) || nameEnNorm.includes(query) || nameArNorm.includes(query)) {
        matchingCities.push({
          type: 'city',
          id: `city-${c.value || c.name}`,
          name: c.name,
          name_en: c.name_en,
          name_ar: c.name_ar,
          zone: c.zone,
          zone_en: c.zone_en,
          value: c.name
        });
      }
    });

    const combined = [...matchingZones, ...matchingCities];
    setSuggestions(combined.slice(0, 10));
  }, [search, cities, lang]);

  const handleSelectSuggestion = (item: any) => {
    const nameToSet = lang === 'en' ? item.name_en : item.name;
    setSearch(nameToSet);
    setPage(1);
    setShowSuggestions(false);
  };

  const LIMIT = 15;

  const fetchHistory = useCallback(() => {
    setLoading(true);
    const params: any = {
      page,
      limit: LIMIT,
      search
    };

    if (category) params.category = category;
    if (isDrill) params.isDrill = isDrill;
    
    if (startDate) {
      params.startTimestamp = new Date(startDate).getTime();
    }
    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      params.endTimestamp = end.getTime();
    }

    axios.get('/api/alerts/history', { params })
      .then(res => {
        setHistoryData(res.data.data);
        setTotalPages(res.data.totalPages);
        setTotalItems(res.data.totalItems);
      })
      .catch(err => {
        console.error('Failed to query alert history.', err);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [page, search, category, isDrill, startDate, endDate]);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  const handleResetFilters = () => {
    setSearch('');
    setCategory('');
    setIsDrill('');
    setStartDate('');
    setEndDate('');
    setPage(1);
  };

  const handleExportCSV = () => {
    setLoading(true);
    const params: any = {
      page: 1,
      limit: 10000,
      search
    };
    if (category) params.category = category;
    if (isDrill) params.isDrill = isDrill;
    if (startDate) params.startTimestamp = new Date(startDate).getTime();
    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      params.endTimestamp = end.getTime();
    }

    axios.get('/api/alerts/history', { params })
      .then(res => {
        const fullData: Alert[] = res.data.data;
        if (fullData.length === 0) return alert('No history data to export.');

        // Build CSV columns
        const csvHeaders = [
          'ID',
          t('colDateTime', lang) + ' - Date',
          t('colDateTime', lang) + ' - Time',
          t('colThreat', lang),
          t('colLocationHe', lang),
          t('colLocation', lang),
          t('colZone', lang),
          t('colCountdown', lang),
          t('colClass', lang)
        ];
        
        const csvRows = fullData.map(alertItem => {
          const dateObj = new Date(alertItem.timestamp);
          const date = dateObj.toLocaleDateString('en-GB');
          const time = dateObj.toLocaleTimeString('en-GB');
          const threatInfo = translateThreat(alertItem.category, lang);
          const resolvedCities = alertItem.locations.map(loc => translateCity(loc, lang, cities)).join(', ');
          const resolvedZones = alertItem.zones.map(z => translateZone(z, lang)).join(', ');
          const className = alertItem.isDrill ? t('classDrill', lang) : t('classActive', lang);
          
          return [
            alertItem.id,
            date,
            time,
            `"${threatInfo.title}"`,
            `"${alertItem.locations.join(', ')}"`,
            `"${resolvedCities}"`,
            `"${resolvedZones}"`,
            alertItem.countdown,
            className
          ].join(',');
        });

        const csvContent = [csvHeaders.join(','), ...csvRows].join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.setAttribute('href', url);
        link.setAttribute('download', `tzeva_adom_export_${Date.now()}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      })
      .catch(err => {
        console.error('CSV export request failed.', err);
      })
      .finally(() => {
        setLoading(false);
      });
  };

  const getSubTitleText = () => {
    return t('historySubtitle', lang).replace('{count}', totalItems.toLocaleString(lang));
  };

  const getPageInfoText = () => {
    return t('showingPage', lang)
      .replace('{page}', page.toLocaleString(lang))
      .replace('{total}', totalPages.toLocaleString(lang))
      .replace('{items}', totalItems.toLocaleString(lang));
  };

  return (
    <div className="glass-panel" style={{ padding: '24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
        <div style={{ textAlign: (lang === 'he' || lang === 'ar') ? 'right' : 'left' }}>
          <h2>{t('historyTitle', lang)}</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>{getSubTitleText()}</p>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button onClick={fetchHistory} disabled={loading} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <RefreshCw size={16} className={loading ? 'spin' : ''} />
            {t('btnRefresh', lang)}
          </button>
          <button className="primary" onClick={handleExportCSV} disabled={loading} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Download size={16} />
            {t('btnExportCSV', lang)}
          </button>
        </div>
      </div>

      {/* Advanced Filter Panel */}
      <div 
        style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', 
          gap: '12px', 
          marginBottom: '20px',
          padding: '16px',
          background: 'rgba(255,255,255,0.01)',
          border: '1px solid var(--border-glass)',
          borderRadius: '12px',
          textAlign: (lang === 'he' || lang === 'ar') ? 'right' : 'left'
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{t('filterSearch', lang)}</label>
          <div style={{ position: 'relative' }}>
            <Search size={16} style={{ 
              position: 'absolute', 
              left: (lang === 'he' || lang === 'ar') ? 'auto' : '10px', 
              right: (lang === 'he' || lang === 'ar') ? '10px' : 'auto', 
              top: '12px', 
              color: 'var(--text-muted)' 
            }} />
            <input 
              type="text" 
              placeholder={t('placeholderSearch', lang)} 
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              onFocus={() => setShowSuggestions(true)}
              onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
              style={{ 
                paddingLeft: (lang === 'he' || lang === 'ar') ? '12px' : '32px', 
                paddingRight: (lang === 'he' || lang === 'ar') ? '32px' : '12px', 
                width: '100%',
                textAlign: (lang === 'he' || lang === 'ar') ? 'right' : 'left'
              }}
            />
            {showSuggestions && suggestions.length > 0 && (
              <div className="autocomplete-dropdown">
                {suggestions.map((item) => {
                  const getZoneSuffix = (l: string) => {
                    if (l === 'he') return '(אזור)';
                    if (l === 'ar') return '(منطقة)';
                    return '(Region)';
                  };
                  
                  const formatCityInZone = (cityName: string, zoneName: string, zoneNameEn: string, l: string) => {
                    if (!zoneName) return cityName;
                    const translatedZone = translateZone(zoneNameEn || zoneName, l as any);
                    if (l === 'he') {
                      let finalZone = translatedZone;
                      if (translatedZone.startsWith('ה') && translatedZone.length > 1) {
                        finalZone = translatedZone.substring(1);
                      }
                      return `${cityName} (עיר ב${finalZone})`;
                    }
                    if (l === 'ar') {
                      return `${cityName} (مدينة في ${translatedZone})`;
                    }
                    return `${cityName} (City in ${translatedZone})`;
                  };

                  let displayLabel = '';
                  if (item.type === 'zone') {
                    const localizedZoneName = translateZone(item.name_en || item.name, lang);
                    displayLabel = `${localizedZoneName} ${getZoneSuffix(lang)}`;
                  } else {
                    const localizedCityName = lang === 'en' ? item.name_en : item.name;
                    displayLabel = formatCityInZone(localizedCityName, item.zone, item.zone_en, lang);
                  }

                  return (
                    <div 
                      key={item.id} 
                      className="autocomplete-item"
                      onMouseDown={() => handleSelectSuggestion(item)}
                      style={{
                        textAlign: (lang === 'he' || lang === 'ar') ? 'right' : 'left',
                        direction: (lang === 'he' || lang === 'ar') ? 'rtl' : 'ltr'
                      }}
                    >
                      {displayLabel}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{t('filterCategory', lang)}</label>
          <select value={category} onChange={(e) => { setCategory(e.target.value); setPage(1); }} style={{ width: '100%' }}>
            <option value="">{t('allThreats', lang)}</option>
            <option value="1">{translateThreat(1, lang).title}</option>
            <option value="2">{translateThreat(2, lang).title}</option>
            <option value="3">{translateThreat(3, lang).title}</option>
            <option value="7">{translateThreat(7, lang).title}</option>
            <option value="6">{translateThreat(6, lang).title}</option>
          </select>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{t('filterClass', lang)}</label>
          <select value={isDrill} onChange={(e) => { setIsDrill(e.target.value); setPage(1); }} style={{ width: '100%' }}>
            <option value="">{t('allAlertClasses', lang)}</option>
            <option value="false">{t('realAlarmsOnly', lang)}</option>
            <option value="true">{t('drillsOnly', lang)}</option>
          </select>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{t('filterStartDate', lang)}</label>
          <input 
            type="date" 
            value={startDate} 
            onChange={(e) => { setStartDate(e.target.value); setPage(1); }}
            style={{ width: '100%' }}
          />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{t('filterEndDate', lang)}</label>
          <input 
            type="date" 
            value={endDate} 
            onChange={(e) => { setEndDate(e.target.value); setPage(1); }}
            style={{ width: '100%' }}
          />
        </div>

        <div style={{ display: 'flex', alignItems: 'flex-end' }}>
          <button onClick={handleResetFilters} style={{ width: '100%', height: '40px' }}>
            {t('btnClear', lang)}
          </button>
        </div>
      </div>

      {/* History Data Table */}
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: (lang === 'he' || lang === 'ar') ? 'right' : 'left' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border-glass)', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
              <th style={{ padding: '12px 8px' }}>{t('colDateTime', lang)}</th>
              <th style={{ padding: '12px 8px' }}>{t('colThreat', lang)}</th>
              {lang === 'he' ? (
                <th style={{ padding: '12px 8px' }}>{t('colLocationHe', lang)}</th>
              ) : (
                <>
                  <th style={{ padding: '12px 8px' }}>{t('colLocation', lang)}</th>
                  <th className="desktop-only" style={{ padding: '12px 8px' }}>{t('colLocationHe', lang)}</th>
                </>
              )}
              <th className="desktop-only" style={{ padding: '12px 8px' }}>{t('colZone', lang)}</th>
              <th className="desktop-only" style={{ padding: '12px 8px', textAlign: 'center' }}>{t('colCountdown', lang)}</th>
              <th className="desktop-only" style={{ padding: '12px 8px', textAlign: 'center' }}>{t('colClass', lang)}</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={7} style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)' }}>
                  {t('loadingLogs', lang)}
                </td>
              </tr>
            ) : historyData.length === 0 ? (
              <tr>
                <td colSpan={7} style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)' }}>
                  {t('noAlertsMatched', lang)}
                </td>
              </tr>
            ) : (
              historyData.map((item) => {
                const dateObj = new Date(item.timestamp);
                const isDrone = item.category === 2 || item.category === 102;
                
                const threatInfo = translateThreat(item.category, lang);
                const resolvedCities = item.locations.map(loc => translateCity(loc, lang, cities)).join(', ');
                const resolvedZones = item.zones.map(z => translateZone(z, lang)).join(', ');

                return (
                  <tr 
                    key={item.id} 
                    style={{ 
                      borderBottom: '1px solid rgba(255,255,255,0.03)', 
                      fontSize: '0.9rem',
                      background: item.isDrill ? 'rgba(255,255,255,0.01)' : 'transparent'
                    }}
                  >
                    <td style={{ padding: '14px 8px', whiteSpace: 'nowrap' }}>
                      <div style={{ fontWeight: '500' }}>{dateObj.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{dateObj.toLocaleDateString('en-GB')}</div>
                    </td>
                    <td style={{ padding: '14px 8px', whiteSpace: 'nowrap' }}>
                      <span 
                        style={{ 
                          display: 'inline-flex', 
                          alignItems: 'center', 
                          gap: '6px', 
                          color: item.isDrill ? 'var(--text-muted)' : isDrone ? 'var(--accent-orange)' : 'var(--accent-red)',
                          fontWeight: '500'
                        }}
                      >
                        <Shield size={14} />
                        {threatInfo.title}
                      </span>
                    </td>
                    {lang === 'he' ? (
                      <td className="hebrew" style={{ padding: '14px 8px', fontSize: '1rem', fontWeight: '500' }}>
                        {item.locations.join(', ')}
                      </td>
                    ) : (
                      <>
                        <td style={{ padding: '14px 8px', color: 'var(--text-primary)', fontWeight: '500' }}>
                          {resolvedCities}
                        </td>
                        <td className="hebrew desktop-only" style={{ padding: '14px 8px', fontSize: '0.95rem', color: 'var(--text-muted)' }}>
                          {item.locations.join(', ')}
                        </td>
                      </>
                    )}
                    <td className="desktop-only" style={{ padding: '14px 8px', color: 'var(--text-secondary)' }}>
                      {resolvedZones}
                    </td>
                    <td className="desktop-only" style={{ padding: '14px 8px', textAlign: 'center', fontWeight: 'bold', color: '#ffea00' }}>
                      {item.countdown}s
                    </td>
                    <td className="desktop-only" style={{ padding: '14px 8px', textAlign: 'center' }}>
                      <span 
                        style={{ 
                          padding: '3px 8px', 
                          borderRadius: '4px', 
                          fontSize: '0.75rem', 
                          background: item.isDrill ? 'rgba(255,255,255,0.08)' : 'rgba(255, 51, 75, 0.12)',
                          color: item.isDrill ? 'var(--text-muted)' : 'var(--accent-red)'
                        }}
                      >
                        {item.isDrill ? t('classDrill', lang) : t('classActive', lang)}
                      </span>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Controls */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '20px' }}>
        <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
          {getPageInfoText()}
        </span>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button 
            disabled={page === 1 || loading} 
            onClick={() => setPage(p => p - 1)}
            style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '6px 12px' }}
          >
            <ChevronLeft size={16} style={{ transform: (lang === 'he' || lang === 'ar') ? 'rotate(180deg)' : 'none' }} />
            {t('btnPrev', lang)}
          </button>
          <button 
            disabled={page === totalPages || loading} 
            onClick={() => setPage(p => p + 1)}
            style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '6px 12px' }}
          >
            {t('btnNext', lang)}
            <ChevronRight size={16} style={{ transform: (lang === 'he' || lang === 'ar') ? 'rotate(180deg)' : 'none' }} />
          </button>
        </div>
      </div>
    </div>
  );
}
