import React, { useState, useEffect, useRef } from 'react';
import type { ScanRecord } from '../types';
import { api } from '../api';
import { useToast } from '../context/ToastContext';
import { useLanguage } from '../context/LanguageContext';
import { Search, Play, Terminal } from 'lucide-react';

interface ScraperViewProps {
  onScanCompleted?: () => void;
}

export const ScraperView: React.FC<ScraperViewProps> = ({ onScanCompleted }) => {
  const { showToast } = useToast();
  const { t, locale } = useLanguage();
  const [query, setQuery] = useState('Software Engineer');
  const [location, setLocation] = useState('Lisboa');
  const [sources, setSources] = useState<string[]>(['netempregos', 'ats']);
  const [limit, setLimit] = useState(25);
  const [scanning, setScanning] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);
  const [history, setHistory] = useState<ScanRecord[]>([]);
  const pollTimerRef = useRef<number | null>(null);

  useEffect(() => {
    loadHistory();
    return () => {
      if (pollTimerRef.current) {
        window.clearInterval(pollTimerRef.current);
      }
    };
  }, []);

  const loadHistory = async () => {
    try {
      const data = await api.getScanHistory();
      setHistory(data);
    } catch (err) {
      console.error(err);
    }
  };

  const toggleSource = (sourceId: string) => {
    if (sources.includes(sourceId)) {
      if (sources.length > 1) {
        setSources(sources.filter((s) => s !== sourceId));
      }
    } else {
      setSources([...sources, sourceId]);
    }
  };

  const handleStartScan = async () => {
    if (sources.length === 0) {
      showToast(t('scraper.selectOneSource'), 'error');
      return;
    }

    if (pollTimerRef.current) {
      window.clearInterval(pollTimerRef.current);
    }

    setScanning(true);
    setLogs([t('scraper.startingLog', { query, location })]);

    try {
      const res = await api.triggerScan(sources, query, location, limit);
      setLogs((prev) => [...prev, res.message]);

      const scanId = res.scan_id;
      const pollOnce = async () => {
        try {
          const statusRec = await api.getScanStatus(scanId);
          if (statusRec.logs && statusRec.logs.length > 0) {
            setLogs(statusRec.logs);
          }
          if (statusRec.status === 'completed' || statusRec.status === 'failed') {
            if (pollTimerRef.current) {
              window.clearInterval(pollTimerRef.current);
              pollTimerRef.current = null;
            }
            setScanning(false);
            await loadHistory();
            if (statusRec.status === 'completed') {
              showToast(t('scraper.scanDoneToast', { count: statusRec.total_new }), 'success');
              if (onScanCompleted) onScanCompleted();
            } else {
              showToast(statusRec.error_message || t('scraper.scanFailedToast'), 'error');
            }
          }
        } catch (pollErr) {
          console.error('Failed to poll scan status:', pollErr);
        }
      };

      pollTimerRef.current = window.setInterval(pollOnce, 1200);
      setTimeout(pollOnce, 600);
    } catch (err: any) {
      setLogs((prev) => [...prev, `${t('scraper.scanStartError')} ${err.message || String(err)}`]);
      showToast(err.message || t('scraper.scanStartError'), 'error');
      setScanning(false);
    }
  };

  const sourceCards = [
    { id: 'netempregos', label: t('scraper.sourceNetEmpregosLabel'), desc: t('scraper.sourceNetEmpregosDesc') },
    { id: 'ats', label: t('scraper.sourceAtsLabel'), desc: t('scraper.sourceAtsDesc') },
    { id: 'google', label: t('scraper.sourceGoogleLabel'), desc: t('scraper.sourceGoogleDesc') },
    { id: 'jobspy', label: t('scraper.sourceJobSpyLabel'), desc: t('scraper.sourceJobSpyDesc') },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display font-bold text-xl text-txt-primary flex items-center gap-2">
          <Search className="w-5 h-5 text-accent-light" />
          {t('scraper.title')}
        </h2>
        <p className="text-xs text-txt-secondary mt-0.5">
          {t('scraper.subtitle')}
        </p>
      </div>

      {/* Control Box */}
      <div className="bg-surface-100 border border-surface-border rounded-xl p-5 space-y-5">
        <div>
          <label className="block text-xs font-semibold text-txt-primary uppercase tracking-wider mb-2">
            {t('scraper.sourcesLabel')}
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
            {sourceCards.map((src) => {
              const isChecked = sources.includes(src.id);
              return (
                <div
                  key={src.id}
                  onClick={() => toggleSource(src.id)}
                  className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                    isChecked
                      ? 'bg-accent/10 border-accent text-txt-primary'
                      : 'bg-surface-200/50 border-surface-border text-txt-muted hover:border-surface-border/80'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">{src.label}</span>
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => {}}
                      className="accent-accent"
                    />
                  </div>
                  <div className="text-[11px] text-txt-secondary mt-1">{src.desc}</div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-medium text-txt-secondary mb-1">{t('scraper.queryLabel')}</label>
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t('scraper.queryPlaceholder')}
              className="w-full bg-surface-200 border border-surface-border rounded-lg px-3 py-1.5 text-sm text-txt-primary focus:outline-none focus:border-accent"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-txt-secondary mb-1">{t('scraper.locationLabel')}</label>
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder={t('scraper.locationPlaceholder')}
              className="w-full bg-surface-200 border border-surface-border rounded-lg px-3 py-1.5 text-sm text-txt-primary focus:outline-none focus:border-accent"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-txt-secondary mb-1">{t('scraper.limitLabel')}</label>
            <input
              type="number"
              min={1}
              max={100}
              value={limit}
              onChange={(e) => setLimit(Math.max(1, Math.min(100, Number(e.target.value) || 20)))}
              className="w-full bg-surface-200 border border-surface-border rounded-lg px-3 py-1.5 text-sm text-txt-primary focus:outline-none focus:border-accent"
            />
          </div>
        </div>

        <div className="flex justify-end pt-2">
          <button
            type="button"
            onClick={handleStartScan}
            disabled={scanning}
            className="px-6 py-2.5 bg-accent hover:bg-accent-hover disabled:opacity-60 text-white rounded-lg text-sm font-semibold flex items-center gap-2 shadow-sm transition-colors"
          >
            <Play className={`w-4 h-4 ${scanning ? 'animate-spin' : ''}`} />
            {scanning ? t('scraper.scanning') : t('scraper.startScan')}
          </button>
        </div>
      </div>

      {/* Live Console Output */}
      {logs.length > 0 && (
        <div className="bg-surface-100 border border-surface-border rounded-xl p-4 space-y-2">
          <div className="flex items-center gap-2 text-xs font-bold text-txt-muted uppercase">
            <Terminal className="w-4 h-4 text-accent-light" />
            {t('scraper.liveConsole')}
          </div>
          <div className="bg-black/60 rounded-lg p-3 font-mono text-xs text-emerald-400 space-y-1 max-h-52 overflow-y-auto">
            {logs.map((log, idx) => (
              <div key={idx}>{log}</div>
            ))}
          </div>
        </div>
      )}

      {/* Scan History Table */}
      <div className="bg-surface-100 border border-surface-border rounded-xl p-5 space-y-4">
        <h3 className="font-semibold text-xs text-txt-primary uppercase tracking-wider">
          {t('scraper.historyTitle')}
        </h3>

        {history.length === 0 ? (
          <div className="py-6 text-center text-txt-muted text-xs">
            {t('scraper.emptyHistory')}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-start text-xs">
              <thead className="border-b border-surface-border text-txt-muted uppercase font-medium">
                <tr>
                  <th className="pb-2">{t('scraper.colDate')}</th>
                  <th className="pb-2">{t('scraper.colSources')}</th>
                  <th className="pb-2">{t('scraper.colQuery')}</th>
                  <th className="pb-2">{t('scraper.colLocation')}</th>
                  <th className="pb-2 text-center">{t('scraper.colStatus')}</th>
                  <th className="pb-2 text-center">{t('scraper.colFound')}</th>
                  <th className="pb-2 text-center">{t('scraper.colNew')}</th>
                  <th className="pb-2 text-end">{t('scraper.colDuration')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-border">
                {history.map((h) => (
                  <tr key={h.id} className="hover:bg-surface-200/40">
                    <td className="py-2.5 text-txt-secondary">{new Date(h.executed_at).toLocaleString(locale)}</td>
                    <td className="py-2.5 font-medium text-txt-primary uppercase text-[11px]">{h.engine}</td>
                    <td className="py-2.5 text-txt-primary">{h.query}</td>
                    <td className="py-2.5 text-txt-secondary">{h.location || '-'}</td>
                    <td className="py-2.5 text-center">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-semibold uppercase ${
                        h.status === 'completed'
                          ? 'bg-emerald-500/10 text-emerald-400'
                          : h.status === 'failed'
                          ? 'bg-rose-500/10 text-rose-400'
                          : 'bg-amber-500/10 text-amber-400'
                      }`}>
                        {h.status}
                      </span>
                    </td>
                    <td className="py-2.5 text-center font-bold text-txt-primary">{h.total_found}</td>
                    <td className="py-2.5 text-center font-bold text-emerald-400">+{h.total_new}</td>
                    <td className="py-2.5 text-end text-txt-muted">{h.duration_seconds ? `${h.duration_seconds}s` : '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
