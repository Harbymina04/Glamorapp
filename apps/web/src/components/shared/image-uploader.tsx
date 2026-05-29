'use client';

import { useRef, useState, useCallback, useEffect } from 'react';
import { Upload, X, ImageIcon, Loader2 } from 'lucide-react';

export interface ProductImage {
  id: string;
  url: string;
  filename: string;
  sortOrder: number;
}

interface ImageUploaderProps {
  images: ProductImage[];
  onUpload: (files: File[]) => Promise<ProductImage[]>;
  onRemove: (imageId: string) => Promise<void>;
  onImagesChange?: (images: ProductImage[]) => void;
  disabled?: boolean;
}

export function ImageUploader({ images, onUpload, onRemove, onImagesChange, disabled }: ImageUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [internalImages, setInternalImages] = useState<ProductImage[]>(images);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState('');
  const [removingId, setRemovingId] = useState<string | null>(null);

  // Sync internal state when parent images prop changes
  useEffect(() => {
    setInternalImages(images);
  }, [images]);

  const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3001';

  const getImageUrl = (url: string) => {
    if (url.startsWith('http')) return url;
    return `${API_BASE}${url}`;
  };

  const handleFiles = useCallback(async (fileList: FileList | File[]) => {
    const imageFiles = Array.from(fileList).filter(f => f.type.startsWith('image/'));
    if (imageFiles.length === 0) {
      setError('Solo se permiten archivos de imagen');
      return;
    }
    if (internalImages.length + imageFiles.length > 10) {
      setError('Máximo 10 imágenes por producto');
      return;
    }
    setError('');
    setUploading(true);
    try {
      const newImages = await onUpload(imageFiles);
      // Update internal state IMMEDIATELY for instant preview
      setInternalImages(prev => {
        const updated = [...prev, ...newImages];
        // Also notify parent
        onImagesChange?.(updated);
        return updated;
      });
    } catch (e: any) {
      setError(e.message || 'Error al subir imágenes');
    } finally {
      setUploading(false);
    }
  }, [internalImages, onUpload, onImagesChange]);

  const handleRemove = async (imageId: string) => {
    setRemovingId(imageId);
    try {
      await onRemove(imageId);
    } catch (e: any) {
      setError(e.message || 'Error al eliminar imagen');
    } finally {
      setRemovingId(null);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  };
  const handleDragLeave = () => setDragOver(false);
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files) handleFiles(e.dataTransfer.files);
  };

  const sortedImages = [...internalImages].sort((a, b) => a.sortOrder - b.sortOrder);

  return (
    <div className="space-y-3">
      <label className="block text-sm font-medium text-foreground mb-1.5">
        Imágenes del producto
        <span className="text-muted-foreground font-normal ml-1">({internalImages.length}/10)</span>
      </label>

      {/* Image grid */}
      {sortedImages.length > 0 && (
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
          {sortedImages.map((img, idx) => (
            <div
              key={img.id}
              className="relative group aspect-square rounded-lg overflow-hidden border border-border-primary bg-surface-hover"
            >
              <img
                src={getImageUrl(img.url)}
                alt={img.filename}
                className="w-full h-full object-cover"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="%23999" stroke-width="1.5"><rect width="24" height="24" rx="4" fill="%23f3f4f6"/><circle cx="12" cy="12" r="3"/><path d="M3 21l5-5 3 3 5-5 5 5"/></svg>';
                }}
              />
              {/* Overlay with delete button */}
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100">
                <button
                  type="button"
                  onClick={() => handleRemove(img.id)}
                  disabled={disabled || removingId === img.id}
                  className="p-1.5 rounded-full bg-white/90 text-red-600 hover:bg-white transition"
                  title="Eliminar"
                >
                  {removingId === img.id ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <X className="w-4 h-4" />
                  )}
                </button>
              </div>
              {/* Sort order badge */}
              <span className="absolute bottom-1 right-1 text-[10px] bg-black/60 text-white px-1.5 py-0.5 rounded">
                {idx + 1}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Upload area */}
      <div
        onClick={() => !disabled && !uploading && inputRef.current?.click()}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`
          relative border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition
          ${dragOver
            ? 'border-glamor-primary bg-glamor-primary/5'
            : 'border-border-primary hover:border-glamor-primary/40 hover:bg-surface-hover'
          }
          ${disabled || uploading ? 'opacity-50 cursor-not-allowed' : ''}
        `}
      >
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(e) => e.target.files && handleFiles(e.target.files)}
          disabled={disabled || uploading}
        />
        {uploading ? (
          <div className="flex flex-col items-center gap-2">
            <Loader2 className="w-8 h-8 text-glamor-primary animate-spin" />
            <p className="text-sm text-muted-foreground">Subiendo imágenes...</p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2">
            <div className="w-10 h-10 rounded-full bg-glamor-primary/10 flex items-center justify-center">
              {internalImages.length === 0 ? (
                <ImageIcon className="w-5 h-5 text-glamor-primary" />
              ) : (
                <Upload className="w-5 h-5 text-glamor-primary" />
              )}
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">
                {internalImages.length === 0 ? 'Agrega imágenes del producto' : 'Agrega más imágenes'}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Arrastra y suelta o haz clic para seleccionar • PNG, JPG, WEBP • Máx. 10MB cada una
              </p>
            </div>
          </div>
        )}
      </div>

      {error && (
        <p className="text-sm text-red-600">{error}</p>
      )}
    </div>
  );
}
