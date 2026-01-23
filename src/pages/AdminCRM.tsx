import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination';
import { Badge } from '@/components/ui/badge';
import { Search, RefreshCw, ArrowLeft, Users } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import type { Tables } from '@/integrations/supabase/types';

type Client = Tables<'clients'>;

const CLIENT_STATUSES = [
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

const ITEMS_PER_PAGE = 20;

const getStatusColor = (status: string | null): string => {
  switch (status) {
    case 'Выполнено':
      return 'bg-green-500/20 text-green-400 border-green-500/30';
    case 'В работе':
    case 'Обслуживание':
      return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
    case 'Отказ':
    case 'Заблокировано':
      return 'bg-red-500/20 text-red-400 border-red-500/30';
    case 'Инфо':
    case 'Расчет':
      return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
    case 'Договор':
    case 'Предоплата':
    case 'Тариф':
      return 'bg-purple-500/20 text-purple-400 border-purple-500/30';
    case 'Подбор Эксперта':
    case 'Эксперт':
      return 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30';
    default:
      return 'bg-muted text-muted-foreground border-border';
  }
};

const AdminCRM: React.FC = () => {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);

  const { data: clients, isLoading, refetch, isFetching } = useQuery({
    queryKey: ['admin-clients'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('clients')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as Client[];
    },
  });

  const filteredClients = useMemo(() => {
    if (!clients) return [];
    
    return clients.filter((client) => {
      const matchesSearch =
        !search ||
        client.full_name?.toLowerCase().includes(search.toLowerCase()) ||
        client.telegram_client?.toLowerCase().includes(search.toLowerCase()) ||
        client.telegram_id?.toLowerCase().includes(search.toLowerCase()) ||
        client.project?.toLowerCase().includes(search.toLowerCase()) ||
        client.project_code?.toLowerCase().includes(search.toLowerCase());
      
      const matchesStatus =
        statusFilter === 'all' || client.status === statusFilter;
      
      return matchesSearch && matchesStatus;
    });
  }, [clients, search, statusFilter]);

  const totalPages = Math.ceil(filteredClients.length / ITEMS_PER_PAGE);
  const paginatedClients = filteredClients.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  const statusCounts = useMemo(() => {
    if (!clients) return {};
    return clients.reduce((acc, client) => {
      const status = client.status || 'Без статуса';
      acc[status] = (acc[status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
  }, [clients]);

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
                onClick={() => navigate('/')}
                className="text-muted-foreground hover:text-foreground"
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Users className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h1 className="text-xl font-bold">CRM Клиенты</h1>
                  <p className="text-sm text-muted-foreground">
                    {clients?.length || 0} записей в базе
                  </p>
                </div>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => refetch()}
              disabled={isFetching}
              className="gap-2"
            >
              <RefreshCw className={`h-4 w-4 ${isFetching ? 'animate-spin' : ''}`} />
              Обновить
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6">
        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Поиск по имени, телеграм, проекту..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setCurrentPage(1);
              }}
              className="pl-10"
            />
          </div>
          <Select
            value={statusFilter}
            onValueChange={(value) => {
              setStatusFilter(value);
              setCurrentPage(1);
            }}
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
        </div>

        {/* Results info */}
        <div className="text-sm text-muted-foreground mb-4">
          Найдено: {filteredClients.length} клиентов
        </div>

        {/* Table */}
        <div className="border border-border rounded-lg overflow-hidden bg-card">
          {isLoading ? (
            <div className="p-8 text-center text-muted-foreground">
              Загрузка данных...
            </div>
          ) : paginatedClients.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              Клиенты не найдены
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/30">
                    <TableHead className="whitespace-nowrap">Код</TableHead>
                    <TableHead className="whitespace-nowrap">Клиент</TableHead>
                    <TableHead className="whitespace-nowrap">Telegram</TableHead>
                    <TableHead className="whitespace-nowrap">Проект</TableHead>
                    <TableHead className="whitespace-nowrap">Статус</TableHead>
                    <TableHead className="whitespace-nowrap">Эксперт</TableHead>
                    <TableHead className="whitespace-nowrap">Тариф</TableHead>
                    <TableHead className="whitespace-nowrap">Город</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedClients.map((client) => (
                    <TableRow key={client.id} className="hover:bg-muted/20">
                      <TableCell className="font-mono text-xs">
                        {client.project_code || '—'}
                      </TableCell>
                      <TableCell>
                        <div className="max-w-[200px]">
                          <div className="font-medium truncate">
                            {client.full_name || '—'}
                          </div>
                          {client.telegram_id && (
                            <div className="text-xs text-muted-foreground">
                              ID: {client.telegram_id}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-sm">
                        {client.telegram_client || '—'}
                      </TableCell>
                      <TableCell>
                        <div className="max-w-[150px] truncate text-sm">
                          {client.project || '—'}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={getStatusColor(client.status)}
                        >
                          {client.status || 'Нет'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm">
                        {client.expert_pseudonym || client.expert_name || '—'}
                      </TableCell>
                      <TableCell className="text-sm">
                        {client.tariff || '—'}
                      </TableCell>
                      <TableCell className="text-sm">
                        {client.city || '—'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="mt-6">
            <Pagination>
              <PaginationContent>
                <PaginationItem>
                  <PaginationPrevious
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    className={currentPage === 1 ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                  />
                </PaginationItem>
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let pageNum: number;
                  if (totalPages <= 5) {
                    pageNum = i + 1;
                  } else if (currentPage <= 3) {
                    pageNum = i + 1;
                  } else if (currentPage >= totalPages - 2) {
                    pageNum = totalPages - 4 + i;
                  } else {
                    pageNum = currentPage - 2 + i;
                  }
                  return (
                    <PaginationItem key={pageNum}>
                      <PaginationLink
                        onClick={() => setCurrentPage(pageNum)}
                        isActive={currentPage === pageNum}
                        className="cursor-pointer"
                      >
                        {pageNum}
                      </PaginationLink>
                    </PaginationItem>
                  );
                })}
                <PaginationItem>
                  <PaginationNext
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    className={currentPage === totalPages ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                  />
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          </div>
        )}
      </main>
    </div>
  );
};

export default AdminCRM;
