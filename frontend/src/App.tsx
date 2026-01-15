import { useState, useRef, useEffect, useCallback } from 'react';
import { Stethoscope, AlertTriangle } from 'lucide-react';
import Header from './components/Header';
import ChatMessage from './components/ChatMessage';
import ImageUpload from './components/ImageUpload';
import PromptInput from './components/PromptInput';
import ExampleImages from './components/ExampleImages';
import { streamChat } from './hooks/useChat';

export interface Message {
  role: 'user' | 'assistant';
  content: string;
  images?: string[];
  error?: boolean;
}

export default function App() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [pendingImages, setPendingImages] = useState<string[]>([]);
  const [modelStatus, setModelStatus] = useState<'loading' | 'healthy' | 'error'>('loading');
  const scrollRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const isNearBottomRef = useRef(true);

  const checkIfNearBottom = () => {
    if (!scrollRef.current) return true;
    const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
    return scrollHeight - scrollTop - clientHeight < 100;
  };

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    const handleScroll = () => {
      isNearBottomRef.current = checkIfNearBottom();
    };

    el.addEventListener('scroll', handleScroll);
    return () => el.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    const checkHealth = async () => {
      try {
        const res = await fetch('/api/health');
        if (res.ok) {
          const data = await res.json();
          setModelStatus(data.model_status === 'healthy' ? 'healthy' : 'loading');
        } else {
          setModelStatus('error');
        }
      } catch {
        setModelStatus('error');
      }
    };
    checkHealth();
    const interval = setInterval(checkHealth, 10000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (scrollRef.current && isNearBottomRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = useCallback(async (text: string, images?: string[]) => {
    const imagesToSend = images || pendingImages;
    if (!text.trim() && imagesToSend.length === 0) return;
    if (isGenerating) return;

    const userMessage: Message = {
      role: 'user',
      content: text,
      images: imagesToSend.length > 0 ? [...imagesToSend] : undefined,
    };

    setMessages(prev => [...prev, userMessage]);
    if (!images) setPendingImages([]);
    setIsGenerating(true);
    isNearBottomRef.current = true;

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      let assistantContent = '';
      setMessages(prev => [...prev, { role: 'assistant', content: '' }]);

      await streamChat(
        [...messages, userMessage],
        (chunk) => {
          assistantContent += chunk;
          setMessages(prev => {
            const updated = [...prev];
            updated[updated.length - 1] = { role: 'assistant', content: assistantContent };
            return updated;
          });
        },
        controller.signal
      );
    } catch (err: unknown) {
      if (err instanceof Error && err.name !== 'AbortError') {
        setMessages(prev => {
          const updated = [...prev];
          updated[updated.length - 1] = {
            role: 'assistant',
            content: err instanceof Error ? err.message : 'Request failed',
            error: true,
          };
          return updated;
        });
      }
    } finally {
      setIsGenerating(false);
      abortRef.current = null;
    }
  }, [messages, pendingImages, isGenerating]);

  const handleStop = () => {
    abortRef.current?.abort();
  };

  const handleImageAdd = (base64: string) => {
    setPendingImages(prev => [...prev, base64]);
  };

  const handleImageRemove = (index: number) => {
    setPendingImages(prev => prev.filter((_, i) => i !== index));
  };

  const handleExampleSelect = useCallback((imageBase64: string, prompt: string) => {
    handleSend(prompt, [imageBase64]);
  }, [handleSend]);

  return (
    <div className="h-full flex flex-col bg-slate-900 text-white">
      <Header status={modelStatus} />

      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto px-4 py-6 chat-scroll"
        style={{ paddingBottom: '180px' }}
      >
        <div className="max-w-3xl mx-auto space-y-4">
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6 text-center">
              <div className="relative">
                <div className="absolute inset-0 bg-emerald-500/20 blur-xl rounded-full" />
                <Stethoscope size={72} className="relative text-emerald-400" />
              </div>
              <div className="space-y-2">
                <h2 className="text-xl font-semibold text-slate-200">Medical Image Analysis</h2>
                <p className="text-slate-400 text-sm max-w-md">
                  Upload medical images (X-rays, CT scans, dermatology photos) and ask questions.
                  Powered by MedGemma 1.5 4B.
                </p>
              </div>
              <div className="flex flex-wrap gap-2 justify-center text-xs">
                <span className="px-2 py-1 bg-slate-800 rounded-full text-slate-400">Radiology</span>
                <span className="px-2 py-1 bg-slate-800 rounded-full text-slate-400">Dermatology</span>
                <span className="px-2 py-1 bg-slate-800 rounded-full text-slate-400">Pathology</span>
                <span className="px-2 py-1 bg-slate-800 rounded-full text-slate-400">Ophthalmology</span>
              </div>
              <div className="mt-4 p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg max-w-md">
                <div className="flex items-start gap-2 text-amber-200 text-xs">
                  <AlertTriangle size={14} className="mt-0.5 shrink-0" />
                  <span>
                    For research and educational purposes only.
                    Not for clinical diagnosis or medical advice.
                  </span>
                </div>
              </div>
            </div>
          )}

          {messages.map((msg, idx) => (
            <ChatMessage key={idx} message={msg} />
          ))}
        </div>
      </div>

      <div className="fixed bottom-0 left-0 right-0 bg-gradient-to-t from-slate-900 via-slate-900 to-transparent pt-8 pb-4 px-4">
        <div className="max-w-3xl mx-auto space-y-3">
          {pendingImages.length > 0 && (
            <ImageUpload
              images={pendingImages}
              onRemove={handleImageRemove}
              compact
            />
          )}
          <PromptInput
            onSend={handleSend}
            onImageAdd={handleImageAdd}
            isGenerating={isGenerating}
            onStop={handleStop}
            disabled={modelStatus !== 'healthy'}
            placeholder={modelStatus !== 'healthy' ? 'Connecting to MedGemma...' : 'Ask about the medical image...'}
            examplesButton={
              <ExampleImages
                onSelect={handleExampleSelect}
                disabled={modelStatus !== 'healthy' || isGenerating}
              />
            }
          />
        </div>
      </div>
    </div>
  );
}
