import { useState, useRef, useCallback, useEffect } from 'react';
import { Send, Square, ImagePlus } from 'lucide-react';

const MAX_IMAGE_SIZE = 896; // MedGemma native size

function compressImage(dataUrl: string, maxSize: number): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      let { width, height } = img;

      // Only resize if larger than maxSize
      if (width > maxSize || height > maxSize) {
        const ratio = Math.min(maxSize / width, maxSize / height);
        width = Math.round(width * ratio);
        height = Math.round(height * ratio);
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(img, 0, 0, width, height);

      // Use JPEG for smaller size, quality 0.85 is good balance
      resolve(canvas.toDataURL('image/jpeg', 0.85));
    };
    img.src = dataUrl;
  });
}

interface PromptInputProps {
  onSend: (text: string) => void;
  onImageAdd: (base64: string) => void;
  isGenerating: boolean;
  onStop: () => void;
  disabled?: boolean;
  placeholder?: string;
}

export default function PromptInput({
  onSend,
  onImageAdd,
  isGenerating,
  onStop,
  disabled,
  placeholder = 'Ask about the medical image...',
}: PromptInputProps) {
  const [input, setInput] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        document.activeElement === textareaRef.current ||
        e.ctrlKey || e.metaKey || e.altKey ||
        e.key.length !== 1
      ) return;

      textareaRef.current?.focus();
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim() && !disabled && !isGenerating) {
      onSend(input);
      setInput('');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const processImage = useCallback(async (file: File) => {
    if (!file.type.startsWith('image/')) return;

    const reader = new FileReader();
    reader.onload = async (ev) => {
      const result = ev.target?.result;
      if (typeof result === 'string') {
        const compressed = await compressImage(result, MAX_IMAGE_SIZE);
        onImageAdd(compressed);
      }
    };
    reader.readAsDataURL(file);
  }, [onImageAdd]);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    Array.from(files).forEach(processImage);

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, [processImage]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    Array.from(e.dataTransfer.files).forEach(processImage);
  }, [processImage]);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  return (
    <form
      onSubmit={handleSubmit}
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      className="relative"
    >
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        onChange={handleFileSelect}
        className="hidden"
      />

      <div className="flex items-end gap-2 bg-slate-800/80 backdrop-blur-sm rounded-2xl border border-slate-700 p-2">
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={disabled || isGenerating}
          className="p-2 text-slate-400 hover:text-emerald-400 hover:bg-slate-700/50 rounded-lg transition-colors disabled:opacity-50"
          title="Upload medical image"
        >
          <ImagePlus size={20} />
        </button>

        <textarea
          ref={textareaRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled}
          rows={1}
          className="flex-1 bg-transparent text-white placeholder-slate-500 resize-none outline-none px-2 py-2 max-h-32 min-h-[40px]"
          style={{ height: 'auto' }}
          onInput={(e) => {
            const target = e.target as HTMLTextAreaElement;
            target.style.height = 'auto';
            target.style.height = Math.min(target.scrollHeight, 128) + 'px';
          }}
        />

        {isGenerating ? (
          <button
            type="button"
            onClick={onStop}
            className="p-2 bg-red-500/20 text-red-400 hover:bg-red-500/30 rounded-lg transition-colors"
            title="Stop generation"
          >
            <Square size={20} />
          </button>
        ) : (
          <button
            type="submit"
            disabled={disabled || !input.trim()}
            className="p-2 bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            title="Send message"
          >
            <Send size={20} />
          </button>
        )}
      </div>
    </form>
  );
}
