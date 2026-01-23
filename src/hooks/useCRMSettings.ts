import { useState, useEffect, useCallback } from 'react';

// Table columns configuration
export interface TableColumn {
  key: string;
  label: string;
  visible: boolean;
}

export const DEFAULT_TABLE_COLUMNS: TableColumn[] = [
  { key: 'project_code', label: 'Код', visible: true },
  { key: 'full_name', label: 'Клиент', visible: true },
  { key: 'telegram_client', label: 'Telegram', visible: true },
  { key: 'project', label: 'Проект', visible: true },
  { key: 'status', label: 'Статус', visible: true },
  { key: 'expert', label: 'Эксперт', visible: true },
  { key: 'tariff', label: 'Тариф', visible: true },
  { key: 'city', label: 'Город', visible: true },
  { key: 'product', label: 'Продукт', visible: false },
  { key: 'department', label: 'Подразделение', visible: false },
  { key: 'employees_count', label: 'Сотрудников', visible: false },
  { key: 'sav_cost', label: 'Стоимость SAV', visible: false },
  { key: 'service_price', label: 'Цена обслуживания', visible: false },
  { key: 'calculator_date', label: 'Дата калькулятора', visible: false },
  { key: 'start_date', label: 'Дата старта', visible: false },
  { key: 'comment', label: 'Комментарий', visible: false },
];

// Kanban card fields configuration
export interface KanbanField {
  key: string;
  label: string;
  visible: boolean;
}

export const DEFAULT_KANBAN_FIELDS: KanbanField[] = [
  { key: 'full_name', label: 'Имя клиента', visible: true },
  { key: 'project_code', label: 'Код проекта', visible: true },
  { key: 'telegram_client', label: 'Telegram', visible: true },
  { key: 'project', label: 'Проект', visible: true },
  { key: 'city', label: 'Город', visible: true },
  { key: 'tariff', label: 'Тариф', visible: true },
  { key: 'expert', label: 'Эксперт', visible: false },
  { key: 'product', label: 'Продукт', visible: false },
  { key: 'sav_cost', label: 'Стоимость SAV', visible: false },
  { key: 'calculator_date', label: 'Дата калькулятора', visible: false },
];

// Client card sections configuration
export interface CardSection {
  key: string;
  label: string;
  visible: boolean;
}

export const DEFAULT_CARD_SECTIONS: CardSection[] = [
  { key: 'contacts', label: 'Контактные данные', visible: true },
  { key: 'project', label: 'Проект', visible: true },
  { key: 'expert', label: 'Эксперт и тариф', visible: true },
  { key: 'finance', label: 'Финансы', visible: true },
  { key: 'dates', label: 'Важные даты', visible: true },
  { key: 'protalk', label: 'ProTalk бот', visible: true },
  { key: 'documents', label: 'Документы', visible: true },
  { key: 'comment', label: 'Комментарий', visible: true },
  { key: 'kp', label: 'Текст КП', visible: false },
];

const STORAGE_KEYS = {
  tableColumns: 'crm_table_columns',
  kanbanFields: 'crm_kanban_fields',
  cardSections: 'crm_card_sections',
};

export function useCRMSettings() {
  // Table columns
  const [tableColumns, setTableColumnsState] = useState<TableColumn[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.tableColumns);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        return DEFAULT_TABLE_COLUMNS;
      }
    }
    return DEFAULT_TABLE_COLUMNS;
  });

  // Kanban fields
  const [kanbanFields, setKanbanFieldsState] = useState<KanbanField[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.kanbanFields);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        return DEFAULT_KANBAN_FIELDS;
      }
    }
    return DEFAULT_KANBAN_FIELDS;
  });

  // Card sections
  const [cardSections, setCardSectionsState] = useState<CardSection[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.cardSections);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        return DEFAULT_CARD_SECTIONS;
      }
    }
    return DEFAULT_CARD_SECTIONS;
  });

  // Persist changes
  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.tableColumns, JSON.stringify(tableColumns));
  }, [tableColumns]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.kanbanFields, JSON.stringify(kanbanFields));
  }, [kanbanFields]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.cardSections, JSON.stringify(cardSections));
  }, [cardSections]);

  const setTableColumns = useCallback((columns: TableColumn[]) => {
    setTableColumnsState(columns);
  }, []);

  const setKanbanFields = useCallback((fields: KanbanField[]) => {
    setKanbanFieldsState(fields);
  }, []);

  const setCardSections = useCallback((sections: CardSection[]) => {
    setCardSectionsState(sections);
  }, []);

  const toggleTableColumn = useCallback((key: string) => {
    setTableColumnsState(prev => 
      prev.map(col => col.key === key ? { ...col, visible: !col.visible } : col)
    );
  }, []);

  const toggleKanbanField = useCallback((key: string) => {
    setKanbanFieldsState(prev => 
      prev.map(f => f.key === key ? { ...f, visible: !f.visible } : f)
    );
  }, []);

  const toggleCardSection = useCallback((key: string) => {
    setCardSectionsState(prev => 
      prev.map(s => s.key === key ? { ...s, visible: !s.visible } : s)
    );
  }, []);

  const resetTableColumns = useCallback(() => {
    setTableColumnsState(DEFAULT_TABLE_COLUMNS);
  }, []);

  const resetKanbanFields = useCallback(() => {
    setKanbanFieldsState(DEFAULT_KANBAN_FIELDS);
  }, []);

  const resetCardSections = useCallback(() => {
    setCardSectionsState(DEFAULT_CARD_SECTIONS);
  }, []);

  return {
    tableColumns,
    kanbanFields,
    cardSections,
    setTableColumns,
    setKanbanFields,
    setCardSections,
    toggleTableColumn,
    toggleKanbanField,
    toggleCardSection,
    resetTableColumns,
    resetKanbanFields,
    resetCardSections,
  };
}
