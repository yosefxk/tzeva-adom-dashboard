import { useEffect, useState } from 'react';
import axios from 'axios';
import { 
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell, Legend, AreaChart, Area
} from 'recharts';
import { BarChart2, TrendingUp, Award, Search } from 'lucide-react';
import { t, translateCity, translateThreat, translateZone } from '../i18n';
import type { Language } from '../i18n';

interface CategoryStats {
  category: number;
  label: string;
  count: number;
}

interface ZoneStats {
  zone: string;
  count: number;
}

interface CityStats {
  city: string;
  count: number;
}

interface HourlyStats {
  hour: number;
  count: number;
}

interface WeeklyStats {
  day: number;
  count: number;
}

interface YearlyStats {
  year: number;
  count: number;
}

interface StatsData {
  totalAlerts: number;
  categoriesDistribution: CategoryStats[];
  topZones: ZoneStats[];
  topCities: CityStats[];
  hourlyDistribution: HourlyStats[];
  weeklyDistribution: WeeklyStats[];
  yearlyDistribution: YearlyStats[];
}

interface AlertStatsProps {
  lang: Language;
  cities: any[];
}

const COLORS = ['#ff334b', '#ff9100', '#00e5ff', '#ffea00', '#00e676', '#9335ee'];

const WEEKDAY_TRANSLATION_KEYS = ['daySun', 'dayMon', 'dayTue', 'dayWed', 'dayThu', 'dayFri', 'daySat'];

export default function AlertStats({ lang, cities }: AlertStatsProps) {
  const [stats, setStats] = useState<StatsData | null>(null);
  const [loading, setLoading] = useState(true);

  // Filter States
  const [category, setCategory] = useState<string>('');
  const [search, setSearch] = useState<string>('');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');

  // Autocomplete Suggestions State
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  useEffect(() => {
    if (!search.trim()) {
      setSuggestions([]);
      return;
    }
    const query = search.trim().toLowerCase();
    const matches = cities.filter(c => {
      const name = c.name ? c.name.toLowerCase() : '';
      const nameEn = c.name_en ? c.name_en.toLowerCase() : '';
      const nameAr = c.name_ar ? c.name_ar.toLowerCase() : '';
      const zone = c.zone ? c.zone.toLowerCase() : '';
      const zoneEn = c.zone_en ? c.zone_en.toLowerCase() : '';
      
      return name.includes(query) || 
             nameEn.includes(query) || 
             nameAr.includes(query) ||
             zone.includes(query) ||
             zoneEn.includes(query);
    });
    setSuggestions(matches.slice(0, 10));
  }, [search, cities]);

  const handleSelectSuggestion = (city: any) => {
    const nameToSet = lang === 'en' ? city.name_en : city.name;
    setSearch(nameToSet);
    setShowSuggestions(false);
  };

  useEffect(() => {
    setLoading(true);
    const params: any = {};
    if (category) params.category = category;
    if (search) params.search = search;
    
    if (startDate) {
      params.startTimestamp = new Date(startDate).getTime();
    }
    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      params.endTimestamp = end.getTime();
    }

    axios.get('/api/alerts/stats', { params })
      .then(res => {
        setStats(res.data);
      })
      .catch(err => {
        console.error('Failed to query statistics summary.', err);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [category, search, startDate, endDate]);

  const handleResetFilters = () => {
    setCategory('');
    setSearch('');
    setStartDate('');
    setEndDate('');
  };

  if (loading && !stats) {
    return (
      <div className="glass-panel" style={{ padding: '40px', textAlign: 'center', color: 'var(--text-secondary)' }}>
        {t('loadingStats', lang)}
      </div>
    );
  }

  if (!stats) return null;

  // Format hourly distribution to human readable times (e.g. 09:00)
  const formattedHourly = stats.hourlyDistribution.map(h => ({
    time: `${String(h.hour).padStart(2, '0')}:00`,
    alerts: h.count
  }));

  // Format weekly distribution short days
  const formattedWeekly = stats.weeklyDistribution.map(w => ({
    dayName: t(WEEKDAY_TRANSLATION_KEYS[w.day], lang),
    alerts: w.count
  }));

  // Localize category labels for the pie chart
  const localizedCategories = stats.categoriesDistribution.map(cat => ({
    ...cat,
    label: translateThreat(cat.category, lang).title
  }));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      
      {/* Filters panel at top */}
      <div 
        style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', 
          gap: '12px', 
          padding: '16px',
          background: 'rgba(255,255,255,0.01)',
          border: '1px solid var(--border-glass)',
          borderRadius: '12px',
          textAlign: (lang === 'he' || lang === 'ar') ? 'right' : 'left'
        }}
        className="glass-panel"
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{t('filterSearchCity', lang)}</label>
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
              onChange={(e) => setSearch(e.target.value)}
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
                {suggestions.map((city) => {
                  const localizedName = lang === 'en' ? city.name_en : city.name;
                  const localizedZone = lang === 'en' ? city.zone_en : translateZone(city.zone, lang);
                  return (
                    <div 
                      key={city.value || city.name} 
                      className="autocomplete-item"
                      onMouseDown={() => handleSelectSuggestion(city)}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        textAlign: (lang === 'he' || lang === 'ar') ? 'right' : 'left',
                        direction: (lang === 'he' || lang === 'ar') ? 'rtl' : 'ltr'
                      }}
                    >
                      <span>{localizedName}</span>
                      {localizedZone && (
                        <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                          {localizedZone}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{t('filterCategory', lang)}</label>
          <select value={category} onChange={(e) => setCategory(e.target.value)} style={{ width: '100%', cursor: 'pointer' }}>
            <option value="">{t('allThreats', lang)}</option>
            <option value="1">{translateThreat(1, lang).title}</option>
            <option value="2">{translateThreat(2, lang).title}</option>
            <option value="3">{translateThreat(3, lang).title}</option>
            <option value="7">{translateThreat(7, lang).title}</option>
            <option value="6">{translateThreat(6, lang).title}</option>
          </select>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{t('filterStartDate', lang)}</label>
          <input 
            type="date" 
            value={startDate} 
            onChange={(e) => setStartDate(e.target.value)}
            style={{ width: '100%' }}
          />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{t('filterEndDate', lang)}</label>
          <input 
            type="date" 
            value={endDate} 
            onChange={(e) => setEndDate(e.target.value)}
            style={{ width: '100%' }}
          />
        </div>

        <div style={{ display: 'flex', alignItems: 'flex-end' }}>
          <button onClick={handleResetFilters} style={{ width: '100%', height: '40px' }}>
            {t('btnClear', lang)}
          </button>
        </div>
      </div>

      {/* Overview Cards Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
        
        {/* Total Stored Card */}
        <div className="glass-panel" style={{ padding: '20px', display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ padding: '12px', background: 'rgba(255, 51, 75, 0.1)', borderRadius: '12px', color: 'var(--accent-red)' }}>
            <BarChart2 size={24} />
          </div>
          <div>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{t('statsTotalStored', lang)}</div>
            <div style={{ fontSize: '1.8rem', fontWeight: 'bold' }}>{stats.totalAlerts.toLocaleString(lang)}</div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '2px' }}>{t('statsSinceDate', lang)}</div>
          </div>
        </div>

        {/* Peak Hour Card */}
        <div className="glass-panel" style={{ padding: '20px', display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ padding: '12px', background: 'rgba(255, 145, 0, 0.1)', borderRadius: '12px', color: 'var(--accent-orange)' }}>
            <TrendingUp size={24} />
          </div>
          <div>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{t('statsPeakHour', lang)}</div>
            <div style={{ fontSize: '1.8rem', fontWeight: 'bold' }}>
              {formattedHourly.length > 0 
                ? [...formattedHourly].sort((a,b) => b.alerts - a.alerts)[0]?.time || 'N/A'
                : 'N/A'
              }
            </div>
          </div>
        </div>

      </div>

      {/* Main Charts Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(380px, 1fr))', gap: '20px' }}>
        
        {/* Categories Distribution Donut */}
        <div className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column' }}>
          <h3 style={{ marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <TrendingUp size={18} />
            {t('statsCategoryTitle', lang)}
          </h3>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '-12px', marginBottom: '16px' }}>
            {lang === 'he' ? 'לחץ על קטע בעוגה לסינון איומים' : (lang === 'ar' ? 'انقر فوق قسم لتصفية التهديدات' : 'Click on a slice to filter category')}
          </p>
          <div style={{ width: '100%', height: '300px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {localizedCategories.length === 0 ? (
              <p style={{ color: 'var(--text-muted)' }}>{t('noCategoryData', lang)}</p>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={localizedCategories}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={90}
                    paddingAngle={3}
                    dataKey="count"
                    nameKey="label"
                    onClick={(data) => {
                      if (data && data.category) {
                        setCategory(String(data.category));
                      }
                    }}
                    style={{ cursor: 'pointer' }}
                  >
                    {localizedCategories.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ background: 'var(--bg-card)', borderColor: 'var(--border-glass)', borderRadius: '8px' }}
                    itemStyle={{ color: 'var(--text-primary)' }}
                    labelStyle={{ color: 'var(--text-primary)' }}
                    formatter={(value: any) => [Number(value).toLocaleString(lang), '']}
                  />
                  <Legend verticalAlign="bottom" height={36} formatter={(value) => <span style={{ color: 'var(--text-primary)', fontSize: '0.82rem' }}>{value}</span>} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Hourly Distribution Line/Bar */}
        <div className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column' }}>
          <h3 style={{ marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <TrendingUp size={18} />
            {t('statsHourlyTitle', lang)}
          </h3>
          <div style={{ width: '100%', height: '300px' }}>
            <ResponsiveContainer>
              <BarChart data={formattedHourly}>
                <XAxis dataKey="time" stroke="var(--text-muted)" fontSize={11} tickLine={false} />
                <YAxis stroke="var(--text-muted)" fontSize={11} tickLine={false} axisLine={false} />
                <Tooltip 
                  contentStyle={{ background: 'var(--bg-card)', borderColor: 'var(--border-glass)', borderRadius: '8px' }} 
                  itemStyle={{ color: 'var(--text-primary)' }}
                  labelStyle={{ color: 'var(--text-primary)' }}
                  cursor={{ fill: 'rgba(255,255,255,0.03)' }}
                  formatter={(value: any) => [Number(value).toLocaleString(lang), '']}
                />
                <Bar dataKey="alerts" name={t('alertsUnit', lang)} fill="var(--accent-red)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Weekly Day Distribution */}
        <div className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column' }}>
          <h3 style={{ marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <BarChart2 size={18} />
            {t('statsWeeklyTitle', lang)}
          </h3>
          <div style={{ width: '100%', height: '300px' }}>
            <ResponsiveContainer>
              <BarChart data={formattedWeekly}>
                <XAxis dataKey="dayName" stroke="var(--text-muted)" fontSize={11} tickLine={false} />
                <YAxis stroke="var(--text-muted)" fontSize={11} tickLine={false} axisLine={false} />
                <Tooltip 
                  contentStyle={{ background: 'var(--bg-card)', borderColor: 'var(--border-glass)', borderRadius: '8px' }} 
                  itemStyle={{ color: 'var(--text-primary)' }}
                  labelStyle={{ color: 'var(--text-primary)' }}
                  cursor={{ fill: 'rgba(255,255,255,0.03)' }}
                  formatter={(value: any) => [Number(value).toLocaleString(lang), '']}
                />
                <Bar dataKey="alerts" name={t('alertsUnit', lang)} fill="var(--accent-orange)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Yearly Trend Area Chart */}
        <div className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column' }}>
          <h3 style={{ marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <TrendingUp size={18} />
            {t('statsYearlyTitle', lang)}
          </h3>
          <div style={{ width: '100%', height: '300px' }}>
            <ResponsiveContainer>
              <AreaChart data={stats.yearlyDistribution}>
                <defs>
                  <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--accent-blue)" stopOpacity={0.4}/>
                    <stop offset="95%" stopColor="var(--accent-blue)" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <XAxis dataKey="year" stroke="var(--text-muted)" fontSize={11} tickLine={false} />
                <YAxis stroke="var(--text-muted)" fontSize={11} tickLine={false} axisLine={false} />
                <Tooltip 
                  contentStyle={{ background: 'var(--bg-card)', borderColor: 'var(--border-glass)', borderRadius: '8px' }} 
                  itemStyle={{ color: 'var(--text-primary)' }}
                  labelStyle={{ color: 'var(--text-primary)' }}
                  formatter={(value: any) => [Number(value).toLocaleString(lang), '']}
                />
                <Area type="monotone" dataKey="count" name={t('alertsUnit', lang)} stroke="var(--accent-blue)" fillOpacity={1} fill="url(#colorCount)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Top Targeted Locations list */}
        <div className="glass-panel" style={{ padding: '24px', gridColumn: 'span 2' }}>
          <h3 style={{ marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Award size={18} />
            {t('statsTopTargetsTitle', lang)}
          </h3>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '-12px', marginBottom: '16px' }}>
            {lang === 'he' ? 'לחץ על שם עיר לסינון המפה והסטטיסטיקות' : (lang === 'ar' ? 'انقر فوق اسم المدينة لتصفية الإحصاءات' : 'Click on a city name to filter statistics')}
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '30px' }}>
            
            {/* Top Cities List */}
            <div>
              <h4 style={{ color: 'var(--text-secondary)', marginBottom: '12px', fontSize: '0.9rem', textTransform: 'uppercase' }}>{t('statsTopCities', lang)}</h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {stats.topCities.slice(0, 5).map((city, idx) => {
                  const translatedName = translateCity(city.city, lang, cities);
                  
                  return (
                    <div 
                      key={city.city} 
                      onClick={() => setSearch(city.city)}
                      style={{ 
                        display: 'flex', 
                        justifyContent: 'space-between', 
                        alignItems: 'center', 
                        padding: '10px 14px', 
                        background: 'rgba(255,255,255,0.02)', 
                        borderRadius: '8px',
                        borderLeft: `3px solid ${COLORS[idx % COLORS.length]}`,
                        cursor: 'pointer'
                      }}
                      title={lang === 'he' ? `סנן לפי ${translatedName}` : `Filter by ${translatedName}`}
                    >
                      <span style={{ fontWeight: '500' }}>{translatedName}</span>
                      <span style={{ fontWeight: 'bold', color: 'var(--accent-red)' }}>{city.count.toLocaleString(lang)} {t('alertsUnit', lang)}</span>
                    </div>
                  );
                })}
                {stats.topCities.length === 0 && <p style={{ color: 'var(--text-muted)' }}>{t('noCitiesLogged', lang)}</p>}
              </div>
            </div>

            {/* Top Zones List */}
            <div>
              <h4 style={{ color: 'var(--text-secondary)', marginBottom: '12px', fontSize: '0.9rem', textTransform: 'uppercase' }}>{t('statsTopZones', lang)}</h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {stats.topZones.map((zone, idx) => {
                  const translatedZoneName = translateZone(zone.zone, lang);
                  
                  return (
                    <div 
                      key={zone.zone} 
                      onClick={() => setSearch(zone.zone)}
                      style={{ 
                        display: 'flex', 
                        justifyContent: 'space-between', 
                        alignItems: 'center', 
                        padding: '10px 14px', 
                        background: 'rgba(255,255,255,0.02)', 
                        borderRadius: '8px',
                        borderLeft: `3px solid ${COLORS[(idx + 3) % COLORS.length]}`,
                        cursor: 'pointer'
                      }}
                      title={lang === 'he' ? `סנן לפי ${translatedZoneName}` : `Filter by ${translatedZoneName}`}
                    >
                      <span style={{ fontWeight: '500' }}>{translatedZoneName}</span>
                      <span style={{ fontWeight: 'bold', color: 'var(--accent-blue)' }}>{zone.count.toLocaleString(lang)} {t('timesUnit', lang)}</span>
                    </div>
                  );
                })}
                {stats.topZones.length === 0 && <p style={{ color: 'var(--text-muted)' }}>{t('noZonesLogged', lang)}</p>}
              </div>
            </div>

          </div>
        </div>

      </div>
    </div>
  );
}
