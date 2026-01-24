import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useCRMAccess } from '@/hooks/useCRMAccess';
import { AccessDenied } from '@/components/crm/AccessDenied';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { 
  ArrowLeft, 
  Loader2, 
  Save, 
  MessageSquare,
  User,
  Briefcase,
  DollarSign,
  Calendar,
  Bot,
  Send,
  Eye
} from 'lucide-react';

// Define message fields that can be toggled
interface MessageField {
  key: string;
  label: string;
  icon: React.ReactNode;
  enabled: boolean;
  category: 'client' | 'project' | 'finance' | 'expert' | 'dates';
}

const DEFAULT_FIELDS: MessageField[] = [
  // Client info
  { key: 'full_name', label: 'ФИО клиента', icon: <User className="w-4 h-4" />, enabled: true, category: 'client' },
  { key: 'telegram_link', label: 'Ссылка на Telegram', icon: <Send className="w-4 h-4" />, enabled: true, category: 'client' },
  { key: 'telegram_id', label: 'Telegram ID', icon: <User className="w-4 h-4" />, enabled: true, category: 'client' },
  { key: 'city', label: 'Город', icon: <User className="w-4 h-4" />, enabled: true, category: 'client' },
  
  // Project info
  { key: 'project', label: 'Проект', icon: <Briefcase className="w-4 h-4" />, enabled: true, category: 'project' },
  { key: 'product', label: 'Продукт', icon: <Briefcase className="w-4 h-4" />, enabled: true, category: 'project' },
  { key: 'department', label: 'Отдел', icon: <Briefcase className="w-4 h-4" />, enabled: false, category: 'project' },
  { key: 'employees_count', label: 'Количество сотрудников', icon: <Briefcase className="w-4 h-4" />, enabled: false, category: 'project' },
  { key: 'functionality', label: 'Функционал', icon: <Briefcase className="w-4 h-4" />, enabled: false, category: 'project' },
  
  // Finance
  { key: 'sav_cost', label: 'Стоимость SAV', icon: <DollarSign className="w-4 h-4" />, enabled: true, category: 'finance' },
  { key: 'tariff', label: 'Тариф', icon: <DollarSign className="w-4 h-4" />, enabled: true, category: 'finance' },
  { key: 'avg_salary', label: 'Средняя ЗП', icon: <DollarSign className="w-4 h-4" />, enabled: false, category: 'finance' },
  { key: 'payback', label: 'Окупаемость', icon: <DollarSign className="w-4 h-4" />, enabled: false, category: 'finance' },
  
  // Expert
  { key: 'selected_expert', label: 'Выбранный эксперт', icon: <Bot className="w-4 h-4" />, enabled: true, category: 'expert' },
  { key: 'expert_name', label: 'Имя эксперта', icon: <Bot className="w-4 h-4" />, enabled: false, category: 'expert' },
  
  // Dates
  { key: 'calculator_date', label: 'Дата калькулятора', icon: <Calendar className="w-4 h-4" />, enabled: true, category: 'dates' },
  { key: 'start_date', label: 'Дата старта', icon: <Calendar className="w-4 h-4" />, enabled: false, category: 'dates' },
];

const CATEGORY_LABELS: Record<string, string> = {
  client: 'Информация о клиенте',
  project: 'Информация о проекте',
  finance: 'Финансы',
  expert: 'Эксперт',
  dates: 'Даты',
};

const STORAGE_KEY = 'sav-crm-message-constructor';

export default function CRMMessageConstructor() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { hasAccess, accessLevel, isLoading: accessLoading } = useCRMAccess();
  
  const [fields, setFields] = useState<MessageField[]>(DEFAULT_FIELDS);
  const [headerText, setHeaderText] = useState('🔔 Новый выбор эксперта!');
  const [footerText, setFooterText] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Load saved settings
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.fields) {
          // Merge saved fields with defaults (to add new fields)
          const mergedFields = DEFAULT_FIELDS.map(defaultField => {
            const savedField = parsed.fields.find((f: MessageField) => f.key === defaultField.key);
            return savedField ? { ...defaultField, enabled: savedField.enabled } : defaultField;
          });
          setFields(mergedFields);
        }
        if (parsed.headerText) setHeaderText(parsed.headerText);
        if (parsed.footerText !== undefined) setFooterText(parsed.footerText);
      } catch (e) {
        console.error('Failed to parse saved message settings:', e);
      }
    }
  }, []);

  const toggleField = (key: string) => {
    setFields(prev => prev.map(f => 
      f.key === key ? { ...f, enabled: !f.enabled } : f
    ));
  };

  const handleSave = () => {
    setIsSaving(true);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        fields,
        headerText,
        footerText,
      }));
      toast({
        title: 'Настройки сохранены',
        description: 'Конфигурация сообщения обновлена',
      });
    } catch (e) {
      toast({
        title: 'Ошибка сохранения',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = () => {
    setFields(DEFAULT_FIELDS);
    setHeaderText('🔔 Новый выбор эксперта!');
    setFooterText('');
    localStorage.removeItem(STORAGE_KEY);
    toast({
      title: 'Настройки сброшены',
    });
  };

  // Generate preview message
  const generatePreview = () => {
    const enabledFields = fields.filter(f => f.enabled);
    const lines: string[] = [];
    
    if (headerText) {
      lines.push(headerText);
      lines.push('');
    }
    
    // Group by category
    const categories = ['client', 'project', 'finance', 'expert', 'dates'];
    for (const category of categories) {
      const categoryFields = enabledFields.filter(f => f.category === category);
      if (categoryFields.length > 0) {
        lines.push(`📌 ${CATEGORY_LABELS[category]}:`);
        for (const field of categoryFields) {
          if (field.key === 'telegram_link') {
            lines.push(`  • ${field.label}: t.me/username`);
          } else {
            lines.push(`  • ${field.label}: [значение]`);
          }
        }
        lines.push('');
      }
    }
    
    if (footerText) {
      lines.push(footerText);
    }
    
    return lines.join('\n');
  };

  // Access control check
  if (accessLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!hasAccess || accessLevel !== 'admin') {
    return <AccessDenied message="Настройка сообщений доступна только администраторам CRM" />;
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => navigate('/admin/crm')}
                className="text-muted-foreground hover:text-foreground"
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <MessageSquare className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h1 className="text-xl font-bold">Конструктор сообщений</h1>
                  <p className="text-sm text-muted-foreground">
                    Настройка уведомлений при выборе эксперта
                  </p>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={handleReset}>
                Сбросить
              </Button>
              <Button onClick={handleSave} disabled={isSaving} className="gap-2">
                {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Сохранить
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Settings Panel */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="w-5 h-5" />
                Настройка полей
              </CardTitle>
              <CardDescription>
                Выберите поля, которые будут включены в сообщение экспертам
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Header text */}
              <div className="space-y-2">
                <Label htmlFor="header">Заголовок сообщения</Label>
                <Input
                  id="header"
                  value={headerText}
                  onChange={(e) => setHeaderText(e.target.value)}
                  placeholder="🔔 Новый выбор эксперта!"
                />
              </div>

              <Separator />

              {/* Fields by category */}
              <ScrollArea className="h-[400px] pr-4">
                <div className="space-y-6">
                  {(['client', 'project', 'finance', 'expert', 'dates'] as const).map(category => (
                    <div key={category} className="space-y-3">
                      <h4 className="font-medium text-sm text-muted-foreground">
                        {CATEGORY_LABELS[category]}
                      </h4>
                      <div className="space-y-2">
                        {fields
                          .filter(f => f.category === category)
                          .map(field => (
                            <div
                              key={field.key}
                              className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border border-border"
                            >
                              <div className="flex items-center gap-3">
                                <span className="text-muted-foreground">{field.icon}</span>
                                <span className="text-sm">{field.label}</span>
                              </div>
                              <Switch
                                checked={field.enabled}
                                onCheckedChange={() => toggleField(field.key)}
                              />
                            </div>
                          ))}
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>

              <Separator />

              {/* Footer text */}
              <div className="space-y-2">
                <Label htmlFor="footer">Подпись сообщения (опционально)</Label>
                <Textarea
                  id="footer"
                  value={footerText}
                  onChange={(e) => setFooterText(e.target.value)}
                  placeholder="Дополнительный текст в конце сообщения..."
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>

          {/* Preview Panel */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Eye className="w-5 h-5" />
                Предпросмотр
              </CardTitle>
              <CardDescription>
                Так будет выглядеть сообщение в групповом чате экспертов
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="bg-[#1a1a1a] rounded-lg p-4 border border-border">
                <pre className="text-sm text-foreground whitespace-pre-wrap font-sans">
                  {generatePreview()}
                </pre>
              </div>
              
              <div className="mt-4 p-4 bg-muted/30 rounded-lg">
                <h4 className="font-medium text-sm mb-2">Примечание:</h4>
                <ul className="text-xs text-muted-foreground space-y-1">
                  <li>• Сообщение отправляется при выборе эксперта клиентом</li>
                  <li>• [значение] заменяется реальными данными клиента</li>
                  <li>• Ссылка на Telegram формируется автоматически</li>
                  <li>• Сообщение отправляется в групповой чат экспертов</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
