import React, { useState, useEffect } from 'react';
import { X, Cpu, Loader2 } from 'lucide-react';
import { cn } from '../utils/cn';
import { InfoPopover } from './InfoPopover';

interface AiConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedModel: string;
  onUpdateModel: (model: string) => void;
  onConnectGemini: (overrideModel?: string) => Promise<boolean | void>;
  connectStatus: 'idle' | 'loading' | 'success' | 'failed';
  isGeminiConnected: boolean;
  geminiWorkers: number;
  onUpdateWorkers: (workers: number) => void;
  geminiBatchSize: number;
  onUpdateBatchSize: (batchSize: number) => void;
  geminiDelay: number;
  onUpdateDelay: (delay: number) => void;
  adaptiveScalingEnabled: boolean;
  onToggleAdaptiveScaling: (enabled: boolean) => void;
  onAddLog: (msg: string, type: 'info' | 'success' | 'warning' | 'error') => void;
  onAddNotification: (msg: string, type: 'success' | 'error') => void;
}

const GEMINI_MODELS = [
  { id: 'gemini-4-hydrogen', name: 'Gemini 4 Hydrogen / Flash' },
  { id: 'gemini-3.1-flash-lite', name: 'Gemini 3.1 Flash Lite' },
  { id: 'gemini-4-neon', name: 'Gemini 4 Neon / Pro' },
  { id: 'gemini-4-carbon', name: 'Gemini 4 Carbon' },
  { id: 'gemini-3.1-pro-preview', name: 'Gemini 3.1 Pro Preview' },
];

export const AiConfigModal: React.FC<AiConfigModalProps> = ({
  isOpen,
  onClose,
  selectedModel,
  onUpdateModel,
  onConnectGemini,
  connectStatus,
  isGeminiConnected,
  geminiWorkers,
  onUpdateWorkers,
  geminiBatchSize,
  onUpdateBatchSize,
  geminiDelay,
  onUpdateDelay,
  adaptiveScalingEnabled,
  onToggleAdaptiveScaling,
  onAddLog,
  onAddNotification,
}) => {
  const [modelInput, setModelInput] = useState(selectedModel);
  const [workersInput, setWorkersInput] = useState(geminiWorkers);
  const [batchInput, setBatchInput] = useState(geminiBatchSize);
  const [delayInput, setDelayInput] = useState(geminiDelay);
  const [adaptiveInput, setAdaptiveInput] = useState(adaptiveScalingEnabled);

  useEffect(() => {
    if (isOpen) {
      setModelInput(selectedModel);
      setWorkersInput(geminiWorkers);
      setBatchInput(geminiBatchSize);
      setDelayInput(geminiDelay);
      setAdaptiveInput(adaptiveScalingEnabled);
    }
  }, [isOpen, selectedModel, geminiWorkers, geminiBatchSize, geminiDelay, adaptiveScalingEnabled]);

  if (!isOpen) return null;

  const handleSave = async () => {
    onUpdateModel(modelInput);
    onUpdateWorkers(workersInput);
    onUpdateBatchSize(batchInput);
    onUpdateDelay(delayInput);
    onToggleAdaptiveScaling(adaptiveInput);
    onAddLog(`Updated AI Config: Model=${modelInput}, Workers=${workersInput}, Batch=${batchInput}.`, 'success');
    onAddNotification('AI configuration saved', 'success');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[115] flex items-center justify-center p-3 bg-black/75 backdrop-blur-sm">
      <div
        className="border rounded-xl shadow-2xl max-w-[calc(100vw-24px)] sm:max-w-lg w-full max-h-[calc(100dvh-24px)] overflow-hidden text-xs flex flex-col"
        style={{ backgroundColor: 'var(--theme-surface)', borderColor: 'var(--theme-border)', color: 'var(--theme-text)' }}
      >
        <div
          className="px-3.5 py-2.5 border-b flex items-center justify-between shrink-0"
          style={{ backgroundColor: 'var(--theme-elevated)', borderColor: 'var(--theme-border)' }}
        >
          <div className="flex items-center gap-2">
            <Cpu size={15} style={{ color: 'var(--theme-accent)' }} />
            <h2 className="font-semibold text-sm">AI Configuration</h2>
            <InfoPopover
              title="Gemini Engine Configuration"
              description="Select Gemini foundation model, verify API key connection, and adjust worker concurrency, batch size, and adaptive rate throttling."
            />
          </div>
          <button type="button" onClick={onClose} className="p-1.5 rounded-lg opacity-60 hover:opacity-100 cursor-pointer">
            <X size={15} />
          </button>
        </div>

        <div className="p-3.5 space-y-3 overflow-y-auto">
          <div className="space-y-1.5">
            <label className="font-semibold text-[11px] block">Model</label>
            <div className="space-y-1">
              {GEMINI_MODELS.map((m) => (
                <label
                  key={m.id}
                  className="flex items-center gap-2.5 p-2 rounded-lg border cursor-pointer"
                  style={{
                    backgroundColor: modelInput === m.id ? 'color-mix(in srgb, var(--theme-accent) 10%, var(--theme-surface))' : 'var(--theme-elevated)',
                    borderColor: modelInput === m.id ? 'var(--theme-accent)' : 'var(--theme-border)',
                  }}
                >
                  <input
                    type="radio"
                    name="modelSelection"
                    checked={modelInput === m.id}
                    onChange={() => setModelInput(m.id)}
                    style={{ accentColor: 'var(--theme-accent)' }}
                  />
                  <span className="font-semibold text-[11px]">{m.name}</span>
                </label>
              ))}
            </div>
          </div>

          <div
            className="p-2.5 rounded-xl border flex items-center justify-between gap-2"
            style={{ backgroundColor: 'var(--theme-elevated)', borderColor: 'var(--theme-border)' }}
          >
            <div className="flex items-center gap-2 text-[11px] font-semibold">
              <span className={cn('w-2 h-2 rounded-full', isGeminiConnected ? 'bg-emerald-500' : 'bg-zinc-400')} />
              <span>{isGeminiConnected ? 'Gemini Connected' : 'Disconnected'}</span>
            </div>
            <button
              type="button"
              onClick={() => {
                onUpdateModel(modelInput);
                onConnectGemini(modelInput);
              }}
              className="px-3 py-1.5 rounded-lg font-semibold text-[11px] text-white flex items-center gap-1 cursor-pointer"
              style={{ backgroundColor: 'var(--theme-accent)' }}
            >
              {connectStatus === 'loading' && <Loader2 size={12} className="animate-spin" />}
              <span>{connectStatus === 'success' ? 'Connected' : isGeminiConnected ? 'Reconnect' : 'Connect'}</span>
            </button>
          </div>

          <div className="p-2.5 rounded-xl border space-y-2.5" style={{ backgroundColor: 'var(--theme-elevated)', borderColor: 'var(--theme-border)' }}>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[10.5px] font-semibold block mb-1 tabular-nums">Workers: {workersInput}</label>
                <input
                  type="range"
                  min="1"
                  max="10"
                  value={workersInput}
                  onChange={(e) => setWorkersInput(Number(e.target.value))}
                  className="w-full cursor-pointer"
                  style={{ accentColor: 'var(--theme-accent)' }}
                />
              </div>
              <div>
                <label className="text-[10.5px] font-semibold block mb-1 tabular-nums">Batch: {batchInput}</label>
                <input
                  type="range"
                  min="5"
                  max="30"
                  step="5"
                  value={batchInput}
                  onChange={(e) => setBatchInput(Number(e.target.value))}
                  className="w-full cursor-pointer"
                  style={{ accentColor: 'var(--theme-accent)' }}
                />
              </div>
            </div>

            <label className="flex items-center justify-between pt-1.5 border-t cursor-pointer" style={{ borderColor: 'var(--theme-border)' }}>
              <span className="font-semibold text-[11px]">Adaptive Auto-Throttling</span>
              <input
                type="checkbox"
                checked={adaptiveInput}
                onChange={(e) => setAdaptiveInput(e.target.checked)}
                className="w-4 h-4 rounded cursor-pointer"
                style={{ accentColor: 'var(--theme-accent)' }}
              />
            </label>
          </div>
        </div>

        <div
          className="px-3.5 py-2.5 border-t flex items-center justify-end gap-2 shrink-0"
          style={{ backgroundColor: 'var(--theme-elevated)', borderColor: 'var(--theme-border)' }}
        >
          <button
            type="button"
            onClick={onClose}
            className="px-3.5 py-1.5 rounded-lg border font-medium cursor-pointer"
            style={{ backgroundColor: 'var(--theme-surface)', borderColor: 'var(--theme-border)' }}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="px-4 py-1.5 text-white rounded-lg font-semibold cursor-pointer"
            style={{ backgroundColor: 'var(--theme-accent)' }}
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
};
