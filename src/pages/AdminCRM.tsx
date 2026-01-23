import React, { useState, useMemo, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
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
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { RefreshCw, ArrowLeft, Users, LayoutGrid, List } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import type { Tables } from '@/integrations/supabase/types';
import { CRMFilters, ColumnFilters } from '@/components/crm/CRMFilters';
import { ClientCard } from '@/components/crm/ClientCard';
import { KanbanView } from '@/components/crm/KanbanView';

type Client = Tables<'clients'>;

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
  const { toast } = useToast();
  
  // View state
  const [viewMode, setViewMode] = useState<'table' | 'kanban'>('table');
  
  // Search & filters
  const [search, setSearch] = useState('');
  const [aiSearchEnabled, setAiSearchEnabled] = useState(false);
  const [isAISearching, setIsAISearching] = useState(false);
  const [aiMatchedIds, setAiMatchedIds] = useState<string[] | null>(null);
  const [columnFilters, setColumnFilters] = useState<ColumnFilters>({
    status: 'all',
    city: 'all',
    tariff: 'all',
    expert: 'all',
    project: '',
  });
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  
  // Client card
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [cardOpen, setCardOpen] = useState(false);

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

  // Unique values for filters
  const uniqueValues = useMemo(() => {
    if (!clients) return { cities: [], tariffs: [], experts: [] };
    
    const cities = [...new Set(clients.map(c => c.city).filter(Boolean))] as string[];
    const tariffs = [...new Set(clients.map(c => c.tariff).filter(Boolean))] as string[];
    const experts = [...new Set(
      clients.map(c => c.expert_pseudonym || c.expert_name).filter(Boolean)
    )] as string[];
    
    return { cities, tariffs, experts };
  }, [clients]);

  // Status counts
  const statusCounts = useMemo(() => {
    if (!clients) return {};
    return clients.reduce((acc, client) => {
      const status = client.status || 'Без статуса';
      acc[status] = (acc[status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
  }, [clients]);

  // AI Search handler
  const handleAISearch = useCallback(async () => {
    if (!search.trim() || !clients?.length) return;
    
    setIsAISearching(true);
    try {
      const response = await supabase.functions.invoke('ai-search-clients', {
        body: { query: search, clients },
      });
      
      if (response.error) {
        throw new Error(response.error.message);
      }
      
      const { matchedIds, error } = response.data;
      
      if (error) {
        if (error === 'Rate limit exceeded') {
          toast({
            title: 'Превышен лимит запросов',
            description: 'Попробуйте позже',
            variant: 'destructive',
          });
        } else if (error === 'Payment required') {
          toast({
            title: 'Требуется оплата',
            description: 'Пополните баланс в настройках',
            variant: 'destructive',
          });
        }
        return;
      }
      
      setAiMatchedIds(matchedIds);
      toast({
        title: 'ИИ-поиск завершен',
        description: `Найдено ${matchedIds.length} клиентов`,
      });
    } catch (error) {
      console.error('AI search error:', error);
      toast({
        title: 'Ошибка ИИ-поиска',
        description: 'Попробуйте обычный поиск',
        variant: 'destructive',
      });
    } finally {
      setIsAISearching(false);
    }
  }, [search, clients, toast]);

  // Filtered clients
  const filteredClients = useMemo(() => {
    if (!clients) return [];
    
    // If AI search has results, filter by them
    if (aiMatchedIds !== null && aiSearchEnabled) {
      return clients.filter(c => aiMatchedIds.includes(c.id));
    }
    
    return clients.filter((client) => {
      // Text search
      const matchesSearch =
        !search ||
        client.full_name?.toLowerCase().includes(search.toLowerCase()) ||
        client.telegram_client?.toLowerCase().includes(search.toLowerCase()) ||
        client.telegram_id?.toLowerCase().includes(search.toLowerCase()) ||
        client.project?.toLowerCase().includes(search.toLowerCase()) ||
        client.project_code?.toLowerCase().includes(search.toLowerCase()) ||
        client.city?.toLowerCase().includes(search.toLowerCase()) ||
        client.tariff?.toLowerCase().includes(search.toLowerCase()) ||
        client.expert_name?.toLowerCase().includes(search.toLowerCase()) ||
        client.expert_pseudonym?.toLowerCase().includes(search.toLowerCase()) ||
        client.comment?.toLowerCase().includes(search.toLowerCase());
      
      // Column filters
      const matchesStatus =
        columnFilters.status === 'all' || client.status === columnFilters.status;
      const matchesCity =
        columnFilters.city === 'all' || client.city === columnFilters.city;
      const matchesTariff =
        columnFilters.tariff === 'all' || client.tariff === columnFilters.tariff;
      const matchesExpert =
        columnFilters.expert === 'all' ||
        client.expert_pseudonym === columnFilters.expert ||
        client.expert_name === columnFilters.expert;
      const matchesProject =
        !columnFilters.project ||
        client.project?.toLowerCase().includes(columnFilters.project.toLowerCase());
      
      return matchesSearch && matchesStatus && matchesCity && matchesTariff && matchesExpert && matchesProject;
    });
  }, [clients, search, columnFilters, aiMatchedIds, aiSearchEnabled]);

  const totalPages = Math.ceil(filteredClients.length / ITEMS_PER_PAGE);
  const paginatedClients = filteredClients.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  const handleClientClick = (client: Client) => {
    setSelectedClient(client);
    setCardOpen(true);
  };

  const handleSearchChange = (value: string) => {
    setSearch(value);
    setCurrentPage(1);
    // Reset AI results when search changes
    if (aiMatchedIds !== null) {
      setAiMatchedIds(null);
    }
  };

  const handleAISearchToggle = () => {
    setAiSearchEnabled(!aiSearchEnabled);
    setAiMatchedIds(null);
  };

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
            <div className="flex items-center gap-2">
              <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as 'table' | 'kanban')}>
                <TabsList>
                  <TabsTrigger value="table" className="gap-1.5">
                    <List className="h-4 w-4" />
                    <span className="hidden sm:inline">Таблица</span>
                  </TabsTrigger>
                  <TabsTrigger value="kanban" className="gap-1.5">
                    <LayoutGrid className="h-4 w-4" />
                    <span className="hidden sm:inline">Канбан</span>
                  </TabsTrigger>
                </TabsList>
              </Tabs>
              <Button
                variant="outline"
                size="sm"
                onClick={() => refetch()}
                disabled={isFetching}
                className="gap-2"
              >
                <RefreshCw className={`h-4 w-4 ${isFetching ? 'animate-spin' : ''}`} />
                <span className="hidden sm:inline">Обновить</span>
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6">
        {/* Filters */}
        <CRMFilters
          search={search}
          onSearchChange={handleSearchChange}
          columnFilters={columnFilters}
          onColumnFiltersChange={(filters) => {
            setColumnFilters(filters);
            setCurrentPage(1);
          }}
          statusCounts={statusCounts}
          uniqueCities={uniqueValues.cities}
          uniqueTariffs={uniqueValues.tariffs}
          uniqueExperts={uniqueValues.experts}
          onAISearch={handleAISearch}
          isAISearching={isAISearching}
          aiSearchEnabled={aiSearchEnabled}
          onAISearchToggle={handleAISearchToggle}
        />

        {/* Results info */}
        <div className="text-sm text-muted-foreground my-4">
          Найдено: {filteredClients.length} клиентов
          {aiMatchedIds !== null && aiSearchEnabled && (
            <span className="ml-2 text-primary">(ИИ-поиск)</span>
          )}
        </div>

        {/* Content */}
        {isLoading ? (
          <div className="p-8 text-center text-muted-foreground">
            Загрузка данных...
          </div>
        ) : viewMode === 'kanban' ? (
          <KanbanView clients={filteredClients} onClientClick={handleClientClick} />
        ) : (
          <>
            {/* Table */}
            <div className="border border-border rounded-lg overflow-hidden bg-card">
              {paginatedClients.length === 0 ? (
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
                        <TableRow 
                          key={client.id} 
                          className="hover:bg-muted/20 cursor-pointer"
                          onClick={() => handleClientClick(client)}
                        >
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
          </>
        )}
      </main>

      {/* Client Card Dialog */}
      <ClientCard
        client={selectedClient}
        open={cardOpen}
        onOpenChange={setCardOpen}
      />
    </div>
  );
};

export default AdminCRM;
