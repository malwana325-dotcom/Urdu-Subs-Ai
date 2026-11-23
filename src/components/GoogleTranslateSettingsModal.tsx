import React, { useState, useEffect } from 'react';
import { X, Globe, Loader2 } from 'lucide-react';
import { TranslationSettings } from '../services/translationSettings';
import { InfoPopover } from './InfoPopover';

interface GoogleTranslateSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  googleApiKey: string;
  onUpdateGoogleApiKey: (key: string) => void;
  translationSettings: TranslationSettings;
  onUpdateTranslationSettings: (settings: TranslationSettings) => void;
  googleWorkers: number;
  onUpdateGoogleWorkers: (workers: number) => void;
  googleBatchSize: number;
  onUpdateGoogleBatchSize: (batchSize: number) => void;
  onTestConnection: (overrideKey?: string) => Promise<void> | void;
  testStatus?: 'idle' | 'loading' | 'success' | 'failed';
  onAddLog: (msg: string, type: 'info' | 'success' | 'warning' | 'error') => void;
  onAddNotification: (msg: string, type: 'success' | 'error') => void;
}

const SUPPORTED_SOURCE_LANGUAGES = [
  { code: 'auto', name: 'Auto-Detect' },
  { code: 'en', name: 'English' },
  { code: 'ur', name: 'Urdu' },
  { code: 'hi', name: 'Hindi' },
  { code: 'ar', name: 'Arabic' },
  { code: 'fa', name: 'Persian' },
  { code: 'tr', name: 'Turkish' },
  { code: 'es', name: 'Spanish' },
  { code: 'fr', name: 'French' },
  { code: 'de', name: 'German' },
  { code: 'ja', name: 'Japanese' },
  { code: 'ko', name: 'Korean' },
  { code: 'zh', name: 'Chinese' },
];

const SUPPORTED_TARGET_LANGUAGES = [
  { code: 'ur', name: 'Urdu Script' },
  { code: 'en', name: 'English' },
  { code: 'ur-roman', name: 'Roman Urdu' },
  { code: 'hi', name: 'Hindi' },
  { code: 'ar', name: 'Arabic' },
];

export const GoogleTranslateSettingsModal: React.FC<GoogleTranslateSettingsModalProps> = ({
  isOpen,
  onClose,
  googleApiKey,
  onUpdateGoogleApiKey,
  translationSettings,
  onUpdateTranslationSettings,
  googleWorkers,
  onUpdateGoogleWorkers,
  googleBatchSize,
  onUpdateGoogleBatchSize,
  onTestConnection,
  testStatus = 'idle',
  onAddLog,
  onAddNotification,
}) => {
  const [apiKeyInput, setApiKeyInput] = useState(googleApiKey);
  const [sourceLang, setSourceLang] = useState(translationSettings.sourceLanguage || 'auto');
  const [targetLang, setTargetLang] = useState(translationSettings.targetLanguage || 'ur');
  const [workersInput, setWorkersInput] = useState(googleWorkers || 5);
  const [batchInput, setBatchInput] = useState(googleBatchSize || 20);
  const [preserveHtmlTags, setPreserveHtmlTags] = useState(true);

  useEffect(() => {
    if (isOpen) {
      setApiKeyInput(googleApiKey);
      setSourceLang(translationSettings.sourceLanguage || 'auto');
      setTargetLang(translationSettings.targetLanguage || 'ur');
      setWorkersInput(googleWorkers || 5);
      setBatchInput(googleBatchSize || 20);
    }
  }, [isOpen, googleApiKey, translationSettings.sourceLanguage, translationSettings.targetLanguage, googleWorkers, googleBatchSize]);

  if (!isOpen) return null;

  const handleSave = () => {
    onUpdateGoogleApiKey(apiKeyInput.trim());
    onUpdateGoogleWorkers(Number(workersInput));
    onUpdateGoogleBatchSize(Number(batchInput));
    onUpdateTranslationSettings({
      ...translationSettings,
      sourceLanguage: sourceLang,
      targetLanguage: targetLang,
    });
    onAddLog(`Updated Google Translate: Source=${sourceLang}, Target=${targetLang}, Workers=${workersInput}.`, 'success');
    onAddNotification('Google Translate settings applied', 'success');
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
            <Globe size={15} style={{ color: 'var(--theme-accent)' }} />
            <h2 className="font-semibold text-sm">Google Translate</h2>
            <InfoPopover
              title="Google Translate Settings"
              description="Configure source/target pair, optional Google Cloud Translation key, worker threads, and batch size."
            />
          </div>
          <button type="button" onClick={onClose} className="p-1.5 rounded-lg opacity-60 hover:opacity-100 cursor-pointer">
            <X size={15} />
          </button>
        </div>

        <div className="p-3.5 space-y-3 overflow-y-auto">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 p-2.5 rounded-xl border" style={{ backgroundColor: 'var(--theme-elevated)', borderColor: 'var(--theme-border)' }}>
            <div>
              <label className="text-[10.5px] font-semibold block mb-1">Source</label>
              <select
                value={sourceLang}
                onChange={(e) => setSourceLang(e.target.value)}
                className="w-full p-2 border rounded-lg text-xs"
                style={{ backgroundColor: 'var(--theme-surface)', borderColor: 'var(--theme-border)', color: 'var(--theme-text)' }}
              >
                {SUPPORTED_SOURCE_LANGUAGES.map((sl) => (
                  <option key={sl.code} value={sl.code}>
                    {sl.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-[10.5px] font-semibold block mb-1">Target</label>
              <select
                value={targetLang}
                onChange={(e) => setTargetLang(e.target.value)}
                className="w-full p-2 border rounded-lg text-xs"
                style={{ backgroundColor: 'var(--theme-surface)', borderColor: 'var(--theme-border)', color: 'var(--theme-text)' }}
              >
                {SUPPORTED_TARGET_LANGUAGES.map((tl) => (
                  <option key={tl.code} value={tl.code}>
                    {tl.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="font-semibold text-[11px] block">Cloud API Key (Optional)</label>
            <div className="flex gap-1.5">
              <input
                type="password"
                value={apiKeyInput}
                onChange={(e) => setApiKeyInput(e.target.value)}
                placeholder="AIzaSy... (optional)"
                className="flex-1 p-2 border rounded-lg text-xs"
                style={{ backgroundColor: 'var(--theme-elevated)', borderColor: 'var(--theme-border)', color: 'var(--theme-text)' }}
              />
              <button
                type="button"
                onClick={() => {
                  const trimmed = apiKeyInput.trim();
                  onUpdateGoogleApiKey(trimmed);
                  onTestConnection(trimmed);
                }}
                className="px-3 py-1.5 rounded-lg font-semibold text-[11px] border flex items-center gap-1 cursor-pointer"
                style={
                  testStatus === 'success'
                    ? { backgroundColor: 'var(--theme-accent)', color: '#fff', borderColor: 'transparent' }
                    : { backgroundColor: 'var(--theme-elevated)', borderColor: 'var(--theme-border)' }
                }
              >
                {testStatus === 'loading' && <Loader2 size={12} className="animate-spin" />}
                <span>{testStatus === 'success' ? 'Active' : testStatus === 'failed' ? 'Failed' : 'Verify'}</span>
              </button>
            </div>
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
                  max="50"
                  step="5"
                  value={batchInput}
                  onChange={(e) => setBatchInput(Number(e.target.value))}
                  className="w-full cursor-pointer"
                  style={{ accentColor: 'var(--theme-accent)' }}
                />
              </div>
            </div>

            <label className="flex items-center gap-2 cursor-pointer text-[11px]">
              <input
                type="checkbox"
                checked={preserveHtmlTags}
                onChange={(e) => setPreserveHtmlTags(e.target.checked)}
                className="rounded w-3.5 h-3.5"
                style={{ accentColor: 'var(--theme-accent)' }}
              />
              <span>Preserve styling tags</span>
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
