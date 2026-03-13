'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import { Upload, Clipboard } from 'lucide-react';

interface ImportUploaderProps {
  onFile: (file: File) => void;
}

const ACCEPTED = ['image/jpeg', 'image/png'];

function isValidFile(f: File): boolean {
  return ACCEPTED.includes(f.type);
}

export function ImportUploader({ onFile }: ImportUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  const handleFile = useCallback((f: File) => {
    if (isValidFile(f)) onFile(f);
  }, [onFile]);

  // Document-level paste listener (Ctrl+V)
  useEffect(() => {
    const onPaste = (e: ClipboardEvent) => {
      const items = Array.from(e.clipboardData?.items ?? []);
      const imageItem = items.find(it => it.type.startsWith('image/'));
      if (imageItem) {
        const f = imageItem.getAsFile();
        if (f) handleFile(f);
      }
    };
    document.addEventListener('paste', onPaste);
    return () => document.removeEventListener('paste', onPaste);
  }, [handleFile]);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const f = e.dataTransfer.files[0];
    if (f) handleFile(f);
  }, [handleFile]);

  const onInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) handleFile(f);
    e.target.value = '';
  };

  return (
    <div className="flex flex-col items-center gap-6 w-full max-w-2xl mx-auto">
      {/* Drop zone */}
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        onDragOver={e => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        className={[
          'w-full border-2 border-dashed rounded-xl p-12 flex flex-col items-center gap-4',
          'transition-colors cursor-pointer text-center',
          dragging
            ? 'border-accent bg-accent/10 text-accent'
            : 'border-border hover:border-accent/60 text-text-primary/60 hover:text-text-primary',
        ].join(' ')}
      >
        <Upload className="w-12 h-12" />
        <div>
          <p className="text-lg font-semibold">Drop screenshot here</p>
          <p className="text-sm mt-1 opacity-70">or click to browse · paste with Ctrl+V</p>
          <p className="text-xs mt-2 opacity-50">Accepts .jpg / .png</p>
        </div>
        <div className="flex items-center gap-2 text-xs opacity-50 mt-2">
          <Clipboard className="w-3.5 h-3.5" />
          <span>Ctrl+V to paste from clipboard</span>
        </div>
      </button>

      <input
        ref={inputRef}
        type="file"
        accept=".jpg,.jpeg,.png"
        className="hidden"
        onChange={onInputChange}
      />

      {/* Sample image showing expected input */}
      <div className="w-full">
        <p className="text-xs text-text-primary/40 mb-2">Example Image</p>
        <Image
          src="/images/sample-import.jpeg"
          alt="Example wuwa-bot screenshot"
          width={1920}
          height={1080}
          className="w-full rounded-lg border border-border opacity-70"
        />
      </div>
    </div>
  );
}
