import { X } from 'lucide-react';

interface ImageUploadProps {
  images: string[];
  onRemove: (index: number) => void;
  compact?: boolean;
}

export default function ImageUpload({ images, onRemove, compact }: ImageUploadProps) {
  if (images.length === 0) return null;

  return (
    <div className={`flex flex-wrap gap-2 ${compact ? '' : 'p-3 bg-slate-800/50 rounded-lg'}`}>
      {images.map((img, idx) => (
        <div key={idx} className="relative group">
          <img
            src={img}
            alt={`Upload ${idx + 1}`}
            className={`${compact ? 'w-16 h-16' : 'w-24 h-24'} rounded-lg border border-slate-600 object-cover bg-black`}
          />
          <button
            onClick={() => onRemove(idx)}
            className="absolute -top-2 -right-2 p-1 bg-red-500 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <X size={12} className="text-white" />
          </button>
        </div>
      ))}
    </div>
  );
}
