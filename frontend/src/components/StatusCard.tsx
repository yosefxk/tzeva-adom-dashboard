import { useEffect, useState } from 'react';
import axios from 'axios';
import { Radio, RefreshCw, AlertTriangle, ShieldCheck, Activity, ChevronUp, ChevronDown } from 'lucide-react';
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
  forceExpanded?: boolean;
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
  forceExpanded = false
}: StatusCardProps) {
  const [status, setStatus] = useState<StatusState | null>(null);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const isCurrentlyExpanded = expanded || forceExpanded;

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
    const interval = setInterval(fetchStatus, 30000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="diagnostics-bar">
      {/* Collapsed summary bar — always visible (hidden if forced expanded on mobile) */}
      {!forceExpanded && (
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
      )}

      {/* Expanded diagnostics panel */}
      {isCurrentlyExpanded && (
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

          {/* Action buttons */}
          <div className="diagnostics-actions" style={{ border: 'none', paddingTop: 0 }}>
            <button onClick={fetchStatus} disabled={loading} className="diagnostics-btn">
              <RefreshCw size={12} className={loading ? 'spin' : ''} />
              {t('btnCheck', lang)}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
