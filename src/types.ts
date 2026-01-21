export type Segment = 'B2C' | 'B2B';
export type Category = 'Товары' | 'Услуги';
export type Sphere = 'Строительство' | 'Здоровье' | 'Производство' | 'Образование' | 'Реклама' | 'Транспорт' | 'Технологии' | 'Досуг' | 'Торговля' | 'Другое';
export type PlanLevel = 'Лайт' | 'Эконом' | 'Стандарт' | 'Премиум' | 'VIP';

export interface BusinessInfo {
  segment: Segment;
  category: Category;
  sphere: Sphere;
  description: string;
  praise: string;
  package?: string;
}

export interface PlanData {
  tariffName: string;
  package: PlanLevel;
  sphere: Sphere;
  segment: Segment;
  category: Category;
  fullDescription: string;
  priceMonth: number;
  photoUrl: string;
}

export interface Message {
  id: string;
  role: 'assistant' | 'user';
  content: string;
  imageUrl?: string;
  buttons?: string[][];
  type?: 'intro' | 'classification' | 'plans' | 'plan_details';
}
