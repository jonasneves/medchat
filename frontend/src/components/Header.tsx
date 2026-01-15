import { Stethoscope } from 'lucide-react';

interface HeaderProps {
  status: 'loading' | 'healthy' | 'error';
}

export default function Header({ status }: HeaderProps) {
  const statusColor = {
    loading: 'bg-amber-500',
    healthy: 'bg-emerald-500',
    error: 'bg-red-500',
  }[status];

  const statusText = {
    loading: 'Connecting...',
    healthy: 'MedGemma 1.5 4B',
    error: 'Offline',
  }[status];

  return (
    <header className="sticky top-0 z-50 bg-slate-900/80 backdrop-blur-sm border-b border-slate-800">
      <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-emerald-500/10 rounded-lg">
            <Stethoscope size={20} className="text-emerald-400" />
          </div>
          <div>
            <h1 className="text-lg font-semibold text-white">MedChat</h1>
            <p className="text-xs text-slate-400">Medical AI Assistant</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${statusColor} ${status === 'loading' ? 'animate-pulse' : ''}`} />
          <span className="text-xs text-slate-400">{statusText}</span>
        </div>
      </div>
    </header>
  );
}
