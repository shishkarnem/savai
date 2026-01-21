import React, { useRef } from 'react';
import Rivets from './Rivets';

interface IgnitionScreenProps {
  urlInput: string;
  setUrlInput: (value: string) => void;
  onFileUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onUrlLoad: () => void;
}

export const IgnitionScreen: React.FC<IgnitionScreenProps> = ({
  urlInput,
  setUrlInput,
  onFileUpload,
  onUrlLoad,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="fixed inset-0 bg-background flex flex-col items-center justify-center z-[100] p-6 text-center overflow-y-auto">
      <div className="steampunk-border p-8 md:p-12 max-w-lg w-full my-auto">
        <Rivets />
        <div className="mb-8">
          <i className="fa-solid fa-microchip text-7xl text-primary mb-4"></i>
          <h2 className="steampunk-header text-3xl md:text-5xl mb-4">Система SAV AI</h2>
          <p className="text-foreground italic opacity-80 mb-8 font-serif">
            Для активации аналитических модулей необходимо загрузить Механическое Сердце (.glb файл).
          </p>
        </div>
        
        <div className="space-y-6">
          <div className="space-y-3">
            <input 
              type="file" 
              accept=".glb" 
              onChange={onFileUpload} 
              className="hidden" 
              ref={fileInputRef}
            />
            <button 
              onClick={() => fileInputRef.current?.click()}
              className="steampunk-button w-full py-4 text-lg"
            >
              <i className="fa-solid fa-upload"></i> ВЫБРАТЬ ФАЙЛ
            </button>
          </div>

          <div className="flex items-center gap-4">
            <div className="h-px bg-foreground opacity-10 flex-1"></div>
            <span className="text-primary text-[10px] italic opacity-40 uppercase tracking-widest">или ссылка</span>
            <div className="h-px bg-foreground opacity-10 flex-1"></div>
          </div>

          <div className="space-y-3">
            <input 
              type="text"
              placeholder="https://example.com/model.glb"
              className="glass-input w-full p-3 text-sm outline-none focus:border-opacity-100 transition-all"
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
            />
            <button 
              onClick={onUrlLoad}
              className="w-full bg-transparent border border-primary/30 text-primary py-3 text-sm hover:bg-primary/10 transition-all rounded-xl uppercase font-bold tracking-widest"
              disabled={!urlInput.trim()}
            >
              <i className="fa-solid fa-link mr-2"></i> Подключить по ссылке
            </button>
          </div>
        </div>
        
        <p className="mt-8 text-[10px] uppercase tracking-[0.3em] opacity-40 text-foreground">
          Требуется формат GLB • Версия 2.0
        </p>
      </div>
    </div>
  );
};

export default IgnitionScreen;
