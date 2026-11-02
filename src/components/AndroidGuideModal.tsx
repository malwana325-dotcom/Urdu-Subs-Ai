import React, { useState } from 'react';
import { 
  Smartphone, 
  X, 
  Check, 
  Download, 
  ShieldCheck, 
  Cpu, 
  Layers, 
  Wifi, 
  WifiOff, 
  ExternalLink,
  Sparkles,
  Share2,
  FileCode,
  Copy,
  Info
} from 'lucide-react';
import { cn } from '../utils/cn';

interface AndroidGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddNotification?: (msg: string, type: 'success' | 'error') => void;
}

export const AndroidGuideModal: React.FC<AndroidGuideModalProps> = ({
  isOpen,
  onClose,
  onAddNotification
}) => {
  const [activeTab, setActiveTab] = useState<'apk' | 'features' | 'offline'>('apk');
  const [copiedScript, setCopiedScript] = useState<string | null>(null);

  if (!isOpen) return null;

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedScript(label);
    onAddNotification?.(`Copied ${label} to clipboard!`, 'success');
    setTimeout(() => setCopiedScript(null), 2500);
  };

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl shadow-2xl max-w-2xl w-full overflow-hidden text-xs flex flex-col max-h-[92vh]">
        
        {/* Header */}
        <div className="p-4 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50/90 dark:bg-zinc-850/90 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-emerald-600 text-white shadow-xs">
              <Smartphone size={18} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-bold text-sm sm:text-base text-zinc-900 dark:text-zinc-100">
                  Android Mobile App & APK Guide
                </h2>
                <span className="px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/70 text-emerald-700 dark:text-emerald-300 font-mono text-[9px] font-bold border border-emerald-300 dark:border-emerald-800">
                  Capacitor Ready
                </span>
              </div>
              <p className="text-[10px] text-zinc-500 dark:text-zinc-400 mt-0.5">
                Install on your Android phone • 100% Local Editing + Gemini & Google Translate
              </p>
            </div>
          </div>

          <button 
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-zinc-200 dark:border-zinc-800 bg-zinc-100/50 dark:bg-zinc-800/40 p-1 shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab('apk')}
            className={cn(
              "flex-1 py-2 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer",
              activeTab === 'apk' 
                ? "bg-white dark:bg-zinc-900 text-emerald-600 dark:text-emerald-400 shadow-2xs border border-zinc-200/60 dark:border-zinc-700/60" 
                : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200"
            )}
          >
            <Download size={13} />
            <span>How to Build APK</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('offline')}
            className={cn(
              "flex-1 py-2 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer",
              activeTab === 'offline' 
                ? "bg-white dark:bg-zinc-900 text-emerald-600 dark:text-emerald-400 shadow-2xs border border-zinc-200/60 dark:border-zinc-700/60" 
                : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200"
            )}
          >
            <WifiOff size={13} />
            <span>Local & Offline Engine</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('features')}
            className={cn(
              "flex-1 py-2 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer",
              activeTab === 'features' 
                ? "bg-white dark:bg-zinc-900 text-emerald-600 dark:text-emerald-400 shadow-2xs border border-zinc-200/60 dark:border-zinc-700/60" 
                : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200"
            )}
          >
            <Sparkles size={13} />
            <span>Android Phone Features</span>
          </button>
        </div>

        {/* Content Body */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-4 flex-1">
          {activeTab === 'apk' && (
            <div className="space-y-4">
              <div className="p-3.5 bg-emerald-50 dark:bg-emerald-950/30 rounded-2xl border border-emerald-200 dark:border-emerald-800/60 flex items-start gap-3">
                <ShieldCheck size={20} className="text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-bold text-emerald-950 dark:text-emerald-200 text-xs">
                    Ready-Made Android Capacitor Architecture
                  </h4>
                  <p className="text-[11px] text-emerald-800 dark:text-emerald-300/80 leading-relaxed mt-0.5">
                    This project is configured with native Android files (<code className="px-1 py-0.5 bg-emerald-100 dark:bg-emerald-900/60 rounded font-mono">com.urdudubber.app</code>) and an automated cloud build workflow. You can build and install it without installing Android Studio!
                  </p>
                </div>
              </div>

              {/* Method 1: Cloud GitHub Actions */}
              <div className="p-4 bg-zinc-50 dark:bg-zinc-800/40 rounded-2xl border border-zinc-200 dark:border-zinc-700/60 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                    <span className="w-4 h-4 rounded-full bg-emerald-600 text-white flex items-center justify-center text-[9px]">1</span>
                    Recommended: Free Cloud APK Build (GitHub Actions)
                  </span>
                  <span className="text-[9px] px-2 py-0.5 rounded bg-zinc-200 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-300 font-bold">~2 Mins</span>
                </div>
                <ol className="list-decimal list-inside space-y-1.5 text-[11px] text-zinc-600 dark:text-zinc-300 leading-relaxed pl-1">
                  <li>Push this project to your GitHub repository.</li>
                  <li>Click the <strong>Actions</strong> tab in your repository on GitHub.</li>
                  <li>Select <strong>Build Android APK (Capacitor)</strong> workflow.</li>
                  <li>Click <strong>Run workflow</strong> → <strong>Run workflow</strong>.</li>
                  <li>When finished, download the <strong>Urdu-Dubber-Offline-APK</strong> artifact containing your ready-to-install <code className="text-emerald-600 font-mono">app-debug.apk</code>!</li>
                </ol>
              </div>

              {/* Method 2: Local Command Line / Android Studio */}
              <div className="p-4 bg-zinc-50 dark:bg-zinc-800/40 rounded-2xl border border-zinc-200 dark:border-zinc-700/60 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 flex items-center gap-1.5">
                    <span className="w-4 h-4 rounded-full bg-indigo-600 text-white flex items-center justify-center text-[9px]">2</span>
                    Local Build (Using Node.js & Android Studio)
                  </span>
                </div>
                <p className="text-[11px] text-zinc-600 dark:text-zinc-300 leading-relaxed">
                  Run these commands in your project root terminal to build and sync the native Android project:
                </p>

                <div className="bg-zinc-900 rounded-xl p-3 font-mono text-[11px] text-emerald-400 flex items-center justify-between">
                  <span>npm run cap:build</span>
                  <button 
                    type="button" 
                    onClick={() => copyToClipboard('npm run cap:build', 'Capacitor Build Script')}
                    className="p-1 text-zinc-400 hover:text-white cursor-pointer"
                    title="Copy command"
                  >
                    {copiedScript === 'Capacitor Build Script' ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
                  </button>
                </div>

                <p className="text-[10.5px] text-zinc-500 dark:text-zinc-400">
                  Then assemble the APK directly:
                </p>
                <div className="bg-zinc-900 rounded-xl p-3 font-mono text-[11px] text-emerald-400 flex items-center justify-between">
                  <span>cd android && ./gradlew assembleDebug</span>
                  <button 
                    type="button" 
                    onClick={() => copyToClipboard('cd android && ./gradlew assembleDebug', 'Assemble Command')}
                    className="p-1 text-zinc-400 hover:text-white cursor-pointer"
                    title="Copy command"
                  >
                    {copiedScript === 'Assemble Command' ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'offline' && (
            <div className="space-y-4">
              <div className="p-3.5 bg-blue-50 dark:bg-blue-950/30 rounded-2xl border border-blue-200 dark:border-blue-800/60 flex items-start gap-3">
                <WifiOff size={20} className="text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-bold text-blue-950 dark:text-blue-200 text-xs">
                    Local Device Execution (100% Offline Capable)
                  </h4>
                  <p className="text-[11px] text-blue-800 dark:text-blue-300/80 leading-relaxed mt-0.5">
                    Your phone performs all data processing, subtitle manipulation, timing math, and file rendering locally inside the app. No external backend server required!
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-3 bg-zinc-50 dark:bg-zinc-800/50 rounded-xl border border-zinc-200 dark:border-zinc-700/60 space-y-1">
                  <span className="font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5 text-xs">
                    <Check size={14} className="text-emerald-500" />
                    Local Subtitle Parser & Formatter
                  </span>
                  <p className="text-[10.5px] text-zinc-500 dark:text-zinc-400 leading-snug">
                    Parses and outputs SRT, ASS, SSA, WebVTT, YouTube SBV, LRC, and JSON instantly on device.
                  </p>
                </div>

                <div className="p-3 bg-zinc-50 dark:bg-zinc-800/50 rounded-xl border border-zinc-200 dark:border-zinc-700/60 space-y-1">
                  <span className="font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5 text-xs">
                    <Check size={14} className="text-emerald-500" />
                    Local SQLite & IndexedDB Storage
                  </span>
                  <p className="text-[10.5px] text-zinc-500 dark:text-zinc-400 leading-snug">
                    Your subtitle projects, edits, undo history, and styling presets are saved permanently on your phone's storage.
                  </p>
                </div>

                <div className="p-3 bg-zinc-50 dark:bg-zinc-800/50 rounded-xl border border-zinc-200 dark:border-zinc-700/60 space-y-1">
                  <span className="font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5 text-xs">
                    <Check size={14} className="text-emerald-500" />
                    Cinema Typography Studio
                  </span>
                  <p className="text-[10.5px] text-zinc-500 dark:text-zinc-400 leading-snug">
                    Urdu Nastaliq & Gulzar fonts, CapCut-style gradient palettes, drop shadows, and neon glows render entirely offline.
                  </p>
                </div>

                <div className="p-3 bg-zinc-50 dark:bg-zinc-800/50 rounded-xl border border-zinc-200 dark:border-zinc-700/60 space-y-1">
                  <span className="font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5 text-xs">
                    <Wifi size={14} className="text-indigo-500" />
                    Smart Online APIs
                  </span>
                  <p className="text-[10.5px] text-zinc-500 dark:text-zinc-400 leading-snug">
                    When connected to Wi-Fi or mobile data, Gemini AI and Google Translate activate automatically with zero lag.
                  </p>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'features' && (
            <div className="space-y-4">
              <div className="p-3.5 bg-purple-50 dark:bg-purple-950/30 rounded-2xl border border-purple-200 dark:border-purple-800/60 flex items-start gap-3">
                <Smartphone size={20} className="text-purple-600 dark:text-purple-400 shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-bold text-purple-950 dark:text-purple-200 text-xs">
                    Android Phone Native Ergonomics
                  </h4>
                  <p className="text-[11px] text-purple-800 dark:text-purple-300/80 leading-relaxed mt-0.5">
                    Optimized for mobile touchscreens, safe area insets, Android gestures, and media player sharing.
                  </p>
                </div>
              </div>

              <div className="space-y-2.5">
                <div className="p-3 bg-zinc-50 dark:bg-zinc-800/40 rounded-xl border border-zinc-200 dark:border-zinc-700/60 flex items-center gap-3">
                  <div className="p-2 bg-emerald-500/10 text-emerald-600 rounded-lg shrink-0">
                    <Share2 size={16} />
                  </div>
                  <div>
                    <h5 className="font-bold text-zinc-900 dark:text-zinc-100 text-xs">Android System Share Sheet</h5>
                    <p className="text-[10.5px] text-zinc-500 dark:text-zinc-400">
                      Export subtitles directly into WhatsApp, Telegram, Files, Drive, MX Player, or VLC with one tap.
                    </p>
                  </div>
                </div>

                <div className="p-3 bg-zinc-50 dark:bg-zinc-800/40 rounded-xl border border-zinc-200 dark:border-zinc-700/60 flex items-center gap-3">
                  <div className="p-2 bg-indigo-500/10 text-indigo-600 rounded-lg shrink-0">
                    <FileCode size={16} />
                  </div>
                  <div>
                    <h5 className="font-bold text-zinc-900 dark:text-zinc-100 text-xs">MX Player & VLC Mobile ASS Support</h5>
                    <p className="text-[10.5px] text-zinc-500 dark:text-zinc-400">
                      Exports <code className="text-indigo-600 font-mono">.ass</code> files with full color styling and outline borders formatted for Android media players.
                    </p>
                  </div>
                </div>

                <div className="p-3 bg-zinc-50 dark:bg-zinc-800/40 rounded-xl border border-zinc-200 dark:border-zinc-700/60 flex items-center gap-3">
                  <div className="p-2 bg-amber-500/10 text-amber-600 rounded-lg shrink-0">
                    <Layers size={16} />
                  </div>
                  <div>
                    <h5 className="font-bold text-zinc-900 dark:text-zinc-100 text-xs">Safe Area Insets & Touch Targets</h5>
                    <p className="text-[10.5px] text-zinc-500 dark:text-zinc-400">
                      Adapts seamlessly to Android camera notches, punch holes, and bottom gesture navigation bars.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3.5 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50/80 dark:bg-zinc-850/80 flex items-center justify-between shrink-0">
          <span className="text-[10px] text-zinc-500 dark:text-zinc-400 font-mono">
            Package: com.urdudubber.app • Target SDK 34+
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs transition-colors cursor-pointer shadow-xs"
          >
            Got it
          </button>
        </div>
      </div>
    </div>
  );
};
