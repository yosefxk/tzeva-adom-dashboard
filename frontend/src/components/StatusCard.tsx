import { useEffect, useState } from 'react';
import axios from 'axios';
import { Radio, RefreshCw, AlertTriangle, ShieldCheck } from 'lucide-react';
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
}

export default function StatusCard({ isConnected, lang }: StatusCardProps) {
  const [status, setStatus] = useState<StatusState | null>(null);
  const [loading, setLoading] = useState(false);

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

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 30000); // Poll every 30 seconds
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="glass-panel" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h4 style={{ fontSize: '0.95rem', color: 'var(--text-secondary)' }}>{t('diagnosticsTitle', lang)}</h4>
        <button onClick={fetchStatus} disabled={loading} style={{ padding: '4px 8px', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '4px' }}>
          <RefreshCw size={12} className={loading ? 'spin' : ''} />
          {t('btnCheck', lang)}
        </button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        
        {/* SSE Stream Connection indicator */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.85rem' }}>
          <span>{t('sseStream', lang)}</span>
          <span 
            style={{ 
              color: isConnected ? 'var(--accent-green)' : 'var(--accent-red)',
              fontWeight: '600',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <Radio size={14} className={isConnected ? 'pulse' : ''} />
            {isConnected ? t('statusLive', lang) : t('statusDisconnected', lang)}
          </span>
        </div>

        {/* REST API status */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.85rem' }}>
          <span>{t('apiHandshake', lang)}</span>
          <span 
            style={{ 
              color: status ? 'var(--accent-green)' : 'var(--accent-red)',
              fontWeight: '600',
              display: 'flex',
              alignItems: 'center',
              gap: '4px'
            }}
          >
            {status ? <ShieldCheck size={14} /> : <AlertTriangle size={14} />}
            {status ? t('statusSecure', lang) : t('statusOffline', lang)}
          </span>
        </div>

        {/* REST API Latency */}
        {status && (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
            <span>{t('networkLatency', lang)}</span>
            <span dir="ltr">{status.latency} ms</span>
          </div>
        )}

        {/* Clients Connected */}
        {status && (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
            <span>{t('broadcasterSubs', lang)}</span>
            <span>{status.clientsConnected} {lang === 'ar' ? 'أجهزة' : (lang === 'he' ? 'צמתים' : 'nodes')}</span>
          </div>
        )}

      </div>
    </div>
  );
}
