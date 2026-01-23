import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useTelegramAuth } from '@/hooks/useTelegramAuth';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import Rivets from '@/components/Rivets';

const TelegramProfile: React.FC = () => {
  const navigate = useNavigate();
  const { telegramUser, profile, isLoading, isTelegramWebApp, isNewUser } = useTelegramAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <motion.div
          className="glass-panel p-8 text-center"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
        >
          <i className="fa-solid fa-gear fa-spin text-4xl text-primary mb-4"></i>
          <p className="text-lg">Загрузка профиля...</p>
        </motion.div>
      </div>
    );
  }

  if (!isTelegramWebApp || !profile) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <motion.div
          className="glass-panel p-8 text-center max-w-md"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Rivets />
          <i className="fa-brands fa-telegram text-6xl text-primary mb-6"></i>
          <h2 className="text-2xl font-bold mb-4 text-primary">Telegram не обнаружен</h2>
          <p className="text-foreground/70 mb-6">
            Для просмотра профиля откройте приложение через Telegram бота.
          </p>
          <Button
            onClick={() => navigate('/')}
            className="steam-button"
          >
            <i className="fa-solid fa-arrow-left mr-2"></i>
            Вернуться на главную
          </Button>
        </motion.div>
      </div>
    );
  }

  const fullName = [profile.first_name, profile.last_name].filter(Boolean).join(' ') || 'Безымянный инженер';
  const registrationDate = new Date(profile.created_at).toLocaleDateString('ru-RU', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  return (
    <div className="min-h-screen flex flex-col items-center p-4 md:p-8">
      {/* Header */}
      <header className="w-full max-w-4xl mb-8 flex justify-center">
        <Button
          onClick={() => navigate('/')}
          variant="ghost"
          className="text-foreground/60 hover:text-primary"
        >
          <i className="fa-solid fa-arrow-left mr-2"></i>
          Назад к механизму
        </Button>
      </header>

      {/* Profile Card */}
      <motion.div
        className="glass-panel p-8 max-w-lg w-full relative overflow-hidden"
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        <Rivets />
        
        {/* Decorative gears */}
        <div className="absolute -top-4 -right-4 opacity-10">
          <i className="fa-solid fa-gear text-6xl text-primary animate-spin" style={{ animationDuration: '20s' }}></i>
        </div>

        {/* Profile Photo */}
        <div className="flex justify-center mb-6">
          <motion.div
            className="relative"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
          >
            <div className="w-32 h-32 rounded-full border-4 border-primary/50 overflow-hidden bg-black/40 backdrop-blur-md shadow-lg shadow-primary/20">
              {profile.photo_url ? (
                <img
                  src={profile.photo_url}
                  alt={fullName}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <i className="fa-solid fa-user-gear text-5xl text-primary/60"></i>
                </div>
              )}
            </div>
            {/* Telegram badge */}
            <div className="absolute -bottom-2 -right-2 w-10 h-10 bg-[#0088cc] rounded-full flex items-center justify-center border-2 border-background shadow-lg">
              <i className="fa-brands fa-telegram text-white text-xl"></i>
            </div>
          </motion.div>
        </div>

        {/* Name */}
        <motion.h1
          className="text-2xl md:text-3xl font-bold text-center text-primary mb-2"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
        >
          {fullName}
        </motion.h1>

        {/* Username */}
        {profile.username && (
          <motion.p
            className="text-center text-foreground/60 mb-6"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
          >
            @{profile.username}
          </motion.p>
        )}

        {/* Divider */}
        <div className="border-t border-foreground/10 my-6"></div>

        {/* Info Grid */}
        <motion.div
          className="space-y-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
        >
          {/* Telegram ID */}
          <div className="flex items-center justify-between p-3 bg-black/20 rounded-lg border border-foreground/10">
            <div className="flex items-center gap-3">
              <i className="fa-solid fa-fingerprint text-primary"></i>
              <span className="text-foreground/70">ID Telegram</span>
            </div>
            <span className="font-mono text-primary">{profile.telegram_id}</span>
          </div>

          {/* Registration Date */}
          <div className="flex items-center justify-between p-3 bg-black/20 rounded-lg border border-foreground/10">
            <div className="flex items-center gap-3">
              <i className="fa-solid fa-calendar-plus text-primary"></i>
              <span className="text-foreground/70">Дата регистрации</span>
            </div>
            <span className="text-primary">{registrationDate}</span>
          </div>

          {/* Status */}
          <div className="flex items-center justify-between p-3 bg-black/20 rounded-lg border border-foreground/10">
            <div className="flex items-center gap-3">
              <i className="fa-solid fa-user-check text-primary"></i>
              <span className="text-foreground/70">Статус</span>
            </div>
            <span className="text-primary flex items-center gap-2">
              <span className="w-2 h-2 bg-primary rounded-full animate-pulse"></span>
              Активен
            </span>
          </div>
        </motion.div>

        {/* New User Badge */}
        {isNewUser && (
          <motion.div
            className="mt-6 p-4 bg-primary/10 rounded-lg border border-primary/30 text-center"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7 }}
          >
            <i className="fa-solid fa-star text-primary mr-2"></i>
            <span className="text-primary">Добро пожаловать! Вы новый инженер в системе SAV AI</span>
          </motion.div>
        )}
      </motion.div>

      {/* Footer */}
      <footer className="mt-8 py-6 text-center opacity-20 text-[8px] md:text-[10px] tracking-[0.3em] uppercase font-bold">
        © 1885-2026 SAV AI • Королевская Академия Робототехники
      </footer>
    </div>
  );
};

export default TelegramProfile;
