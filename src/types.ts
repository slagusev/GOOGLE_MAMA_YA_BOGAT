export interface Deck {
  id: string;
  name: string;
  isDefault: boolean;
}

export interface Theme {
  id: string;
  deckId: string;
  name: string;
  color: string; // Tailwind base color (e.g. 'emerald', 'sky', 'indigo', 'amber', 'rose', 'violet')
}

export interface Card {
  id: string;
  themeId: string;
  text: string;
}

export interface GameRules {
  text: string;
}

export interface SEOSettings {
  title: string;
  description: string;
  keywords: string;
  headerScript?: string;
  bodyScript?: string;
  ogTitle?: string;
  ogDescription?: string;
  ogImage?: string;
  ogType?: string;
}

export interface HomeSettings {
  title: string;
  subtitle: string;
  imageUrl: string;
  calculatorUrl?: string;
  cardUrl?: string;
}

export interface FooterSettings {
  text: string;
}

export interface TableStats {
  roomId: string;
  createdAt: string;
  activePlayersCount: number;
}

export interface HistoryEvent {
  event: 'table_created' | 'player_joined' | 'card_pulled';
  timestamp: string;
  roomId: string;
  cardId?: string;
}

export interface GameStats {
  totalTablesCreated: number;
  totalPlayersJoined: number;
  activeTables: TableStats[];
  history?: HistoryEvent[];
}

export interface AdminSettings {
  adminPass: string;
  adminLogin: string;
}

export interface GameState {
  currentDeckId: string | null;
  themes: Theme[];
  cards: Card[];
  rules: GameRules;
  seo: SEOSettings;
  home: HomeSettings;
  footer: FooterSettings;
}
