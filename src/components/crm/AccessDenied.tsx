import React from 'react';
import { Shield, Lock, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';

interface AccessDeniedProps {
  message?: string;
}

export const AccessDenied: React.FC<AccessDeniedProps> = ({ 
  message = 'У вас нет доступа к этому разделу' 
}) => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-zinc-900 via-zinc-800 to-zinc-900 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <div className="bg-zinc-800/50 border border-zinc-700/50 rounded-2xl p-8 text-center backdrop-blur-sm">
          {/* Icon */}
          <div className="relative mx-auto w-20 h-20 mb-6">
            <div className="absolute inset-0 bg-red-500/20 rounded-full animate-pulse" />
            <div className="absolute inset-2 bg-zinc-800 rounded-full flex items-center justify-center border-2 border-red-500/50">
              <Shield className="w-8 h-8 text-red-400" />
            </div>
            <Lock className="absolute -bottom-1 -right-1 w-6 h-6 text-red-500 bg-zinc-800 rounded-full p-1" />
          </div>

          {/* Title */}
          <h1 className="text-2xl font-bold text-white mb-2">
            Доступ запрещён
          </h1>

          {/* Message */}
          <p className="text-zinc-400 mb-6">
            {message}
          </p>

          {/* Info box */}
          <div className="bg-zinc-900/50 border border-zinc-700/50 rounded-lg p-4 mb-6 text-left">
            <p className="text-sm text-zinc-500">
              Для получения доступа к CRM обратитесь к администратору системы. 
              Доступ предоставляется только авторизованным пользователям Telegram.
            </p>
          </div>

          {/* Actions */}
          <div className="flex flex-col gap-3">
            <Button
              onClick={() => navigate('/')}
              variant="outline"
              className="w-full border-zinc-700 hover:bg-zinc-700/50"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Вернуться на главную
            </Button>
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-zinc-600 text-xs mt-4">
          SAV CRM • Защищённый раздел
        </p>
      </div>
    </div>
  );
};
