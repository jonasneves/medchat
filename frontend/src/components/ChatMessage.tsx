import { Bot, User, AlertTriangle } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import type { Message } from '../App';

interface ChatMessageProps {
  message: Message;
}

export default function ChatMessage({ message }: ChatMessageProps) {
  const isUser = message.role === 'user';

  return (
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
                className="max-w-[200px] max-h-[200px] rounded-lg border border-slate-600 object-contain bg-black"
              />
            ))}
          </div>
        )}

        <div className="prose prose-invert prose-sm max-w-none markdown-content">
          {isUser ? (
            <p>{message.content}</p>
          ) : (
            <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeHighlight]}>
              {message.content || '...'}
            </ReactMarkdown>
          )}
        </div>
      </div>
    </div>
  );
}
