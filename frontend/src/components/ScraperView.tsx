import React, { useState, useEffect } from 'react';
import type { ScanRecord } from '../types';
import { api } from '../api';
import { Search, Play, Terminal } from 'lucide-react';

interface ScraperViewProps {
  onScanCompleted?: () => void;
}

export const ScraperView: React.FC<ScraperViewProps> = ({ onScanCompleted }) => {
  const [query, setQuery] = useState('Desenvolvedor');
  const [location, setLocation] = useState('Lisboa');
  const [sources, setSources] = useState<string[]>(['netempregos', 'ats']);
  const [limit, setLimit] = useState(25);
  const [scanning, setScanning] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);
  const [history, setHistory] = useState<ScanRecord[]>([]);

  useEffect(() => {
    loadHistory();
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

  const addLog = (msg: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs((prev) => [...prev, `[${timestamp}] ${msg}`]);
  };

  const handleStartScan = async () => {
    if (sources.length === 0) {
      alert('Selecione pelo menos uma fonte para varredura.');
      return;
    }

    setScanning(true);
    setLogs([]);
    addLog(`Iniciando varredura para "${query}" em "${location}"...`);
    addLog(`Fontes selecionadas: ${sources.join(', ')}`);

    try {
      addLog(`Enviando requisição assíncrona ao backend...`);
      const res = await api.triggerScan(sources, query, location, limit);
      addLog(`Status: ${res.message}`);
      
      // Simulate live progress logs
      setTimeout(() => addLog(`[Net-Empregos] Consultando catálogo de anúncios em ${location}...`), 800);
      setTimeout(() => addLog(`[Career-Ops ATS] Verificando boards diretos (Greenhouse, Lever)...`), 1600);
      setTimeout(() => addLog(`[Liveness Engine] Aplicando pré-filtros de duplicados e URLs...`), 2400);
      setTimeout(async () => {
        addLog(`Varredura concluída com sucesso! Atualizando base local.`);
        setScanning(false);
        await loadHistory();
        if (onScanCompleted) onScanCompleted();
      }, 3500);

    } catch (err) {
      addLog(`Erro ao disparar varredura: ${String(err)}`);
      setScanning(false);
    }
  };

  const sourceCards = [
    { id: 'netempregos', label: 'Net-Empregos (Portugal)', desc: 'Maior portal nacional de empregos' },
    { id: 'ats', label: 'Career-Ops ATS Portals', desc: 'Boards diretos: Greenhouse, Lever, Ashby, Workday' },
    { id: 'google', label: 'Google Jobs (APIs)', desc: 'Agregador SerpApi / JSearch' },
    { id: 'jobspy', label: 'JobSpy Engine', desc: 'LinkedIn, Indeed e Glassdoor nativos' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display font-bold text-xl text-txt-primary flex items-center gap-2">
          <Search className="w-5 h-5 text-accent-light" />
          Central de Varreduras Multi-Fonte
        </h2>
        <p className="text-xs text-txt-secondary mt-0.5">
          Agregação simultânea com prevenção de duplicados e cálculo automático de distância geográfica.
        </p>
      </div>

      {/* Control Box */}
      <div className="bg-surface-100 border border-surface-border rounded-xl p-5 space-y-5">
        {/* Source Selection */}
        <div>
          <label className="block text-xs font-semibold text-txt-primary uppercase tracking-wider mb-2">
            Fontes a Monitorar
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

        {/* Inputs */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-medium text-txt-secondary mb-1">Cargo / Termo de Pesquisa</label>
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="ex: Python, DevOps, Full Stack"
              className="w-full bg-surface-200 border border-surface-border rounded-lg px-3 py-1.5 text-sm text-txt-primary focus:outline-none focus:border-accent"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-txt-secondary mb-1">Localização</label>
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="ex: Lisboa, Porto, Remoto"
              className="w-full bg-surface-200 border border-surface-border rounded-lg px-3 py-1.5 text-sm text-txt-primary focus:outline-none focus:border-accent"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-txt-secondary mb-1">Limite por Fonte</label>
            <input
              type="number"
              value={limit}
              onChange={(e) => setLimit(Number(e.target.value))}
              className="w-full bg-surface-200 border border-surface-border rounded-lg px-3 py-1.5 text-sm text-txt-primary focus:outline-none focus:border-accent"
            />
          </div>
        </div>

        {/* Action Button */}
        <div className="flex justify-end pt-2">
          <button
            onClick={handleStartScan}
            disabled={scanning}
            className="px-6 py-2.5 bg-accent hover:bg-accent-hover text-white rounded-lg text-sm font-semibold flex items-center gap-2 shadow-sm transition-colors"
          >
            <Play className={`w-4 h-4 ${scanning ? 'animate-spin' : ''}`} />
            {scanning ? 'Varredura em Execução...' : 'Iniciar Varredura'}
          </button>
        </div>
      </div>

      {/* Live Console Output */}
      {logs.length > 0 && (
        <div className="bg-surface-100 border border-surface-border rounded-xl p-4 space-y-2">
          <div className="flex items-center gap-2 text-xs font-bold text-txt-muted uppercase">
            <Terminal className="w-4 h-4 text-accent-light" />
            Console de Execução
          </div>
          <div className="bg-black/60 rounded-lg p-3 font-mono text-xs text-emerald-400 space-y-1 max-h-48 overflow-y-auto">
            {logs.map((log, idx) => (
              <div key={idx}>{log}</div>
            ))}
          </div>
        </div>
      )}

      {/* Scan History Table */}
      <div className="bg-surface-100 border border-surface-border rounded-xl p-5 space-y-4">
        <h3 className="font-semibold text-sm text-txt-primary uppercase tracking-wider text-xs">
          Histórico de Varreduras
        </h3>

        {history.length === 0 ? (
          <div className="py-6 text-center text-txt-muted text-xs">
            Nenhuma varredura registrada ainda.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-surface-border text-txt-muted uppercase font-medium">
                <tr>
                  <th className="pb-2">Data</th>
                  <th className="pb-2">Fontes</th>
                  <th className="pb-2">Termo</th>
                  <th className="pb-2">Local</th>
                  <th className="pb-2 text-center">Encontradas</th>
                  <th className="pb-2 text-center">Novas</th>
                  <th className="pb-2 text-right">Duração</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-border">
                {history.map((h) => (
                  <tr key={h.id} className="hover:bg-surface-200/40">
                    <td className="py-2.5 text-txt-secondary">{new Date(h.executed_at).toLocaleString()}</td>
                    <td className="py-2.5 font-medium text-txt-primary uppercase text-[11px]">{h.engine}</td>
                    <td className="py-2.5 text-txt-primary">{h.query}</td>
                    <td className="py-2.5 text-txt-secondary">{h.location || '-'}</td>
                    <td className="py-2.5 text-center font-bold text-txt-primary">{h.total_found}</td>
                    <td className="py-2.5 text-center font-bold text-emerald-400">+{h.total_new}</td>
                    <td className="py-2.5 text-right text-txt-muted">{h.duration_seconds ? `${h.duration_seconds}s` : '-'}</td>
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
