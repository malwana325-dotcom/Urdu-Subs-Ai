import React, { useState, useEffect } from 'react';
import {
  Gauge,
  Zap,
  Activity,
  Clock,
  AlertTriangle,
  Flame,
  CheckCircle2,
  RefreshCw,
  Sliders,
  ChevronDown,
  ChevronUp,
  Database,
} from 'lucide-react';
import { quotaManager, QUOTA_TIERS, QuotaTier, FeasibilityReport } from '../services/quota';
import { InfoPopover } from './InfoPopover';

interface GeminiQuotaDashboardProps {
  isTranslating: boolean;
  subtitlesCount: number;
  untranslatedCount: number;
  geminiBatchSize: number;
  geminiWorkers: number;
  geminiDelay: number;
  hasContext: boolean;
  onUpdateWorkers?: (workers: number) => void;
  onUpdateBatchSize?: (batch: number) => void;
  adaptiveScalingEnabled: boolean;
  onToggleAdaptiveScaling: (enabled: boolean) => void;
  activeAdaptiveInfo?: {
    workers: number;
    delay: number;
    throttled: boolean;
    reason?: string;
  };
}

export const GeminiQuotaDashboard: React.FC<GeminiQuotaDashboardProps> = ({
  isTranslating,
  subtitlesCount,
  untranslatedCount,
  geminiBatchSize,
  geminiWorkers,
  geminiDelay,
  hasContext,
  adaptiveScalingEnabled,
  onToggleAdaptiveScaling,
  activeAdaptiveInfo,
}) => {
  const [stats, setStats] = useState(quotaManager.getUsageStats());
  const [selectedTierId, setSelectedTierId] = useState<string>(stats.tier.id);
  const [customRPM, setCustomRPM] = useState<number>(stats.tier.rpmLimit);
  const [customRPD, setCustomRPD] = useState<number>(stats.tier.rpdLimit);
  const [showDetails, setShowDetails] = useState<boolean>(false);
  const [showTierConfig, setShowTierConfig] = useState<boolean>(false);
  const [feasibility, setFeasibility] = useState<FeasibilityReport | null>(null);

  useEffect(() => {
    const update = () => {
      const currentStats = quotaManager.getUsageStats();
      setStats(currentStats);
      if (subtitlesCount > 0) {
        const dummySubs = Array(untranslatedCount).fill({ text: 'Sample subtitle dialogue text' });
        setFeasibility(quotaManager.analyzeFeasibility(dummySubs, geminiBatchSize, hasContext));
      } else {
        setFeasibility(null);
      }
    };
    update();
    const interval = setInterval(update, 1500);
    return () => clearInterval(interval);
  }, [subtitlesCount, untranslatedCount, geminiBatchSize, hasContext]);

  const handleTierChange = (tierId: 'free' | 'payg' | 'custom') => {
    setSelectedTierId(tierId);
    if (tierId === 'custom') {
      quotaManager.setTier({
        id: 'custom',
        name: 'Custom Tier',
        rpmLimit: customRPM,
        rpdLimit: customRPD,
        tpmLimit: 1000000,
      });
    } else {
      quotaManager.setTier(QUOTA_TIERS[tierId]);
    }
    setStats(quotaManager.getUsageStats());
  };

  const handleSaveCustomTier = () => {
    const customTier: QuotaTier = {
      id: 'custom',
      name: 'Custom Tier',
      rpmLimit: Math.max(1, customRPM),
      rpdLimit: Math.max(10, customRPD),
      tpmLimit: 1000000,
    };
    quotaManager.setTier(customTier);
    setStats(quotaManager.getUsageStats());
    setShowTierConfig(false);
  };

  const etaFormatted = React.useMemo(() => {
    if (!isTranslating || untranslatedCount === 0) return null;
    if (stats.activeRPM > 0) {
      const remainingBatches = Math.ceil(untranslatedCount / geminiBatchSize);
      const totalSec = Math.round((remainingBatches / stats.activeRPM) * 60);
      const mins = Math.floor(totalSec / 60);
      const secs = totalSec % 60;
      return `${mins}m ${secs.toString().padStart(2, '0')}s`;
    }
    return '...';
  }, [isTranslating, untranslatedCount, geminiBatchSize, stats.activeRPM]);

  const quotaColorClass = stats.percentUsedDaily >= 85 ? 'text-red-500' : stats.percentUsedDaily >= 60 ? 'text-amber-500' : 'text-emerald-500';
  const progressBgClass = stats.percentUsedDaily >= 85 ? 'bg-red-500' : stats.percentUsedDaily >= 60 ? 'bg-amber-500' : 'bg-emerald-500';

  return (
    <div
      className="rounded-xl border overflow-hidden text-xs"
      style={{ backgroundColor: 'var(--theme-surface)', borderColor: 'var(--theme-border)', color: 'var(--theme-text)' }}
    >
      {/* Header (touch anywhere on header row to expand/collapse) */}
      <div
        role="button"
        tabIndex={0}
        onClick={() => setShowDetails((s) => !s)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            setShowDetails((s) => !s);
          }
        }}
        className="px-3 py-2 border-b flex items-center justify-between gap-2 cursor-pointer select-none"
        style={{ backgroundColor: 'var(--theme-elevated)', borderColor: 'var(--theme-border)' }}
      >
        <div className="flex items-center gap-2 min-w-0">
          <Gauge size={14} style={{ color: 'var(--theme-accent)' }} />
          <span className="font-semibold truncate">Quota & Rate</span>
          <span className="text-[10px] font-mono opacity-65 tabular-nums truncate">
            {stats.tier.rpmLimit} RPM
          </span>
          <span onClick={(e) => e.stopPropagation()} className="inline-flex">
            <InfoPopover
              title="Gemini Quota & Rate Analytics"
              description="Tracks requests/min (RPM), tokens/min (TPM), daily API budget, adaptive worker throttling, and estimated time remaining."
            />
          </span>
        </div>

        <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
          <button
            type="button"
            onClick={() => setShowTierConfig(!showTierConfig)}
            className="h-7 px-2 rounded-lg border text-[10.5px] font-medium flex items-center gap-1 cursor-pointer"
            style={{ backgroundColor: 'var(--theme-surface)', borderColor: 'var(--theme-border)' }}
          >
            <Sliders size={11} />
            <span>Tier</span>
          </button>
          <button
            type="button"
            onClick={() => setShowDetails(!showDetails)}
            className="h-7 w-7 rounded-lg border flex items-center justify-center cursor-pointer"
            style={{ backgroundColor: 'var(--theme-surface)', borderColor: 'var(--theme-border)' }}
          >
            {showDetails ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
          </button>
        </div>
      </div>

      {/* Tier Selector */}
      {showTierConfig && (
        <div className="p-3 border-b space-y-2" style={{ backgroundColor: 'var(--theme-elevated)', borderColor: 'var(--theme-border)' }}>
          <div className="grid grid-cols-3 gap-1.5">
            {[
              { id: 'free' as const, label: 'Free', sub: '15 RPM' },
              { id: 'payg' as const, label: 'Pay-Go', sub: '360 RPM' },
              { id: 'custom' as const, label: 'Custom', sub: `${customRPM} RPM` },
            ].map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => handleTierChange(t.id)}
                className="p-2 rounded-lg text-left border cursor-pointer"
                style={
                  selectedTierId === t.id
                    ? { backgroundColor: 'var(--theme-accent)', color: '#fff', borderColor: 'transparent' }
                    : { backgroundColor: 'var(--theme-surface)', borderColor: 'var(--theme-border)' }
                }
              >
                <div className="text-[10.5px] font-semibold">{t.label}</div>
                <div className="text-[9.5px] opacity-80 font-mono tabular-nums">{t.sub}</div>
              </button>
            ))}
          </div>

          {selectedTierId === 'custom' && (
            <div className="grid grid-cols-2 gap-2 pt-1">
              <div>
                <label className="text-[9.5px] font-semibold opacity-70 block mb-0.5">RPM</label>
                <input
                  type="number"
                  min="1"
                  max="1000"
                  value={customRPM}
                  onChange={(e) => setCustomRPM(Number(e.target.value))}
                  className="w-full p-1.5 rounded-lg border text-xs font-mono"
                  style={{ backgroundColor: 'var(--theme-surface)', borderColor: 'var(--theme-border)' }}
                />
              </div>
              <div>
                <label className="text-[9.5px] font-semibold opacity-70 block mb-0.5">Daily RPD</label>
                <input
                  type="number"
                  min="10"
                  max="100000"
                  value={customRPD}
                  onChange={(e) => setCustomRPD(Number(e.target.value))}
                  className="w-full p-1.5 rounded-lg border text-xs font-mono"
                  style={{ backgroundColor: 'var(--theme-surface)', borderColor: 'var(--theme-border)' }}
                />
              </div>
              <div className="col-span-2 flex justify-end">
                <button
                  type="button"
                  onClick={handleSaveCustomTier}
                  className="px-3 py-1 text-white rounded-lg text-[10.5px] font-semibold cursor-pointer"
                  style={{ backgroundColor: 'var(--theme-accent)' }}
                >
                  Save Tier
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Metrics */}
      <div className="p-3 space-y-2.5">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <div className="p-2 rounded-lg border" style={{ backgroundColor: 'var(--theme-elevated)', borderColor: 'var(--theme-border)' }}>
            <div className="flex items-center justify-between text-[9.5px] opacity-65 mb-0.5">
              <span>Rate</span>
              <Activity size={11} style={stats.activeRPM > 0 ? { color: 'var(--theme-accent)' } : undefined} />
            </div>
            <div className="text-sm font-bold font-mono tabular-nums">
              {stats.activeRPM} <span className="text-[9.5px] font-normal opacity-60">/ {stats.tier.rpmLimit}</span>
            </div>
          </div>

          <div className="p-2 rounded-lg border" style={{ backgroundColor: 'var(--theme-elevated)', borderColor: 'var(--theme-border)' }}>
            <div className="flex items-center justify-between text-[9.5px] opacity-65 mb-0.5">
              <span>TPM</span>
              <Flame size={11} />
            </div>
            <div className="text-sm font-bold font-mono tabular-nums">{stats.activeTPM.toLocaleString()}</div>
          </div>

          <div className="p-2 rounded-lg border" style={{ backgroundColor: 'var(--theme-elevated)', borderColor: 'var(--theme-border)' }}>
            <div className="flex items-center justify-between text-[9.5px] opacity-65 mb-0.5">
              <span>Daily</span>
              <Database size={11} className={quotaColorClass} />
            </div>
            <div className={`text-sm font-bold font-mono tabular-nums ${quotaColorClass}`}>
              {stats.requestsToday} <span className="text-[9.5px] font-normal opacity-60">/ {stats.tier.rpdLimit}</span>
            </div>
          </div>

          <div className="p-2 rounded-lg border" style={{ backgroundColor: 'var(--theme-elevated)', borderColor: 'var(--theme-border)' }}>
            <div className="flex items-center justify-between text-[9.5px] opacity-65 mb-0.5">
              <span>ETA</span>
              <Clock size={11} style={{ color: 'var(--theme-accent)' }} />
            </div>
            <div className="text-sm font-bold font-mono tabular-nums" style={{ color: 'var(--theme-accent)' }}>
              {etaFormatted || (feasibility ? `~${Math.ceil(feasibility.estimatedDurationSec / 60)}m` : '--')}
            </div>
          </div>
        </div>

        {/* Quota Progress */}
        <div>
          <div className="flex items-center justify-between text-[10px] mb-1">
            <span className="font-mono tabular-nums">
              Daily: <strong className={quotaColorClass}>{stats.percentUsedDaily}%</strong>
            </span>
            <button
              type="button"
              onClick={() => {
                quotaManager.resetTodayUsage();
                setStats(quotaManager.getUsageStats());
              }}
              className="opacity-65 hover:opacity-100 flex items-center gap-0.5 text-[10px] cursor-pointer"
            >
              <RefreshCw size={9} />
              <span>Reset</span>
            </button>
          </div>
          <div className="h-1.5 w-full rounded-full overflow-hidden" style={{ backgroundColor: 'var(--theme-elevated)' }}>
            <div className={`h-full rounded-full ${progressBgClass}`} style={{ width: `${Math.max(2, Math.min(100, stats.percentUsedDaily))}%` }} />
          </div>
        </div>

        {showDetails && (
          <div className="space-y-2 pt-1">
            <div className="p-2.5 rounded-lg border flex items-center justify-between gap-2" style={{ backgroundColor: 'var(--theme-elevated)', borderColor: 'var(--theme-border)' }}>
              <div className="flex items-center gap-2 min-w-0">
                <Zap size={13} className="text-amber-500 shrink-0" />
                <div className="min-w-0">
                  <div className="font-semibold text-[11px] truncate">Adaptive Throttling</div>
                  <div className="text-[10px] opacity-65 font-mono truncate tabular-nums">
                    {adaptiveScalingEnabled
                      ? `${activeAdaptiveInfo?.workers || geminiWorkers}w · ${activeAdaptiveInfo?.delay || geminiDelay}ms`
                      : 'Fixed'}
                  </div>
                </div>
              </div>
              <input
                type="checkbox"
                checked={adaptiveScalingEnabled}
                onChange={(e) => onToggleAdaptiveScaling(e.target.checked)}
                className="w-4 h-4 rounded cursor-pointer"
                style={{ accentColor: 'var(--theme-accent)' }}
              />
            </div>

            {feasibility && (
              <div className="p-2.5 rounded-lg border flex items-start gap-2" style={{ backgroundColor: 'var(--theme-elevated)', borderColor: 'var(--theme-border)' }}>
                {feasibility.status === 'passed' ? (
                  <CheckCircle2 size={14} className="text-emerald-500 shrink-0 mt-0.5" />
                ) : (
                  <AlertTriangle size={14} className="text-amber-500 shrink-0 mt-0.5" />
                )}
                <div className="flex-1 min-w-0 text-[10.5px] font-mono tabular-nums">
                  <span>{feasibility.itemsToTranslate} lines · ~{feasibility.estimatedRequests} calls · ~{Math.ceil(feasibility.estimatedDurationSec / 60)}m</span>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
