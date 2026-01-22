import { useState, useEffect } from 'react';
import { Bot, User, AlertTriangle, X, ChevronDown, ChevronRight, Brain } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import type { Message } from '../App';

interface ChatMessageProps {
  message: Message;
}

export default function ChatMessage({ message }: ChatMessageProps) {
  const isUser = message.role === 'user';
  const [expandedImage, setExpandedImage] = useState<string | null>(null);
  const [showThinking, setShowThinking] = useState(false);

  useEffect(() => {
    if (!expandedImage) return;
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setExpandedImage(null);
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [expandedImage]);

  return (
    <>
      {expandedImage && (
        <div
          className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4"
          onClick={() => setExpandedImage(null)}
        >
          <button
            className="absolute top-4 right-4 text-white/70 hover:text-white p-2"
            onClick={() => setExpandedImage(null)}
          >
            <X size={24} />
          </button>
          <img
            src={expandedImage}
            alt="Expanded medical image"
            className="max-w-full max-h-full object-contain"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}

      <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
        <div
          className={`max-w-[85%] rounded-2xl px-4 py-3 ${
            isUser
              ? 'bg-emerald-600/20 border border-emerald-500/30 text-white rounded-tr-sm'
              : message.error
                ? 'bg-red-500/10 border border-red-500/30 text-red-200 rounded-tl-sm'
                : 'bg-slate-800/60 border border-slate-700/60 text-slate-200 rounded-tl-sm'
          }`}
        >
          <div
            className={`flex items-center gap-2 mb-2 text-[10px] font-bold uppercase tracking-wider ${
              isUser ? 'text-emerald-300 flex-row-reverse' : 'text-slate-400'
            }`}
          >
            {isUser ? <User size={12} /> : <Bot size={12} />}
            {isUser ? 'You' : 'MedGemma'}
            {message.error && <AlertTriangle size={12} className="text-red-400" />}
          </div>

          {message.images && message.images.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-3">
              {message.images.map((img, idx) => (
                <img
                  key={idx}
                  src={img}
                  alt={`Medical image ${idx + 1}`}
                  className="max-w-[200px] max-h-[200px] rounded-lg border border-slate-600 object-contain bg-black cursor-pointer hover:border-emerald-500 transition-colors"
                  onClick={() => setExpandedImage(img)}
                />
              ))}
            </div>
          )}

          {!isUser && message.thinking && (
            <div className="mb-3">
              <button
                onClick={() => setShowThinking(!showThinking)}
                className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-300 transition-colors"
              >
                {showThinking ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                <Brain size={14} />
                <span>Reasoning</span>
              </button>
              {showThinking && (
                <div className="mt-2 p-3 bg-slate-900/50 border border-slate-700/50 rounded-lg text-xs text-slate-400">
                  <div className="prose prose-invert prose-xs max-w-none opacity-80">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {message.thinking}
                    </ReactMarkdown>
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="prose prose-invert prose-sm max-w-none markdown-content">
            {isUser ? (
              <p>{message.content}</p>
            ) : (
              <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeHighlight]}>
                {message.content || (message.thinking ? '' : '...')}
              </ReactMarkdown>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
