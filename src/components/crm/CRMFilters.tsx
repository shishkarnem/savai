import React from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Label } from '@/components/ui/label';
import { Search, Filter, X, Sparkles, Loader2 } from 'lucide-react';

export const CLIENT_STATUSES = [
  'Заблокировано',
  'Инфо',
  'Расчет',
  'Договор',
  'Предоплата',
  'Тариф',
  'Подбор Эксперта',
  'Отказ',
  'Обслуживание',
  'Не на связи',
  'Дубль',
  'Эксперт',
  'Выполнено',
  'В работе',
  'Бот создан',
  'Без напоминаний',
  'Партнер',
];

export interface ColumnFilters {
  status: string;
  city: string;
  tariff: string;
  expert: string;
  project: string;
}

interface CRMFiltersProps {
  search: string;
  onSearchChange: (value: string) => void;
  columnFilters: ColumnFilters;
  onColumnFiltersChange: (filters: ColumnFilters) => void;
  statusCounts: Record<string, number>;
  uniqueCities: string[];
  uniqueTariffs: string[];
  uniqueExperts: string[];
  onAISearch: () => void;
  isAISearching: boolean;
  aiSearchEnabled: boolean;
  onAISearchToggle: () => void;
}

export const CRMFilters: React.FC<CRMFiltersProps> = ({
  search,
  onSearchChange,
  columnFilters,
  onColumnFiltersChange,
  statusCounts,
  uniqueCities,
  uniqueTariffs,
  uniqueExperts,
  onAISearch,
  isAISearching,
  aiSearchEnabled,
  onAISearchToggle,
}) => {
  const activeFiltersCount = Object.values(columnFilters).filter(
    (v) => v && v !== 'all'
  ).length;

  const clearFilters = () => {
    onColumnFiltersChange({
      status: 'all',
      city: 'all',
      tariff: 'all',
      expert: 'all',
      project: '',
    });
  };

  return (
    <div className="space-y-4">
      {/* Основной поиск */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={aiSearchEnabled 
              ? "ИИ-поиск: например 'клиенты из Москвы на тарифе Стандарт'" 
              : "Поиск по имени, телеграм, проекту..."
            }
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && aiSearchEnabled && search.trim()) {
                onAISearch();
              }
            }}
            className={`pl-10 pr-24 ${aiSearchEnabled ? 'border-primary/50' : ''}`}
          />
          <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
            {aiSearchEnabled && search.trim() && (
              <Button
                size="sm"
                variant="ghost"
                onClick={onAISearch}
                disabled={isAISearching}
                className="h-7 px-2"
              >
                {isAISearching ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  'Найти'
                )}
              </Button>
            )}
            <Button
              size="sm"
              variant={aiSearchEnabled ? 'default' : 'ghost'}
              onClick={onAISearchToggle}
              className="h-7 px-2 gap-1"
              title="ИИ-поиск по всем полям"
            >
              <Sparkles className="h-4 w-4" />
              <span className="hidden sm:inline text-xs">ИИ</span>
            </Button>
          </div>
        </div>

        {/* Быстрый фильтр по статусу */}
        <Select
          value={columnFilters.status}
          onValueChange={(value) =>
            onColumnFiltersChange({ ...columnFilters, status: value })
          }
        >
          <SelectTrigger className="w-full sm:w-[200px]">
            <SelectValue placeholder="Все статусы" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Все статусы</SelectItem>
            {CLIENT_STATUSES.map((status) => (
              <SelectItem key={status} value={status}>
                {status} ({statusCounts[status] || 0})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Расширенные фильтры */}
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" className="gap-2">
              <Filter className="h-4 w-4" />
              Фильтры
              {activeFiltersCount > 0 && (
                <span className="bg-primary text-primary-foreground rounded-full px-1.5 py-0.5 text-xs">
                  {activeFiltersCount}
                </span>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-80" align="end">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="font-medium">Фильтры по колонкам</h4>
                {activeFiltersCount > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={clearFilters}
                    className="h-8 px-2 text-xs"
                  >
                    <X className="h-3 w-3 mr-1" />
                    Сбросить
                  </Button>
                )}
              </div>

              <div className="space-y-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">Город</Label>
                  <Select
                    value={columnFilters.city}
                    onValueChange={(value) =>
                      onColumnFiltersChange({ ...columnFilters, city: value })
                    }
                  >
                    <SelectTrigger className="h-9">
                      <SelectValue placeholder="Все города" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Все города</SelectItem>
                      {uniqueCities.map((city) => (
                        <SelectItem key={city} value={city}>
                          {city}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs">Тариф</Label>
                  <Select
                    value={columnFilters.tariff}
                    onValueChange={(value) =>
                      onColumnFiltersChange({ ...columnFilters, tariff: value })
                    }
                  >
                    <SelectTrigger className="h-9">
                      <SelectValue placeholder="Все тарифы" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Все тарифы</SelectItem>
                      {uniqueTariffs.map((tariff) => (
                        <SelectItem key={tariff} value={tariff}>
                          {tariff}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs">Эксперт</Label>
                  <Select
                    value={columnFilters.expert}
                    onValueChange={(value) =>
                      onColumnFiltersChange({ ...columnFilters, expert: value })
                    }
                  >
                    <SelectTrigger className="h-9">
                      <SelectValue placeholder="Все эксперты" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Все эксперты</SelectItem>
                      {uniqueExperts.map((expert) => (
                        <SelectItem key={expert} value={expert}>
                          {expert}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs">Проект (поиск)</Label>
                  <Input
                    placeholder="Введите название проекта..."
                    value={columnFilters.project}
                    onChange={(e) =>
                      onColumnFiltersChange({
                        ...columnFilters,
                        project: e.target.value,
                      })
                    }
                    className="h-9"
                  />
                </div>
              </div>
            </div>
          </PopoverContent>
        </Popover>
      </div>

      {/* ИИ-подсказка */}
      {aiSearchEnabled && (
        <div className="text-xs text-muted-foreground bg-primary/5 border border-primary/20 rounded-lg px-3 py-2">
          💡 <strong>ИИ-поиск:</strong> Введите запрос на естественном языке, например: 
          "найди клиентов из Москвы", "кто на тарифе Стандарт", "клиенты в статусе отказ"
        </div>
      )}
    </div>
  );
};

export default CRMFilters;
