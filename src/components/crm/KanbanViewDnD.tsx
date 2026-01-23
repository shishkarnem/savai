import React, { useState, useCallback, useMemo } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { User, MapPin, Briefcase, DollarSign, Calendar, UserCheck, MessageSquare } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import type { Tables } from '@/integrations/supabase/types';
import type { KanbanField } from '@/hooks/useCRMSettings';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

type Client = Tables<'clients'>;
type TelegramProfile = Tables<'telegram_profiles'>;

interface KanbanViewDnDProps {
  clients: Client[];
  onClientClick: (client: Client) => void;
  kanbanFields: KanbanField[];
  onClientStatusChange?: (clientId: string, newStatus: string) => void;
}

const KANBAN_COLUMNS = [
  { status: 'Инфо', color: 'bg-yellow-500' },
  { status: 'Расчет', color: 'bg-yellow-600' },
  { status: 'Договор', color: 'bg-purple-500' },
  { status: 'Предоплата', color: 'bg-purple-600' },
  { status: 'Тариф', color: 'bg-purple-700' },
  { status: 'Подбор Эксперта', color: 'bg-cyan-500' },
  { status: 'Эксперт', color: 'bg-cyan-600' },
  { status: 'В работе', color: 'bg-blue-500' },
  { status: 'Обслуживание', color: 'bg-blue-600' },
  { status: 'Выполнено', color: 'bg-green-500' },
  { status: 'Отказ', color: 'bg-red-500' },
  { status: 'Заблокировано', color: 'bg-red-700' },
];

const getFieldIcon = (key: string) => {
  switch (key) {
    case 'telegram_client': return <User className="h-3 w-3" />;
    case 'project': return <Briefcase className="h-3 w-3" />;
    case 'city': return <MapPin className="h-3 w-3" />;
    case 'sav_cost': 
    case 'service_price': return <DollarSign className="h-3 w-3" />;
    case 'calculator_date': return <Calendar className="h-3 w-3" />;
    case 'expert': return <UserCheck className="h-3 w-3" />;
    case 'last_message': return <MessageSquare className="h-3 w-3" />;
    default: return null;
  }
};

interface DraggableCardProps {
  client: Client;
  kanbanFields: KanbanField[];
  onClientClick: (client: Client) => void;
  isDragging: boolean;
  telegramProfile?: TelegramProfile | null;
}

const DraggableCard: React.FC<DraggableCardProps> = ({
  client,
  kanbanFields,
  onClientClick,
  isDragging,
  telegramProfile,
}) => {
  const getClientFieldValue = (key: string): string | null => {
    switch (key) {
      case 'full_name': return client.full_name;
      case 'project_code': return client.project_code;
      case 'telegram_client': return client.telegram_client;
      case 'project': return client.project;
      case 'city': return client.city;
      case 'tariff': return client.tariff;
      case 'expert': return client.expert_pseudonym || client.expert_name;
      case 'product': return client.product;
      case 'sav_cost': return client.sav_cost;
      case 'service_price': return client.service_price;
      case 'calculator_date': return client.calculator_date;
      case 'last_message': return client.last_message ? (client.last_message.length > 50 ? client.last_message.slice(0, 50) + '...' : client.last_message) : null;
      default: return null;
    }
  };

  const visibleFields = kanbanFields.filter(f => f.visible);
  const showAvatar = visibleFields.some(f => f.key === 'avatar');
  
  // Get initials for avatar fallback
  const getInitials = () => {
    const name = client.full_name || client.telegram_client || '';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || '?';
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ 
        opacity: 1, 
        scale: isDragging ? 1.05 : 1,
        boxShadow: isDragging ? '0 20px 40px rgba(0,0,0,0.3)' : '0 2px 4px rgba(0,0,0,0.1)',
        zIndex: isDragging ? 100 : 1,
      }}
      exit={{ opacity: 0, scale: 0.8 }}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      className="cursor-grab active:cursor-grabbing"
    >
      <Card
        className={`p-3 transition-colors border-border ${isDragging ? 'bg-accent' : 'hover:bg-accent/50'}`}
        onClick={(e) => {
          e.stopPropagation();
          onClientClick(client);
        }}
      >
        <div className="space-y-2">
          {/* Avatar + Name row */}
          <div className="flex items-start gap-2">
            {showAvatar && (
              <Avatar className="h-8 w-8 shrink-0 border border-border">
                <AvatarImage 
                  src={telegramProfile?.photo_url || undefined} 
                  alt={client.full_name || 'Avatar'} 
                />
                <AvatarFallback className="text-[10px] bg-primary/20 text-primary">
                  {getInitials()}
                </AvatarFallback>
              </Avatar>
            )}
            <div className="flex-1 min-w-0">
              {/* Name and code */}
              {(visibleFields.some(f => f.key === 'full_name') || visibleFields.some(f => f.key === 'project_code')) && (
                <div className="flex items-start justify-between gap-2">
                  {visibleFields.some(f => f.key === 'full_name') && (
                    <div className="font-medium text-sm truncate flex-1">
                      {client.full_name || 'Без имени'}
                    </div>
                  )}
                  {visibleFields.some(f => f.key === 'project_code') && client.project_code && (
                    <Badge variant="outline" className="font-mono text-[10px] shrink-0">
                      {client.project_code}
                    </Badge>
                  )}
                </div>
              )}
            </div>
          </div>
          
          {/* Dynamic fields */}
          {visibleFields
            .filter(f => !['full_name', 'project_code', 'tariff', 'avatar'].includes(f.key))
            .map(field => {
              const value = getClientFieldValue(field.key);
              if (!value) return null;
              const icon = getFieldIcon(field.key);
              return (
                <div key={field.key} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  {icon}
                  <span className="truncate">{value}</span>
                </div>
              );
            })}

          {/* Tariff badge */}
          {visibleFields.some(f => f.key === 'tariff') && client.tariff && (
            <Badge variant="secondary" className="text-[10px]">
              {client.tariff}
            </Badge>
          )}
        </div>
      </Card>
    </motion.div>
  );
};

interface KanbanColumnDnDProps {
  status: string;
  color: string;
  clients: Client[];
  kanbanFields: KanbanField[];
  onClientClick: (client: Client) => void;
  onDrop: (clientId: string, newStatus: string) => void;
  draggedClientId: string | null;
  telegramProfiles: Map<string, TelegramProfile>;
}

const KanbanColumnDnD: React.FC<KanbanColumnDnDProps> = ({
  status,
  color,
  clients,
  kanbanFields,
  onClientClick,
  onDrop,
  draggedClientId,
  telegramProfiles,
}) => {
  const [isOver, setIsOver] = useState(false);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsOver(true);
  };

  const handleDragLeave = () => {
    setIsOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const clientId = e.dataTransfer.getData('clientId');
    if (clientId) {
      onDrop(clientId, status);
    }
    setIsOver(false);
  };

  return (
    <motion.div
      layout
      className={`flex-shrink-0 w-72 flex flex-col rounded-lg transition-colors ${
        isOver ? 'bg-primary/20 ring-2 ring-primary/50' : 'bg-muted/30'
      }`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <div className="p-3 border-b border-border flex items-center gap-2">
        <motion.div 
          className={`w-3 h-3 rounded-full ${color}`}
          animate={{ scale: isOver ? 1.3 : 1 }}
        />
        <h3 className="font-medium text-sm">{status}</h3>
        <Badge variant="secondary" className="ml-auto text-xs">
          {clients.length}
        </Badge>
      </div>
      <ScrollArea className="flex-1 p-2">
        <AnimatePresence mode="popLayout">
          <div className="space-y-2">
            {clients.map((client) => (
              <div
                key={client.id}
                draggable
                onDragStart={(e) => {
                  e.dataTransfer.setData('clientId', client.id);
                }}
              >
                <DraggableCard
                  client={client}
                  kanbanFields={kanbanFields}
                  onClientClick={onClientClick}
                  isDragging={draggedClientId === client.id}
                  telegramProfile={client.telegram_id ? telegramProfiles.get(client.telegram_id) : null}
                />
              </div>
            ))}
            {clients.length === 0 && (
              <motion.div 
                className="text-center text-xs text-muted-foreground py-4"
                animate={{ opacity: isOver ? 0.5 : 1 }}
              >
                {isOver ? 'Отпустите карточку' : 'Нет клиентов'}
              </motion.div>
            )}
          </div>
        </AnimatePresence>
      </ScrollArea>
    </motion.div>
  );
};

export const KanbanViewDnD: React.FC<KanbanViewDnDProps> = ({
  clients,
  onClientClick,
  kanbanFields,
  onClientStatusChange,
}) => {
  const { toast } = useToast();
  const [draggedClientId, setDraggedClientId] = useState<string | null>(null);
  const [localClients, setLocalClients] = useState(clients);

  // Fetch telegram profiles for all clients with telegram_id
  const telegramIds = useMemo(() => {
    return clients
      .map(c => c.telegram_id)
      .filter((id): id is string => !!id)
      .map(id => parseInt(id, 10))
      .filter(id => !isNaN(id));
  }, [clients]);

  const { data: telegramProfiles } = useQuery({
    queryKey: ['telegram-profiles-kanban', telegramIds],
    queryFn: async () => {
      if (telegramIds.length === 0) return [];
      
      const { data, error } = await supabase
        .from('telegram_profiles')
        .select('*')
        .in('telegram_id', telegramIds);
      
      if (error) throw error;
      return data as TelegramProfile[];
    },
    enabled: telegramIds.length > 0,
  });

  // Create a map for quick lookup
  const profilesMap = useMemo(() => {
    const map = new Map<string, TelegramProfile>();
    telegramProfiles?.forEach(profile => {
      map.set(String(profile.telegram_id), profile);
    });
    return map;
  }, [telegramProfiles]);

  // Update local clients when props change
  React.useEffect(() => {
    setLocalClients(clients);
  }, [clients]);

  const clientsByStatus = KANBAN_COLUMNS.reduce((acc, col) => {
    acc[col.status] = localClients.filter((c) => c.status === col.status);
    return acc;
  }, {} as Record<string, Client[]>);

  const handleDrop = useCallback(async (clientId: string, newStatus: string) => {
    const client = localClients.find(c => c.id === clientId);
    if (!client || client.status === newStatus) return;

    // Optimistic update
    setLocalClients(prev => 
      prev.map(c => c.id === clientId ? { ...c, status: newStatus } : c)
    );

    try {
      const { error } = await supabase
        .from('clients')
        .update({ status: newStatus })
        .eq('id', clientId);

      if (error) throw error;

      toast({
        title: 'Статус обновлен',
        description: `${client.full_name || 'Клиент'} → ${newStatus}`,
      });

      onClientStatusChange?.(clientId, newStatus);
    } catch (error) {
      // Rollback on error
      setLocalClients(prev => 
        prev.map(c => c.id === clientId ? { ...c, status: client.status } : c)
      );
      toast({
        title: 'Ошибка',
        description: 'Не удалось обновить статус',
        variant: 'destructive',
      });
    }

    setDraggedClientId(null);
  }, [localClients, toast, onClientStatusChange]);

  return (
    <div 
      className="flex gap-4 overflow-x-auto pb-4 scrollbar-thin" 
      style={{ minHeight: '500px' }}
    >
      {KANBAN_COLUMNS.map((col) => (
        <KanbanColumnDnD
          key={col.status}
          status={col.status}
          color={col.color}
          clients={clientsByStatus[col.status] || []}
          kanbanFields={kanbanFields}
          onClientClick={onClientClick}
          onDrop={handleDrop}
          draggedClientId={draggedClientId}
          telegramProfiles={profilesMap}
        />
      ))}
    </div>
  );
};

export default KanbanViewDnD;
