import fs from 'fs';
import path from 'path';
import { Deck, Theme, Card, GameRules, SEOSettings, HomeSettings, FooterSettings, AdminSettings, GameStats } from '../src/types';

const DB_DIR = path.join(process.cwd(), 'data');
const DB_FILE = path.join(DB_DIR, 'db.json');

interface Schema {
  decks: Deck[];
  themes: Theme[];
  cards: Card[];
  rules: GameRules;
  seo: SEOSettings;
  home: HomeSettings;
  footer: FooterSettings;
  admin: AdminSettings;
  stats: {
    totalTablesCreated: number;
    totalPlayersJoined: number;
    history: Array<{
      event: 'table_created' | 'player_joined' | 'card_pulled';
      timestamp: string;
      roomId?: string;
      cardId?: string;
    }>;
  };
}

const DEFAULT_DECKS: Deck[] = [
  { id: 'deck-1', name: '💸 Стандартный (Мама, я богат!)', isDefault: true },
  { id: 'deck-2', name: '🥂 На хайпе / Вечеринка', isDefault: false }
];

const DEFAULT_THEMES: Theme[] = [
  // Deck 1 Themes
  { id: 'theme-1-1', deckId: 'deck-1', name: '🚀 Бизнес & Стартапы', color: 'emerald' },
  { id: 'theme-1-2', deckId: 'deck-1', name: '🏢 Недвижимость', color: 'sky' },
  { id: 'theme-1-3', deckId: 'deck-1', name: '📈 Акции & Крипта', color: 'indigo' },
  { id: 'theme-1-4', deckId: 'deck-1', name: '🎲 Форс-мажор', color: 'amber' },
  { id: 'theme-1-5', deckId: 'deck-1', name: '💎 Стиль Жизни', color: 'rose' },

  // Deck 2 Themes
  { id: 'theme-2-1', deckId: 'deck-2', name: '🍔 Фастфуд Империя', color: 'orange' },
  { id: 'theme-2-2', deckId: 'deck-2', name: '🕶️ Венчурные Инвестиции', color: 'purple' },
  { id: 'theme-2-3', deckId: 'deck-2', name: '🚗 Автопарк', color: 'teal' }
];

const DEFAULT_CARDS: Card[] = [
  // Deck 1 cards
  { id: 'c1', themeId: 'theme-1-1', text: '💡 Вы запустили онлайн-школу по программированию на Node.js! Каждый игрок платит вам по 1,500$ за индивидуальный курс.' },
  { id: 'c2', themeId: 'theme-1-1', text: '🏪 Вы открыли кофейню самообслуживания. Ваш ежемесячный доход вырос! Заберите из банка 2,000$.' },
  { id: 'c3', themeId: 'theme-1-1', text: '📉 Ваш стартап по доставке еды прогорел из-за высокой конкуренции. Оплатите ликвидацию компании в размере 1,800$.' },
  { id: 'c4', themeId: 'theme-1-1', text: '🦄 Ваша IT-компания получила статус "единорога"! Крупный инвестор выкупил долю. Возьмите 10,000$ прибыли!' },

  { id: 'c5', themeId: 'theme-1-2', text: '🏢 Вы приобрели доходный дом со скидкой. Арендаторы платят исправно! Получите 3,500$ пассивного дохода.' },
  { id: 'c6', themeId: 'theme-1-2', text: '🏚️ В вашей квартире-студии случился потоп. Пришлось делать срочный косметический ремонт за 1,200$.' },
  { id: 'c7', themeId: 'theme-1-2', text: '🏜️ Вы выгодно продали дачный участок под застройку шоссе. Банк выплачивает вам компенсацию в размере 5,000$.' },
  { id: 'c8', themeId: 'theme-1-2', text: '🔨 Реновация коммерческого помещения затянулась. Вы платите рабочим неустойку в 1,500$.' },

  { id: 'c9', themeId: 'theme-1-3', text: '🚀 Биткоин преодолел отметку в 150,000$! Ваши кошельки ликуют. Обменяйте крипту и заберите 6,000$.' },
  { id: 'c10', themeId: 'theme-1-3', text: '📉 Скам очередного щиткоина. Вы поверили инвестиционному блогеру и потеряли 2,500$.' },
  { id: 'c11', themeId: 'theme-1-3', text: '💎 Компания Apple выплатила вам дивиденды за рекордный квартал! Заберите из банка 2,200$.' },
  { id: 'c12', themeId: 'theme-1-3', text: '📊 Кассовый разрыв из-за шорт-позиции на бирже. Заплатите брокеру 3,000$ для поддержания مارжевых требований.' },

  { id: 'c13', themeId: 'theme-1-4', text: '🩺 Налоговая проверка! Выявлены мелкие ошибки в декларации. Оплатите штраф ФНС: 1,900$.' },
  { id: 'c14', themeId: 'theme-1-4', text: '🎁 У вас День Рождения! По правилам игры, каждый игрок за столом дарит вам по 500$.' },
  { id: 'c15', themeId: 'theme-1-4', text: '🧥 О, чудо! Вы нашли старую заначку в кармане осенней куртки на сумму 1,000$.' },
  { id: 'c16', themeId: 'theme-1-4', text: '🍿 Вы купили лотерейный билет за 100$ и неожиданно выиграли серебряный кубок и 4,000$ сверху!' },

  { id: 'c17', themeId: 'theme-1-5', text: '🏎️ Вы купили спортивный суперкар в кредит. Обслуживание обходится дорого: заплатите 2,500$.' },
  { id: 'c18', themeId: 'theme-1-5', text: '✈️ Вы улетели на Мальдивы восстанавливать ресурс. Потрачено 3,000$. Зато вы полны сил и получаете +1 действие на следующем ходу!' },
  { id: 'c19', themeId: 'theme-1-5', text: '💆 Вы посетили элитный спа-комплекс и завели полезное знакомство. Скидка на покупку следующей темы бизнеса — 20%.' },

  // Deck 2 cards
  { id: 'c20', themeId: 'theme-2-1', text: '🍔 Бургерная быстрого питания стала популярной в спальном районе. Заберите дневную выручку: 2,500$.' },
  { id: 'c21', themeId: 'theme-2-2', text: '🕶️ Вы инвестировали в искусственный интеллект для генерации мемов. Проект выстрелил! Получите 5,000$.' },
  { id: 'c22', themeId: 'theme-2-3', text: '🚗 Сдача электромобилей в прокат приносит отличный кэшбэк. Получите 3,000$.' }
];

const DEFAULT_RULES: GameRules = {
  text: `<h1>📖 Правила игры «Мама, я богат!»</h1>
<p>Добро пожаловать в современную экономическую симуляцию! Ваша цель — стать самым состоятельным игроком за столом, грамотно управляя активами и проходя через различные жизненные ситуации.</p>

<h3>🎯 Цель игры:</h3>
<p>Набрать активов на сумму <strong>100,000$</strong> или обанкротить других участников игры.</p>

<h3>🎲 Как играть:</h3>
<ol>
  <li>Каждый игрок в начале получает стартовый капитал <strong>10,000$</strong>.</li>
  <li>Игроки ходят по очереди, бросая кубик на реальном поле или играя в свободном режиме.</li>
  <li>При попадании на определенную клетку, игрок выбирает соответствующую тему на экране игры (нажимает кнопку).</li>
  <li>Экран показывает случайную карточку с событием. Игрок зачитывает его вслух и выполняет условия (получает деньги, платит налоги, дарит подарки или покупает бизнес).</li>
</ol>

<h3>👥 Совместный стол (QR-код):</h3>
<ul>
  <li>Один игрок создает стол с помощью кнопки ⚡ <strong>Поделиться столом</strong> в правом нижнем углу.</li>
  <li>Другие игроки сканируют QR-код или переходят по ссылке со своих смартфонов.</li>
  <li>Теперь вы играете за одним столом! При вытягивании карточки какой-либо темы, она изымается из колоды и <strong>не повторится</strong> у других игроков до тех пор, пока карты в теме не кончатся.</li>
</ul>

<h3>💡 Советы начинающим миллионерам:</h3>
<p>— Не вкладывайте все деньги в волатильные активы (например, крипту).<br>
— Пассивный доход от недвижимости поможет пережить любые кризисы и форс-мажоры!</p>
`
};

const DEFAULT_SEO: SEOSettings = {
  title: 'Мама, я богат! — Экономическая Настольная Игра',
  description: 'Потрясающая настольная веб-игра про бизнес, недвижимость и инвестиции. Создавайте столы, сканируйте QR-код и играйте вместе со смартфона!',
  keywords: 'игра, мамаябогат, настольная игра, монополия, кэшфлоу, бизнес, инвестиции, qr-код, софтлайн, настолка',
  headerScript: '',
  bodyScript: '',
  ogTitle: 'Мама, я богат! — Экономическая Настольная Игра',
  ogDescription: 'Потрясающая настольная веб-игра про бизнес, недвижимость и инвестиции. Создавайте столы, сканируйте QR-код и играйте вместе со смартфона!',
  ogImage: 'https://images.unsplash.com/photo-1553481187-be93c21490a9?q=80&w=1000&auto=format&fit=crop',
  ogType: 'website'
};

const DEFAULT_HOME: HomeSettings = {
  title: 'Мама, я богат! 💸',
  subtitle: 'Интерактивная экономическая игра для шумной компании и будущих миллионеров. Создайте единый игровой стол, сканируйте QR с телефона и играйте без повторения карточек!',
  imageUrl: 'https://images.unsplash.com/photo-1553481187-be93c21490a9?q=80&w=1000&auto=format&fit=crop',
  calculatorUrl: 'https://www.google.com/search?q=calculator',
  cardUrl: 'https://docs.google.com/document/d/1_placeholder/edit'
};

const DEFAULT_FOOTER: FooterSettings = {
  text: '© 2026 Настольная игра «Мама, я богат!». Сделано с любовью для будущих инвесторов.'
};

const DEFAULT_ADMIN: AdminSettings = {
  adminLogin: 'admin',
  adminPass: 'admin'
};

export class Database {
  private cache: Schema;

  constructor() {
    this.cache = this.load();
  }

  private load(): Schema {
    try {
      if (!fs.existsSync(DB_DIR)) {
        fs.mkdirSync(DB_DIR, { recursive: true });
      }

      if (fs.existsSync(DB_FILE)) {
        const data = fs.readFileSync(DB_FILE, 'utf-8');
        const parsed = JSON.parse(data);
        // Ensure defaults are merged
        return {
          decks: parsed.decks || DEFAULT_DECKS,
          themes: parsed.themes || DEFAULT_THEMES,
          cards: parsed.cards || DEFAULT_CARDS,
          rules: parsed.rules || DEFAULT_RULES,
          seo: parsed.seo ? { ...DEFAULT_SEO, ...parsed.seo } : DEFAULT_SEO,
          home: parsed.home ? { ...DEFAULT_HOME, ...parsed.home } : DEFAULT_HOME,
          footer: parsed.footer || DEFAULT_FOOTER,
          admin: parsed.admin || DEFAULT_ADMIN,
          stats: parsed.stats || { totalTablesCreated: 0, totalPlayersJoined: 0, history: [] }
        };
      }
    } catch (err) {
      console.error('Error loading database, using default values', err);
    }

    const defaultSchema: Schema = {
      decks: DEFAULT_DECKS,
      themes: DEFAULT_THEMES,
      cards: DEFAULT_CARDS,
      rules: DEFAULT_RULES,
      seo: DEFAULT_SEO,
      home: DEFAULT_HOME,
      footer: DEFAULT_FOOTER,
      admin: DEFAULT_ADMIN,
      stats: { totalTablesCreated: 0, totalPlayersJoined: 0, history: [] }
    };
    this.saveDirect(defaultSchema);
    return defaultSchema;
  }

  private saveDirect(data: Schema) {
    try {
      if (!fs.existsSync(DB_DIR)) {
        fs.mkdirSync(DB_DIR, { recursive: true });
      }
      fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf-8');
    } catch (err) {
      console.error('Error writing to database file', err);
    }
  }

  public save() {
    this.saveDirect(this.cache);
  }

  // Getters
  public getDecks(): Deck[] {
    return this.cache.decks;
  }

  public getThemes(): Theme[] {
    return this.cache.themes;
  }

  public getCards(): Card[] {
    return this.cache.cards;
  }

  public getRules(): GameRules {
    return this.cache.rules;
  }

  public getSEO(): SEOSettings {
    return this.cache.seo;
  }

  public getHome(): HomeSettings {
    return this.cache.home;
  }

  public getFooter(): FooterSettings {
    return this.cache.footer;
  }

  public getAdmin(): AdminSettings {
    return this.cache.admin;
  }

  public getStatsRaw() {
    return this.cache.stats;
  }

  // Setters/Mutations
  public updateDecks(decks: Deck[]) {
    this.cache.decks = decks;
    this.save();
  }

  public updateThemes(themes: Theme[]) {
    this.cache.themes = themes;
    this.save();
  }

  public updateCards(cards: Card[]) {
    this.cache.cards = cards;
    this.save();
  }

  public updateRules(rules: GameRules) {
    this.cache.rules = rules;
    this.save();
  }

  public updateSEO(seo: SEOSettings) {
    this.cache.seo = seo;
    this.save();
  }

  public updateHome(home: HomeSettings) {
    this.cache.home = home;
    this.save();
  }

  public updateFooter(footer: FooterSettings) {
    this.cache.footer = footer;
    this.save();
  }

  public updateAdmin(admin: AdminSettings) {
    this.cache.admin = admin;
    this.save();
  }

  public logTableCreated(roomId: string) {
    this.cache.stats.totalTablesCreated += 1;
    this.cache.stats.history.push({
      event: 'table_created',
      timestamp: new Date().toISOString(),
      roomId
    });
    this.save();
  }

  public logPlayerJoined(roomId: string) {
    this.cache.stats.totalPlayersJoined += 1;
    this.cache.stats.history.push({
      event: 'player_joined',
      timestamp: new Date().toISOString(),
      roomId
    });
    this.save();
  }

  public logCardPulled(roomId: string, cardId: string) {
    this.cache.stats.history.push({
      event: 'card_pulled',
      timestamp: new Date().toISOString(),
      roomId,
      cardId
    });
    this.save();
  }
}

export const db = new Database();
export default db;
