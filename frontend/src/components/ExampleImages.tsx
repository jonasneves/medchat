import { useState, useEffect } from 'react';
import { ChevronDown, ChevronUp, ImageIcon, ExternalLink } from 'lucide-react';

interface Example {
  id: string;
  name: string;
  category: string;
  image: string;
  description: string;
}

interface ExampleConfig {
  sources: Array<{ name: string; url: string; license: string }>;
  examples: Example[];
  prompts: Record<string, string>;
}

interface ExampleImagesProps {
  onSelect: (imageBase64: string, prompt: string) => void;
  disabled?: boolean;
}

export default function ExampleImages({ onSelect, disabled }: ExampleImagesProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState<string | null>(null);
  const [config, setConfig] = useState<ExampleConfig | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/examples/config.json')
      .then(res => res.json())
      .then(setConfig)
      .catch(() => setError('Failed to load examples'));
  }, []);

  const handleSelect = async (example: Example) => {
    if (disabled || loading || !config) return;

    setLoading(example.id);
    try {
      const response = await fetch(example.image);
      if (!response.ok) throw new Error('Image not found');

      const blob = await response.blob();
      const reader = new FileReader();

      reader.onload = () => {
        const base64 = reader.result as string;
        const prompt = config.prompts[example.category] || 'Analyze this medical image.';
        onSelect(base64, prompt);
        setIsOpen(false);
      };
      reader.readAsDataURL(blob);
    } catch (err) {
      console.error('Failed to load example image:', err);
      setError('Image not available. Download from source dataset.');
    } finally {
      setLoading(null);
    }
  };

  if (!config || config.examples.length === 0) {
    return null;
  }

  const categories = [...new Set(config.examples.map(e => e.category))];

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        disabled={disabled}
        className="flex items-center gap-2 px-3 py-2 text-xs text-slate-400 hover:text-slate-200
                   bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors disabled:opacity-50"
      >
        <ImageIcon size={14} />
        <span>Examples</span>
        {isOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
      </button>

      {isOpen && (
        <div className="absolute bottom-full left-0 mb-2 w-80 bg-slate-800 border border-slate-700
                        rounded-lg shadow-xl z-50 max-h-[70vh] overflow-y-auto">
          {error && (
            <div className="p-3 text-xs text-amber-400 bg-amber-500/10 border-b border-slate-700">
              {error}
            </div>
          )}

          {categories.map(category => (
            <div key={category} className="p-3 border-b border-slate-700 last:border-0">
              <div className="text-xs font-medium text-emerald-400 mb-2">
                {category}
              </div>
              <div className="grid grid-cols-3 gap-2">
                {config.examples.filter(e => e.category === category).map(example => (
                  <button
                    key={example.id}
                    onClick={() => handleSelect(example)}
                    disabled={loading !== null}
                    title={example.description}
                    className="group relative aspect-square bg-slate-900 rounded-lg overflow-hidden
                               hover:ring-2 hover:ring-emerald-500 transition-all"
                  >
                    <img
                      src={example.image}
                      alt={example.name}
                      className="w-full h-full object-cover opacity-70 group-hover:opacity-100 transition-opacity"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.style.display = 'none';
                        target.parentElement!.classList.add('flex', 'items-center', 'justify-center');
                        const placeholder = document.createElement('span');
                        placeholder.className = 'text-[10px] text-slate-500 text-center px-1';
                        placeholder.textContent = 'Not loaded';
                        target.parentElement!.appendChild(placeholder);
                      }}
                    />
                    {loading === example.id && (
                      <div className="absolute inset-0 bg-slate-900/80 flex items-center justify-center">
                        <div className="w-5 h-5 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
                      </div>
                    )}
                    <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-slate-900 via-slate-900/80 to-transparent p-1.5">
                      <p className="text-[10px] text-slate-200 truncate font-medium">{example.name}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          ))}

          {config.sources.length > 0 && (
            <div className="p-3 bg-slate-900/50">
              <p className="text-[10px] text-slate-500 mb-2">Data sources:</p>
              {config.sources.map((source, i) => (
                <a
                  key={i}
                  href={source.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-[10px] text-slate-400 hover:text-emerald-400"
                >
                  <ExternalLink size={10} />
                  <span>{source.name}</span>
                  <span className="text-slate-600">({source.license})</span>
                </a>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
