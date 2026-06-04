import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Trash2, 
  Save, 
  Settings, 
  Database, 
  BarChart4, 
  Check, 
  Layout, 
  Layers, 
  HelpCircle, 
  ShieldAlert, 
  Globe, 
  Image, 
  Calendar,
  Lock,
  Download,
  Upload,
  KeyRound,
  Wrench,
  Sparkles,
  X,
  Heading1,
  Heading2,
  Heading3,
  Bold,
  Italic,
  Underline,
  List,
  ListOrdered,
  Quote,
  Code,
  Link,
  Table,
  Minus,
  Smile,
  Eye,
  EyeOff,
  Columns,
  Activity,
  Clock,
  Flame,
  RefreshCcw,
  Search,
  Gamepad2,
  TrendingUp,
  Users,
  ArrowUpRight
} from 'lucide-react';
import { Deck, Theme, Card, SEOSettings, HomeSettings, FooterSettings, GameStats, TableStats } from '../types';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell
} from 'recharts';

interface BundleData {
  decks: Deck[];
  themes: Theme[];
  cards: Card[];
  rules: { text: string };
  seo: SEOSettings;
  home: HomeSettings;
  footer: FooterSettings;
  admin: { adminLogin: string };
}

export default function AdminPanel() {
  const [activeTab, setActiveTab] = useState<'decks' | 'cards' | 'rules' | 'home' | 'seo' | 'stats'>('decks');
  const [bundle, setBundle] = useState<BundleData | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Local admin changes
  const [decks, setDecks] = useState<Deck[]>([]);
  const [themes, setThemes] = useState<Theme[]>([]);
  const [cards, setCards] = useState<Card[]>([]);
  const [rulesText, setRulesText] = useState('');
  const [rulesViewMode, setRulesViewMode] = useState<'editor' | 'preview' | 'split'>('split');
  const [seo, setSeo] = useState<SEOSettings>({ title: '', description: '', keywords: '', headerScript: '', bodyScript: '' });
  const [home, setHome] = useState<HomeSettings>({ title: '', subtitle: '', imageUrl: '', calculatorUrl: '', cardUrl: '' });
  const [footer, setFooter] = useState<FooterSettings>({ text: '' });
  
  // Credentials edit state
  const [adminLogin, setAdminLogin] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  
  // Stats state
  const [stats, setStats] = useState<GameStats | null>(null);
  const [filterFrom, setFilterFrom] = useState('');
  const [filterTo, setFilterTo] = useState('');
  const [logSearchQuery, setLogSearchQuery] = useState('');
  const [logEventFilter, setLogEventFilter] = useState<'all' | 'table_created' | 'player_joined' | 'card_pulled'>('all');

  // Selected filter tags in administrative card management
  const [selectedDeckId, setSelectedDeckId] = useState<string>('');
  const [selectedThemeId, setSelectedThemeId] = useState<string>('');

  // Notification message
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  useEffect(() => {
    fetchBundle();
    fetchStats();
  }, []);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 5000); // 5 seconds for detail-rich import stats readability
  };

  const [importing, setImporting] = useState(false);
  const [imageDragging, setImageDragging] = useState(false);

  const handleHomeImageUpload = (file: File) => {
    if (!file.type.startsWith('image/')) {
      showToast('Пожалуйста, выберите файл изображения (png, jpeg, webp, svg)', 'error');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      if (result) {
        setHome(prev => ({ ...prev, imageUrl: result }));
        showToast('Изображение успешно загружено в буфер! Для сохранения нажмите кнопку сохранения внизу.', 'success');
      }
    };
    reader.onerror = () => {
      showToast('Ошибка при чтении файла', 'error');
    };
    reader.readAsDataURL(file);
  };

  const handleHomeImageDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setImageDragging(true);
  };

  const handleHomeImageDragLeave = () => {
    setImageDragging(false);
  };

  const handleHomeImageDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setImageDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      handleHomeImageUpload(file);
    }
  };

  const handleExcelImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      const result = event.target?.result as string;
      if (!result) return;
      
      const base64Data = result.split(',')[1];
      
      setImporting(true);
      try {
        const response = await fetch('/api/admin/import-excel', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ fileData: base64Data })
        });
        
        const res = await response.json();
        setImporting(false);
        if (res.success) {
          showToast(`Импорт завершен! Создано: наборов: ${res.summary.decksCreated}, тем: ${res.summary.themesCreated}, карточек: ${res.summary.cardsCreated}; обновлено существующих: ${res.summary.cardsUpdated}. Всего в базе: ${res.summary.totalCards} карточек.`, 'success');
          fetchBundle();
        } else {
          showToast(res.error || 'Ошибка импорта', 'error');
        }
      } catch (err: any) {
        setImporting(false);
        showToast('Произошла непредвиденная ошибка при импорте', 'error');
        console.error(err);
      }
    };
    reader.onerror = () => {
      showToast('Ошибка чтения файла', 'error');
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const fetchBundle = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/admin/bundle');
      if (res.ok) {
        const data: BundleData = await res.json();
        setBundle(data);
        setDecks(data.decks);
        setThemes(data.themes);
        setCards(data.cards);
        setRulesText(data.rules.text);
        setSeo(data.seo);
        setHome(data.home);
        setFooter(data.footer);
        setAdminLogin(data.admin.adminLogin);

        if (data.decks.length > 0) {
          const firstDeck = data.decks[0];
          setSelectedDeckId(firstDeck.id);
          const deckThemes = data.themes.filter(t => t.deckId === firstDeck.id);
          if (deckThemes.length > 0) {
            setSelectedThemeId(deckThemes[0].id);
          } else if (data.themes.length > 0) {
            setSelectedThemeId(data.themes[0].id);
          }
        } else if (data.themes.length > 0) {
          setSelectedThemeId(data.themes[0].id);
        }
      }
    } catch (err) {
      console.error(err);
      showToast('Ошибка загрузки данных базы', 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      let query = '';
      if (filterFrom || filterTo) {
        query = `?from=${filterFrom}&to=${filterTo}`;
      }
      const res = await fetch(`/api/admin/stats${query}`);
      if (res.ok) {
        const data = await res.json();
        setStats(data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const applyDbChanges = async (endpoint: string, payload: any, successMsg: string) => {
    try {
      const res = await fetch(`/api/admin/${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        showToast(successMsg, 'success');
        fetchBundle();
      } else {
        const err = await res.json();
        showToast(err.error || 'Ошибка при сохранении', 'error');
      }
    } catch (err) {
      showToast('Ошибка при отправке запроса', 'error');
    }
  };

  // --- Decks & Themes Management Operations ---
  const handleAddDeck = () => {
    const newId = 'deck_' + Date.now();
    const newDeck: Deck = {
      id: newId,
      name: 'Новый комплект ' + (decks.length + 1),
      isDefault: DecksNoDefaultsYet()
    };
    setDecks([...decks, newDeck]);
  };

  const DecksNoDefaultsYet = () => {
    return decks.filter(d => d.isDefault).length === 0;
  };

  const setDeckDefault = (id: string) => {
    const updated = decks.map(d => ({
      ...d,
      isDefault: d.id === id
    }));
    setDecks(updated);
  };

  const handleDeleteDeck = (id: string) => {
    setDecks(decks.filter(d => d.id !== id));
    setThemes(themes.filter(t => t.deckId !== id)); // cascading delete
  };

  const handleAddTheme = (deckId: string) => {
    const newId = 'theme_' + Date.now();
    const colors = ['emerald', 'sky', 'indigo', 'amber', 'rose', 'purple', 'orange', 'teal'];
    const randomColor = colors[Math.floor(Math.random() * colors.length)];
    const newTheme: Theme = {
      id: newId,
      deckId,
      name: 'Новая тема ' + (themes.filter(t => t.deckId === deckId).length + 1),
      color: randomColor
    };
    setThemes([...themes, newTheme]);
    setSelectedThemeId(newId);
  };

  const handleDeleteTheme = (id: string) => {
    setThemes(themes.filter(t => t.id !== id));
    setCards(cards.filter(c => c.themeId !== id)); // cascading delete
  };

  const handleSaveDecksThemes = () => {
    // Save decks & themes sequentially
    applyDbChanges('decks', { decks }, 'Комплекты сохранены');
    applyDbChanges('themes', { themes }, 'Цветовые темы сохранены');
  };

  // --- Cards Operations ---
  const handleAddCard = () => {
    if (!selectedThemeId) {
      alert('Сначала выберите или создайте тему!');
      return;
    }
    const newCard: Card = {
      id: 'card_' + Date.now(),
      themeId: selectedThemeId,
      text: 'Новое задание...'
    };
    setCards([newCard, ...cards]);
  };

  const handleCardTextChange = (id: string, newText: string) => {
    setCards(cards.map(c => c.id === id ? { ...c, text: newText } : c));
  };

  const handleDeleteCard = (id: string) => {
    setCards(cards.filter(c => c.id !== id));
  };

  const handleSaveCards = () => {
    applyDbChanges('cards', { cards }, 'Карточки успешно сохранены');
  };

  // --- Rules formatting helper ---
  const insertFormatting = (
    tag: 'h1' | 'h2' | 'h3' | 'paragraph' | 'bold' | 'italic' | 'underline' | 'list' | 'numlist' | 'quote' | 'code' | 'link' | 'hr' | 'table' | 'emoji',
    emojiChar?: string
  ) => {
    let content = '';
    const textarea = document.getElementById('rules-textarea') as HTMLTextAreaElement;
    if (!textarea) return;

    const startIdx = textarea.selectionStart;
    const endIdx = textarea.selectionEnd;
    const selected = rulesText.substring(startIdx, endIdx);

    switch (tag) {
      case 'h1':
        content = `<h1>${selected || 'Большой заголовок'}</h1>`;
        break;
      case 'h2':
        content = `<h2>${selected || 'Средний заголовок'}</h2>`;
        break;
      case 'h3':
        content = `<h3>${selected || 'Раздел правил'}</h3>`;
        break;
      case 'paragraph':
        content = `<p>${selected || 'Новый абзац текста.'}</p>`;
        break;
      case 'bold':
        content = `<strong>${selected || 'Жирный текст'}</strong>`;
        break;
      case 'italic':
        content = `<em>${selected || 'Курсивный текст'}</em>`;
        break;
      case 'underline':
        content = `<u>${selected || 'Подчеркнутый текст'}</u>`;
        break;
      case 'list':
        content = `<ul>\n  <li>${selected || 'Элемент списка 1'}</li>\n  <li>Элемент списка 2</li>\n</ul>`;
        break;
      case 'numlist':
        content = `<ol>\n  <li>${selected || 'Первый пункт'}</li>\n  <li>Второй пункт</li>\n</ol>`;
        break;
      case 'quote':
        content = `<blockquote>${selected || 'Важная цитата или правило...'}</blockquote>`;
        break;
      case 'code':
        content = `<code>${selected || 'код_или_значение'}</code>`;
        break;
      case 'link':
        content = `<a href="https://example.com" target="_blank">${selected || 'Текст ссылки'}</a>`;
        break;
      case 'hr':
        content = `\n<hr />\n`;
        break;
      case 'table':
        content = `\n<table>
  <thead>
    <tr>
      <th>Параметр</th>
      <th>Описание</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td>Правило 1</td>
      <td>Описание правила</td>
    </tr>
  </tbody>
</table>\n`;
        break;
      case 'emoji':
        content = emojiChar ? `${emojiChar} ` : '💸 ';
        break;
    }

    const nextText = rulesText.substring(0, startIdx) + content + rulesText.substring(endIdx);
    setRulesText(nextText);
    
    // Recovery of selection state
    setTimeout(() => {
      textarea.focus();
      const newCursorPos = startIdx + content.length;
      textarea.setSelectionRange(newCursorPos, newCursorPos);
    }, 50);
  };

  const handleSaveRules = () => {
    applyDbChanges('rules', { text: rulesText }, 'Правила игры успешно обновлены');
  };

  const handleSaveHome = () => {
    applyDbChanges('home', home, 'Настройки главной страницы сохранены');
  };

  const handleSaveSeo = () => {
    applyDbChanges('seo', seo, 'Настройки SEO сохранены');
  };

  const handleSaveFooter = () => {
    applyDbChanges('footer', footer, 'Пользовательский футер обновлен');
  };

  const handleUpdateCredentials = async () => {
    if (!adminPassword) {
      alert('Укажите пароль!');
      return;
    }
    try {
      const res = await fetch('/api/admin/credentials', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ login: adminLogin, password: adminPassword })
      });
      if (res.ok) {
        showToast('Учетные данные администратора обновлены', 'success');
        setAdminPassword('');
      } else {
        showToast('Ошибка обновления пароля', 'error');
      }
    } catch {
      showToast('Ошибка сети', 'error');
    }
  };

  const triggerRawDataReset = () => {
    if (confirm('Сбросить все созданные вами карточки, деки и настроить заново под заводские дефолтные?')) {
      window.location.reload();
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-600 mb-2" />
        <span className="text-xs font-semibold text-slate-500">Загружаем базу данных...</span>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6 animate-fade-in relative">
      {/* Toast Alert Indicator */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 rounded-2xl p-4 shadow-xl border flex items-center gap-2.5 max-w-sm animate-scale-up ${
          toast.type === 'success' ? 'bg-emerald-50 border-emerald-100 text-emerald-800' : 'bg-rose-50 border-rose-100 text-rose-800'
        }`}>
          <Check size={16} className={toast.type === 'success' ? 'text-emerald-600' : 'text-rose-600'} />
          <span className="text-xs font-bold leading-normal">{toast.message}</span>
        </div>
      )}

      {/* Admin Dashboard header */}
      <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="p-3 bg-fuchsia-50 rounded-2xl text-fuchsia-600">
            <Database className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-xl font-black text-slate-800 tracking-tight">Панель Управления</h1>
            <p className="text-xs text-slate-500">Редактирование игрового каталога компелектов, тем, правил и игровой статистики</p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Excel Export Button */}
          <a
            href="/api/admin/export-excel"
            className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-750 border border-emerald-200/40 font-bold rounded-xl text-xs transition-colors cursor-pointer"
            title="Скачать весь контент (наборы, темы, вопросы) как Excel файл (.xlsx)"
          >
            <Download size={14} />
            <span>Экспорт в Excel</span>
          </a>

          {/* Excel Import Button */}
          <label
            className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-blue-50 hover:bg-blue-100 text-blue-750 border border-blue-200/40 font-bold rounded-xl text-xs transition-colors cursor-pointer relative"
            title="Загрузить измененный Excel файл (.xlsx) в базу данных"
          >
            <Upload size={14} />
            <span>{importing ? 'Загрузка...' : 'Импорт из Excel'}</span>
            <input
              type="file"
              accept=".xlsx,.xls,.csv"
              onChange={handleExcelImport}
              className="hidden"
              disabled={importing}
            />
          </label>

          <button
            onClick={triggerRawDataReset}
            className="p-2.5 border border-slate-100 hover:bg-slate-50 text-slate-400 hover:text-slate-600 rounded-xl cursor-pointer"
            title="Сбросить к заводским"
          >
            <Trash2 size={16} />
          </button>
        </div>
      </div>

      {/* Subsection Tab Bar */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 select-none border-b border-slate-100 pr-4">
        {[
          { id: 'decks', label: 'Комплекты & Темы', icon: Layers },
          { id: 'cards', label: 'Карточки вопросов', icon: Layout },
          { id: 'rules', label: 'Редактор правил', icon: HelpCircle },
          { id: 'home', label: 'Главная страница', icon: Image },
          { id: 'seo', label: 'Настройки & СЕО', icon: Globe },
          { id: 'stats', label: 'Игровая статистика', icon: BarChart4 }
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 shrink-0 transition-colors cursor-pointer ${
                isActive 
                  ? 'border-emerald-600 text-emerald-700' 
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              <Icon size={14} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* MAIN ADMIN WORKSPACES */}
      {activeTab === 'decks' && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-xs">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-6">
              <div>
                <h2 className="text-base font-bold text-slate-800">1. Игровые Комплекты (Деки)</h2>
                <p className="text-xs text-slate-400">Выберите один комплект по умолчанию, который будет отображаться на странице игры</p>
              </div>
              <button
                onClick={handleAddDeck}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs transition-colors cursor-pointer"
              >
                <Plus size={14} />
                <span>Создать комплект</span>
              </button>
            </div>

            <div className="space-y-4">
              {decks.length === 0 ? (
                <p className="text-xs text-slate-400 italic py-4 text-center">Комплекты отсутствуют</p>
              ) : (
                decks.map((deck) => (
                  <div key={deck.id} className="p-5 bg-slate-50 border border-slate-100 rounded-2xl flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
                    <div className="flex-1 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                      <input
                        type="text"
                        value={deck.name}
                        onChange={(e) => {
                          const updated = decks.map(d => d.id === deck.id ? { ...d, name: e.target.value } : d);
                          setDecks(updated);
                        }}
                        className="flex-1 px-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/10 focus:border-emerald-500 outline-none text-xs font-semibold text-slate-800"
                        placeholder="Название комплекта..."
                      />
                      
                      {/* Check Default */}
                      <button
                        onClick={() => setDeckDefault(deck.id)}
                        className={`px-3 py-2 border rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                          deck.isDefault 
                            ? 'bg-emerald-50 border-emerald-200 text-emerald-800' 
                            : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'
                        }`}
                      >
                        {deck.isDefault ? <Check size={14} className="text-emerald-600" /> : null}
                        <span>{deck.isDefault ? 'По умолчанию' : 'Сделать дефолтным'}</span>
                      </button>
                    </div>

                    <div className="flex items-center gap-2 self-end sm:self-auto">
                      <button
                        onClick={() => handleAddTheme(deck.id)}
                        className="inline-flex items-center gap-1.5 px-3 py-2 border border-slate-200 hover:bg-slate-100 text-xs font-semibold rounded-xl text-slate-700 cursor-pointer"
                      >
                        <Plus size={14} />
                        <span>Добавить тему</span>
                      </button>
                      <button
                        onClick={() => handleDeleteDeck(deck.id)}
                        className="p-2 border border-rose-100 hover:bg-rose-50 text-rose-600 hover:text-rose-800 rounded-xl transition-all cursor-pointer"
                        title="Удалить комплект"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-xs">
            <h2 className="text-base font-bold text-slate-800 pb-3 border-b border-slate-100 mb-6">2. Темы в Комплектах (Стилизация)</h2>
            <div className="space-y-6">
              {decks.map(deck => {
                const deckThemes = themes.filter(t => t.deckId === deck.id);
                return (
                  <div key={deck.id} className="border border-slate-200/80 rounded-2xl p-5 bg-white">
                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Комплект: {deck.name}</h4>
                    
                    {deckThemes.length === 0 ? (
                      <p className="text-xs text-slate-400 italic py-2">Темы не настроены для этого комплекта.</p>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {deckThemes.map(theme => (
                          <div key={theme.id} className="p-4 bg-slate-50/70 border border-slate-100 rounded-xl space-y-3">
                            <div className="flex items-center gap-2">
                              {/* Color box */}
                              <span className={`h-4 w-4 rounded-full shrink-0 ${
                                theme.color === 'emerald' ? 'bg-emerald-500' :
                                theme.color === 'sky' ? 'bg-sky-500' :
                                theme.color === 'indigo' ? 'bg-indigo-500' :
                                theme.color === 'amber' ? 'bg-amber-500' :
                                theme.color === 'rose' ? 'bg-rose-500' :
                                theme.color === 'purple' ? 'bg-purple-500' :
                                theme.color === 'orange' ? 'bg-orange-500' :
                                theme.color === 'teal' ? 'bg-teal-500' : 'bg-slate-400'
                              }`} />
                              <input
                                type="text"
                                value={theme.name}
                                onChange={(e) => {
                                  const updated = themes.map(t => t.id === theme.id ? { ...t, name: e.target.value } : t);
                                  setThemes(updated);
                                }}
                                className="flex-1 bg-transparent hover:bg-white text-xs font-bold text-slate-800 outline-none p-1.5 focus:bg-white rounded border border-transparent focus:border-slate-200 transition-all font-semibold"
                              />
                              <button 
                                onClick={() => handleDeleteTheme(theme.id)}
                                className="p-1 hover:bg-rose-50 text-rose-500 rounded cursor-pointer"
                                title="Удалить тему"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>

                            {/* Color Picker */}
                            <div>
                              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1.5">Цветовой фон кнопки:</p>
                              <div className="flex flex-wrap gap-1">
                                {['emerald', 'sky', 'indigo', 'amber', 'rose', 'purple', 'orange', 'teal'].map((colorName) => (
                                  <button
                                    key={colorName}
                                    onClick={() => {
                                      const updated = themes.map(t => t.id === theme.id ? { ...t, color: colorName } : t);
                                      setThemes(updated);
                                    }}
                                    className={`h-6 px-2 rounded-md text-[9px] font-bold text-white transition-all scale-100 cursor-pointer ${
                                      theme.color === colorName ? 'ring-2 ring-slate-850 ring-offset-1 font-extrabold' : 'opacity-70'
                                    } ${
                                      colorName === 'emerald' ? 'bg-emerald-500' :
                                      colorName === 'sky' ? 'bg-sky-500' :
                                      colorName === 'indigo' ? 'bg-indigo-500' :
                                      colorName === 'amber' ? 'bg-amber-500' :
                                      colorName === 'rose' ? 'bg-rose-500' :
                                      colorName === 'purple' ? 'bg-purple-500' :
                                      colorName === 'orange' ? 'bg-orange-500' : 'bg-teal-500'
                                    }`}
                                  >
                                    {colorName}
                                  </button>
                                ))}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <button
              onClick={handleSaveDecksThemes}
              className="inline-flex items-center gap-1.5 px-6 py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-2xl text-xs shadow-md transition-all active:scale-98 cursor-pointer"
            >
              <Save size={14} />
              <span>Сохранить комплекты и темы</span>
            </button>
          </div>
        </div>
      )}

      {activeTab === 'cards' && (
        <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-xs space-y-6">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 pb-4 border-b border-slate-100 mb-4">
            <div>
              <h2 className="text-base font-bold text-slate-800">Игровые Карточки вопросов</h2>
              <p className="text-xs text-slate-400">Выберите сначала игровой комплект (набор), а затем тему для редактирования списка входящих вопросов</p>
            </div>
            
            <button
              onClick={handleAddCard}
              className="inline-flex items-center gap-1.5 px-3.5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs transition-colors cursor-pointer self-start sm:self-auto shadow-2xs"
            >
              <Plus size={14} />
              <span>Добавить карточку</span>
            </button>
          </div>

          {/* Step 1: Deck selection */}
          <div className="space-y-2">
            <span className="block text-xs font-bold text-slate-550 uppercase tracking-widest">Шаг 1: Выберите игровой комплект (набор):</span>
            <div className="flex flex-wrap gap-2">
              {decks.length === 0 ? (
                <p className="text-xs text-slate-400 italic">Сначала создайте комплекты во вкладке "Комплекты & Темы"</p>
              ) : (
                decks.map(d => {
                  const isActive = selectedDeckId === d.id;
                  const totalCardsInDeck = cards.filter(c => {
                    const deckThemeIds = themes.filter(t => t.deckId === d.id).map(t => t.id);
                    return deckThemeIds.includes(c.themeId);
                  }).length;
                  return (
                    <button
                      key={d.id}
                      onClick={() => {
                        setSelectedDeckId(d.id);
                        const deckThemes = themes.filter(t => t.deckId === d.id);
                        if (deckThemes.length > 0) {
                          setSelectedThemeId(deckThemes[0].id);
                        } else {
                          setSelectedThemeId('');
                        }
                      }}
                      className={`px-4 py-2.5 text-xs font-bold rounded-xl border transition-all cursor-pointer flex items-center gap-2 ${
                        isActive 
                          ? 'bg-slate-800 border-slate-800 text-white shadow-sm scale-102' 
                          : 'bg-slate-50 hover:bg-slate-100 text-slate-600 border-slate-200'
                      }`}
                    >
                      <span>{d.name}</span>
                      <span className={`px-1.5 py-0.5 rounded-md text-[10px] ${isActive ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-700'}`}>
                        {totalCardsInDeck}
                      </span>
                    </button>
                  );
                })
              )}
            </div>
          </div>

          {/* Step 2: Theme selection within selected deck */}
          <div className="space-y-2">
            <span className="block text-xs font-bold text-slate-550 uppercase tracking-widest">Шаг 2: Выберите тему из этого комплекта:</span>
            <div className="flex flex-wrap gap-2">
              {themes.filter(t => t.deckId === selectedDeckId).length === 0 ? (
                <p className="text-xs text-slate-550 italic bg-amber-50/50 border border-amber-100/50 p-3 rounded-xl w-full">
                  ⚠️ В выбранном комплекте пока не создано ни одной темы. Перейдите во вкладку "Комплекты & Темы" и добавьте темы для этого комплекта!
                </p>
              ) : (
                themes.filter(t => t.deckId === selectedDeckId).map(t => {
                  const isActive = selectedThemeId === t.id;
                  const cardCount = cards.filter(c => c.themeId === t.id).length;
                  
                  // Style based on theme color for premium accents
                  let themeAccentClass = 'border-slate-200';
                  if (isActive) {
                    themeAccentClass = 
                      t.color === 'emerald' ? 'bg-emerald-600 border-emerald-600 text-white shadow-3xs' :
                      t.color === 'sky' ? 'bg-sky-600 border-sky-600 text-white shadow-3xs' :
                      t.color === 'indigo' ? 'bg-indigo-600 border-indigo-600 text-white shadow-3xs' :
                      t.color === 'amber' ? 'bg-amber-600 border-amber-600 text-white shadow-3xs' :
                      t.color === 'rose' ? 'bg-rose-600 border-rose-600 text-white shadow-3xs' :
                      t.color === 'purple' ? 'bg-purple-600 border-purple-600 text-white shadow-3xs' :
                      t.color === 'orange' ? 'bg-orange-600 border-orange-600 text-white shadow-3xs' :
                      'bg-teal-600 border-teal-600 text-white shadow-3xs';
                  } else {
                    themeAccentClass = 'bg-slate-50/70 hover:bg-slate-100 text-slate-600 border-slate-200';
                  }

                  return (
                    <button
                      key={t.id}
                      onClick={() => setSelectedThemeId(t.id)}
                      className={`px-3.5 py-2 text-xs font-black rounded-xl border transition-all cursor-pointer flex items-center gap-1.5 ${themeAccentClass}`}
                    >
                      <span className={`h-2.5 w-2.5 rounded-full shrink-0 ${
                        t.color === 'emerald' ? 'bg-emerald-400' :
                        t.color === 'sky' ? 'bg-sky-400' :
                        t.color === 'indigo' ? 'bg-indigo-400' :
                        t.color === 'amber' ? 'bg-amber-400' :
                        t.color === 'rose' ? 'bg-rose-400' :
                        t.color === 'purple' ? 'bg-purple-400' :
                        t.color === 'orange' ? 'bg-orange-400' : 'bg-teal-400'
                      }`} />
                      <span>{t.name}</span>
                      <span className={`px-1.5 py-0.2 rounded-sm text-[9px] font-extrabold ${isActive ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-600'}`}>
                        {cardCount}
                      </span>
                    </button>
                  );
                })
              )}
            </div>
          </div>

          {/* Current Focus Metadata header */}
          {selectedThemeId && (
            <div className="bg-slate-50/80 border border-slate-100 px-5 py-3.5 rounded-2xl flex flex-wrap items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="p-1 px-2 bg-white text-slate-500 rounded-lg shadow-3xs font-black text-[9px] uppercase tracking-wider">
                  Текущий фокус:
                </span>
                <span className="font-extrabold text-slate-800">
                  {themes.find(t => t.id === selectedThemeId)?.name || 'Тема не выбрана'}
                </span>
                <span className="text-slate-400">
                  из комплекта
                </span>
                <span className="font-extrabold text-slate-700 bg-slate-200/50 px-2 py-0.5 rounded-md text-[11px]">
                  {decks.find(d => d.id === selectedDeckId)?.name || 'Комплект не выбран'}
                </span>
              </div>
              <div className="font-black text-emerald-700 bg-emerald-50 px-3 py-1 rounded-lg border border-emerald-100">
                Всего вопросов в теме: {cards.filter(c => c.themeId === selectedThemeId).length} шт.
              </div>
            </div>
          )}

          {/* Tabular cards list display */}
          <div className="pt-2">
            {cards.filter(c => c.themeId === selectedThemeId).length === 0 ? (
              <div className="text-center py-16 border border-dashed border-slate-200 rounded-2xl bg-slate-50/20">
                <Layout className="h-9 w-9 text-slate-300 mx-auto mb-2.5 animate-pulse" />
                <p className="text-xs text-slate-400">В выбранной теме пока нет ни одной карточки. Добавьте первую карточку кнопкой "Добавить карточку" выше!</p>
              </div>
            ) : (
              <div className="overflow-x-auto border border-slate-200/80 rounded-2xl shadow-3xs">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50/90 border-b border-slate-200/80 text-slate-550 font-extrabold uppercase tracking-wider">
                      <th className="px-4 py-3.5 w-12 text-center font-black">#</th>
                      <th className="px-5 py-3.5">Текстовая формулировка задания / вопроса</th>
                      <th className="px-4 py-3.5 w-52">Принадлежность</th>
                      <th className="px-4 py-3.5 w-24 text-center">Действие</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {cards.filter(c => c.themeId === selectedThemeId).map((card, idx) => {
                      const themeObj = themes.find(t => t.id === card.themeId);
                      const deckObj = themeObj ? decks.find(d => d.id === themeObj.deckId) : null;
                      return (
                        <tr key={card.id} className="hover:bg-slate-50/30 transition-colors">
                          <td className="px-4 py-4 text-center text-slate-400 font-bold align-top pt-5">
                            {idx + 1}
                          </td>
                          <td className="px-4 py-2 align-top">
                            <textarea
                              value={card.text}
                              onChange={(e) => handleCardTextChange(card.id, e.target.value)}
                              rows={2}
                              className="w-full p-2.5 bg-transparent hover:bg-slate-50 focus:bg-white border border-transparent focus:border-slate-200 rounded-xl outline-none text-xs font-semibold text-slate-700 leading-relaxed resize-none transition-all focus:shadow-3xs"
                              placeholder="Введите текст задания..."
                            />
                          </td>
                          <td className="px-4 py-4 align-top pt-5 text-[11px] text-slate-500 space-y-1 select-none">
                            <div className="flex items-center gap-1.5">
                              <span className={`h-2.5 w-2.5 rounded-full ${
                                themeObj?.color === 'emerald' ? 'bg-emerald-500' :
                                themeObj?.color === 'sky' ? 'bg-sky-500' :
                                themeObj?.color === 'indigo' ? 'bg-indigo-500' :
                                themeObj?.color === 'amber' ? 'bg-amber-500' :
                                themeObj?.color === 'rose' ? 'bg-rose-500' :
                                themeObj?.color === 'purple' ? 'bg-purple-500' :
                                themeObj?.color === 'orange' ? 'bg-orange-500' : 'bg-teal-500'
                              }`} />
                              <span className="font-extrabold text-slate-800">{themeObj?.name || '—'}</span>
                            </div>
                            <div className="text-[10px] text-slate-400">
                              Набор: <span className="font-extrabold text-slate-600">{deckObj?.name || '—'}</span>
                            </div>
                          </td>
                          <td className="px-4 py-4 align-top pt-4">
                            <div className="flex justify-center">
                              <button
                                onClick={() => handleDeleteCard(card.id)}
                                className="p-2 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-xl transition-all cursor-pointer"
                                title="Удалить карточку"
                              >
                                <Trash2 size={15} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {cards.filter(c => c.themeId === selectedThemeId).length > 0 && (
            <div className="flex justify-end pt-2">
              <button
                onClick={handleSaveCards}
                className="inline-flex items-center gap-1.5 px-6 py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-2xl text-xs shadow-md transition-all active:scale-98 cursor-pointer"
              >
                <Save size={14} />
                <span>Сохранить список карточек ({cards.filter(c => c.themeId === selectedThemeId).length})</span>
               </button>
            </div>
          )}
        </div>
      )}

      {activeTab === 'rules' && (
        <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-xs space-y-6 animate-fade-in">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4 flex-wrap gap-3">
            <div>
              <h2 className="text-base font-bold text-slate-800">Редактор Правил Игры (Markdown / HTML)</h2>
              <p className="text-xs text-slate-400">Настройки правил игры. Вы можете использовать разметку HTML и спец-стили для оформления разделов</p>
            </div>
            
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl shadow-4xs select-none">
              <button
                type="button"
                onClick={() => setRulesViewMode('editor')}
                className={`px-3 py-1.5 flex items-center gap-1.5 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                  rulesViewMode === 'editor' ? 'bg-white shadow-3xs text-slate-800' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                <EyeOff size={12} />
                <span>Редактор</span>
              </button>
              <button
                type="button"
                onClick={() => setRulesViewMode('split')}
                className={`px-3 py-1.5 flex items-center gap-1.5 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                  rulesViewMode === 'split' ? 'bg-white shadow-3xs text-slate-800' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                <Columns size={12} />
                <span>Сплит-экран</span>
              </button>
              <button
                type="button"
                onClick={() => setRulesViewMode('preview')}
                className={`px-3 py-1.5 flex items-center gap-1.5 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                  rulesViewMode === 'preview' ? 'bg-white shadow-3xs text-slate-800' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                <Eye size={12} />
                <span>Предпросмотр</span>
              </button>
            </div>
          </div>

          {/* Quick formatting toolbar */}
          {rulesViewMode !== 'preview' && (
            <div className="flex flex-wrap items-center gap-1.5 p-2 bg-slate-50 border border-slate-200/60 rounded-2xl">
              {/* Headings */}
              <button 
                type="button"
                onClick={() => insertFormatting('h1')} 
                className="p-2 hover:bg-white border border-transparent hover:border-slate-200 text-slate-600 hover:text-slate-950 rounded-xl transition-all cursor-pointer flex items-center justify-center"
                title="Заголовок H1 (Крупный)"
              >
                <Heading1 size={15} />
              </button>
              <button 
                type="button"
                onClick={() => insertFormatting('h2')} 
                className="p-2 hover:bg-white border border-transparent hover:border-slate-200 text-slate-600 hover:text-slate-950 rounded-xl transition-all cursor-pointer flex items-center justify-center"
                title="Заголовок H2 (Средний)"
              >
                <Heading2 size={15} />
              </button>
              <button 
                type="button"
                onClick={() => insertFormatting('h3')} 
                className="p-2 hover:bg-white border border-transparent hover:border-slate-200 text-slate-600 hover:text-slate-950 rounded-xl transition-all cursor-pointer flex items-center justify-center"
                title="Раздел H3 (Мелкий)"
              >
                <Heading3 size={15} />
              </button>
              
              <div className="w-px h-5 bg-slate-200 mx-1" />

              {/* Text styles */}
              <button 
                type="button"
                onClick={() => insertFormatting('bold')} 
                className="p-2 hover:bg-white border border-transparent hover:border-slate-200 text-slate-600 hover:text-slate-950 rounded-xl transition-all cursor-pointer flex items-center justify-center"
                title="Жирный текст <strong>"
              >
                <Bold size={15} />
              </button>
              <button 
                type="button"
                onClick={() => insertFormatting('italic')} 
                className="p-2 hover:bg-white border border-transparent hover:border-slate-200 text-slate-600 hover:text-slate-950 rounded-xl transition-all cursor-pointer flex items-center justify-center"
                title="Курсив <em>"
              >
                <Italic size={15} />
              </button>
              <button 
                type="button"
                onClick={() => insertFormatting('underline')} 
                className="p-2 hover:bg-white border border-transparent hover:border-slate-200 text-slate-600 hover:text-slate-950 rounded-xl transition-all cursor-pointer flex items-center justify-center"
                title="Подчеркнутый <u>"
              >
                <Underline size={15} />
              </button>

              <div className="w-px h-5 bg-slate-200 mx-1" />

              {/* Content lists & layouts */}
              <button 
                type="button"
                onClick={() => insertFormatting('list')} 
                className="p-2 hover:bg-white border border-transparent hover:border-slate-200 text-slate-600 hover:text-slate-950 rounded-xl transition-all cursor-pointer flex items-center justify-center"
                title="Маркированный список <ul>"
              >
                <List size={15} />
              </button>
              <button 
                type="button"
                onClick={() => insertFormatting('numlist')} 
                className="p-2 hover:bg-white border border-transparent hover:border-slate-200 text-slate-600 hover:text-slate-950 rounded-xl transition-all cursor-pointer flex items-center justify-center"
                title="Нумерованный список <ol>"
              >
                <ListOrdered size={15} />
              </button>
              <button 
                type="button"
                onClick={() => insertFormatting('quote')} 
                className="p-2 hover:bg-white border border-transparent hover:border-slate-200 text-slate-600 hover:text-slate-950 rounded-xl transition-all cursor-pointer flex items-center justify-center"
                title="Цитата / Важное <blockquote>"
              >
                <Quote size={15} />
              </button>
              <button 
                type="button"
                onClick={() => insertFormatting('code')} 
                className="p-2 hover:bg-white border border-transparent hover:border-slate-200 text-slate-600 hover:text-slate-950 rounded-xl transition-all cursor-pointer flex items-center justify-center"
                title="Фрагмент кода <code>"
              >
                <Code size={15} />
              </button>

              <div className="w-px h-5 bg-slate-200 mx-1" />

              {/* Advanced blocks */}
              <button 
                type="button"
                onClick={() => insertFormatting('link')} 
                className="p-2 hover:bg-white border border-transparent hover:border-slate-200 text-slate-600 hover:text-slate-950 rounded-xl transition-all cursor-pointer flex items-center justify-center"
                title="Вставить ссылку <a>"
              >
                <Link size={15} />
              </button>
              <button 
                type="button"
                onClick={() => insertFormatting('table')} 
                className="p-2 hover:bg-white border border-transparent hover:border-slate-200 text-slate-600 hover:text-slate-950 rounded-xl transition-all cursor-pointer flex items-center justify-center"
                title="Вставить таблицу <table>"
              >
                <Table size={15} />
              </button>
              <button 
                type="button"
                onClick={() => insertFormatting('hr')} 
                className="p-2 hover:bg-white border border-transparent hover:border-slate-200 text-slate-600 hover:text-slate-950 rounded-xl transition-all cursor-pointer flex items-center justify-center"
                title="Линия-разделитель <hr />"
              >
                <Minus size={15} />
              </button>

              <div className="w-px h-5 bg-slate-200 mx-1" />

              {/* Financial Quick Emojis picker row */}
              <div className="flex items-center gap-0.5 bg-slate-150 rounded-lg p-0.5">
                {['💸', '🏢', '📈', '📉', '🎯', '🎲', '🏆', '🤝', '💼'].map((emoji) => (
                  <button
                    key={emoji}
                    type="button"
                    onClick={() => insertFormatting('emoji', emoji)}
                    className="p-1 hover:bg-white text-xs rounded transition-all cursor-pointer active:scale-90"
                    title={`Вставить смайл ${emoji}`}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className={`grid gap-6 ${rulesViewMode === 'split' ? 'grid-cols-1 lg:grid-cols-2' : 'grid-cols-1'}`}>
            {/* Editor Container */}
            {rulesViewMode !== 'preview' && (
              <div className="flex flex-col space-y-2">
                <div className="flex items-center justify-between text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                  <span>Редактор HTML / Разметки:</span>
                  <span>{rulesText ? `${rulesText.length} символов` : 'Поле пустое'}</span>
                </div>
                <textarea
                  id="rules-textarea"
                  value={rulesText}
                  onChange={(e) => setRulesText(e.target.value)}
                  rows={rulesViewMode === 'split' ? 24 : 16}
                  className="w-full p-4 bg-slate-50/55 border border-slate-200 hover:border-slate-300 rounded-2xl focus:bg-white focus:ring-4 focus:ring-emerald-500/5 focus:border-emerald-500 outline-none text-xs font-mono text-slate-700 leading-relaxed transition-all shadow-3xs resize-y"
                  placeholder="Инструкции и своды законов игры в формате HTML..."
                />
              </div>
            )}

            {/* Interactive Live Preview */}
            {rulesViewMode !== 'editor' && (
              <div className="flex flex-col space-y-2">
                <div className="flex items-center justify-between text-[10px] font-bold text-slate-400 uppercase tracking-widest select-none">
                  <span>Интерактивный Предпросмотр:</span>
                  <span className="text-emerald-600 font-bold bg-emerald-50 px-2 py-0.5 rounded-full text-[9px] flex items-center gap-1">
                    <span className="h-1.5 w-1.5 bg-emerald-500 rounded-full animate-pulse" />
                    LIVE
                  </span>
                </div>
                <div className="border border-slate-200 border-dashed rounded-2xl bg-slate-50/20 p-6 overflow-y-auto max-h-[550px] shadow-3xs">
                  {rulesText.trim() ? (
                    <div 
                      className="prose prose-slate max-w-none text-slate-600 text-xs leading-relaxed
                        [&>h1]:text-xl [&>h1]:font-black [&>h1]:text-slate-800 [&>h1]:mt-4 [&>h1]:mb-2 [&>h1]:pb-1 [&>h1]:border-b [&>h1]:border-slate-100
                        [&>h2]:text-lg [&>h2]:font-extrabold [&>h2]:text-slate-800 [&>h2]:mt-4 [&>h2]:mb-2
                        [&>h3]:text-sm [&>h3]:font-bold [&>h3]:text-emerald-700 [&>h3]:mt-3 [&>h3]:mb-1.5
                        [&>p]:mb-3 [&>p]:text-slate-600 [&>p]:leading-relaxed
                        [&>ol]:list-decimal [&>ol]:pl-5 [&>ol]:mb-3 [&>ol]:space-y-1
                        [&>ul]:list-disc [&>ul]:pl-5 [&>ul]:mb-3 [&>ul]:space-y-1
                        [&>li]:text-slate-600
                        [&>strong]:font-bold [&>strong]:text-slate-900
                        [&>blockquote]:border-l-4 [&>blockquote]:border-emerald-500 [&>blockquote]:pl-4 [&>blockquote]:my-3 [&>blockquote]:italic [&>blockquote]:text-slate-500
                        [&>code]:bg-slate-100 [&>code]:px-1.5 [&>code]:py-0.5 [&>code]:rounded [&>code]:font-mono [&>code]:text-[11px] [&>code]:text-rose-600
                        [&>a]:text-emerald-600 [&>a]:hover:text-emerald-700 [&>a]:underline [&>a]:font-semibold
                        [&>table]:w-full [&>table]:text-left [&>table]:border-collapse [&>table]:text-[11px] [&>table]:my-3 [&>table]:border [&>table]:border-slate-200
                        [&>table_thead]:bg-slate-50 [&>table_thead_tr]:border-b [&>table_thead_tr]:border-slate-200
                        [&>table_th]:px-2.5 [&>table_th]:py-1.5 [&>table_th]:font-bold [&>table_th]:text-slate-600 [&>table_td]:px-2.5 [&>table_td]:py-1.5 [&>table_td]:border-b [&>table_td]:border-slate-150
                        [&>hr]:border-slate-150 [&>hr]:my-4"
                      dangerouslySetInnerHTML={{ __html: rulesText }}
                    />
                  ) : (
                    <div className="text-center py-20 text-slate-400 space-y-2 select-none">
                      <HelpCircle className="h-8 w-8 mx-auto text-slate-200 animate-pulse" />
                      <p className="text-xs font-bold">Отобразить нечего</p>
                      <p className="text-[10px] text-slate-400 max-w-[220px] mx-auto leading-relaxed">
                        Введите разметку правил в текстовое поле слева или воспользуйтесь инструментами форматирования.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="flex justify-end pt-2 border-t border-slate-100">
            <button
              onClick={handleSaveRules}
              className="inline-flex items-center gap-1.5 px-6 py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-2xl text-xs shadow-md transition-all active:scale-98 cursor-pointer"
            >
              <Save size={14} />
              <span>Сохранить правила игры</span>
            </button>
          </div>
        </div>
      )}

      {activeTab === 'home' && (
        <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-xs space-y-6">
          <div>
            <h2 className="text-base font-bold text-slate-800">Настройки главной страницы</h2>
            <p className="text-xs text-slate-400">Настройки картинок, заголовков и слоганов на стартовом приветственном экране</p>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1">Главный текст (Заголовок)</label>
              <input
                type="text"
                value={home.title}
                onChange={(e) => setHome({ ...home, title: e.target.value })}
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 hover:border-slate-300 rounded-xl focus:bg-white focus:ring-4 focus:ring-emerald-500/5 focus:border-emerald-500 outline-none text-xs text-slate-755 font-bold transition-all shadow-3xs"
                placeholder="Заголовок приветствия..."
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1">Второстепенный текст (Описание)</label>
              <textarea
                value={home.subtitle}
                onChange={(e) => setHome({ ...home, subtitle: e.target.value })}
                rows={3}
                className="w-full p-4 bg-slate-50 border border-slate-200 hover:border-slate-300 rounded-xl focus:bg-white focus:ring-4 focus:ring-emerald-500/5 focus:border-emerald-500 outline-none text-xs text-slate-700 font-medium leading-relaxed transition-all shadow-3xs"
                placeholder="Основная суть или приветствие игроков..."
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Картинка сервиса (Иллюстрация)</label>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Left side: Upload area & controls */}
                <div className="space-y-3">
                  <div
                    onDragOver={handleHomeImageDragOver}
                    onDragLeave={handleHomeImageDragLeave}
                    onDrop={handleHomeImageDrop}
                    className={`border-2 border-dashed rounded-2xl p-6 text-center transition-all flex flex-col items-center justify-center min-h-[170px] relative ${
                      imageDragging
                        ? 'border-emerald-500 bg-emerald-50/50 scale-99 shadow-inner'
                        : home.imageUrl
                        ? 'border-slate-200 bg-slate-50/20'
                        : 'border-slate-200 hover:border-slate-300 bg-slate-50/50'
                    }`}
                  >
                    <Upload className={`h-8 w-8 mb-2.5 transition-colors ${imageDragging ? 'text-emerald-500' : 'text-slate-400'}`} />
                    <p className="text-xs font-bold text-slate-700 mb-1">Перетащите изображение сюда</p>
                    <p className="text-[10px] text-slate-400 mb-3">или нажмите кнопку ниже (JPEG, PNG, WEBP, SVG)</p>
                    
                    <label className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-xl text-xs transition-colors cursor-pointer shadow-3xs">
                      <span>Выберите файл</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleHomeImageUpload(file);
                        }}
                        className="hidden"
                      />
                    </label>
                  </div>

                  {/* Manual URL entry & preset buttons */}
                  <div className="bg-slate-50/60 border border-slate-100/70 rounded-2xl p-3.5 space-y-3">
                    <div>
                      <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Или укажите прямую ссылку на изображение:</span>
                      <input
                        type="text"
                        value={home.imageUrl}
                        onChange={(e) => setHome({ ...home, imageUrl: e.target.value })}
                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/10 focus:border-emerald-500 outline-none text-[11px] text-slate-600 font-mono leading-normal"
                        placeholder="Вставьте URL ссылку..."
                      />
                    </div>

                    <div className="flex items-center justify-between gap-2.5 pt-1.5 border-t border-slate-200/50">
                      <span className="text-[10px] text-slate-400">Быстрые пресеты:</span>
                      <div className="flex gap-1.5">
                        <button 
                          type="button"
                          onClick={() => setHome({ ...home, imageUrl: 'https://images.unsplash.com/photo-1553481187-be93c21490a9?q=80&w=1000&auto=format&fit=crop' })}
                          className="px-2 py-1 bg-white hover:bg-slate-200 rounded text-[9px] font-bold text-slate-600 border border-slate-200 transition-colors cursor-pointer"
                        >
                          Город Монополии
                        </button>
                        <button 
                          type="button"
                          onClick={() => setHome({ ...home, imageUrl: 'https://images.unsplash.com/photo-1611195973783-a4e21a8f9b93?q=80&w=1000&auto=format&fit=crop' })}
                          className="px-2 py-1 bg-white hover:bg-slate-200 rounded text-[9px] font-bold text-slate-600 border border-slate-200 transition-colors cursor-pointer"
                        >
                          Бизнес Деньги
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Right side: Live preview */}
                <div className="border border-slate-200 rounded-2xl bg-slate-50/40 p-4 flex flex-col items-center justify-center relative overflow-hidden min-h-[250px]">
                  {home.imageUrl ? (
                    <div className="w-full h-full flex flex-col">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Предпросмотр иллюстрации:</span>
                        <button
                          type="button"
                          onClick={() => setHome({ ...home, imageUrl: '' })}
                          className="inline-flex items-center gap-1 text-[10px] font-bold text-rose-500 hover:text-rose-700 bg-rose-50 px-2 py-1 rounded-md transition-colors cursor-pointer"
                        >
                          <Trash2 size={10} />
                          <span>Очистить</span>
                        </button>
                      </div>
                      
                      <div className="flex-1 bg-white border border-slate-100 rounded-xl overflow-hidden aspect-video flex items-center justify-center relative shadow-3xs group">
                        <img
                          src={home.imageUrl}
                          alt="Иллюстрация сервиса"
                          className="w-full h-full object-cover select-none"
                          referrerPolicy="no-referrer"
                          onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            target.style.display = 'none';
                            const sibling = target.nextElementSibling as HTMLElement;
                            if (sibling) sibling.style.display = 'flex';
                          }}
                        />
                        <div className="hidden absolute inset-0 bg-slate-50 flex-col items-center justify-center text-center p-4">
                          <ShieldAlert className="h-6 w-6 text-amber-500 mb-1" />
                          <p className="text-[10px] text-amber-700 font-bold">Ссылка повреждена или не возвращает картинку</p>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center p-6 space-y-2">
                      <Image className="h-10 w-10 text-slate-300 mx-auto" />
                      <p className="text-xs font-bold text-slate-400">Иллюстрация отсутствует</p>
                      <p className="text-[10px] text-slate-400 max-w-[200px] mx-auto leading-normal">Загрузите файл или выберите пресет, чтобы настроить картинку под этот блок.</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="pt-5 border-t border-slate-100 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">Ссылка для внешней кнопки "Калькулятор"</label>
                <input
                  type="text"
                  value={home.calculatorUrl || ''}
                  onChange={(e) => setHome({ ...home, calculatorUrl: e.target.value })}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 hover:border-slate-300 rounded-xl focus:bg-white focus:ring-4 focus:ring-emerald-500/5 focus:border-emerald-500 outline-none text-xs text-slate-700 font-medium transition-all shadow-3xs"
                  placeholder="https://www.google.com/search?q=calculator"
                />
                <span className="text-[10px] text-slate-400 mt-1 block">Кнопка «Калькулятор» в боковой панели ведет по этому адресу</span>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">Ссылка для внешней кнопки "Карточка" (Ссылка на файл)</label>
                <input
                  type="text"
                  value={home.cardUrl || ''}
                  onChange={(e) => setHome({ ...home, cardUrl: e.target.value })}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 hover:border-slate-300 rounded-xl focus:bg-white focus:ring-4 focus:ring-emerald-500/5 focus:border-emerald-500 outline-none text-xs text-slate-700 font-medium transition-all shadow-3xs"
                  placeholder="https://docs.google.com/document/d/..."
                />
                <span className="text-[10px] text-slate-400 mt-1 block">Кнопка «Карточка» в боковой панели ведет на скачивание или просмотр внешнего файла</span>
              </div>
            </div>
          </div>

          <div className="flex justify-end">
            <button
              onClick={handleSaveHome}
              className="inline-flex items-center gap-1.5 px-6 py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-2xl text-xs shadow-md transition-all active:scale-98 cursor-pointer"
            >
              <Save size={14} />
              <span>Сохранить настройки главной</span>
            </button>
          </div>
        </div>
      )}

      {activeTab === 'seo' && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-xs space-y-4">
            <div>
              <h2 className="text-base font-bold text-slate-800">Настройки СЕО (Поисковая оптимизация)</h2>
              <p className="text-xs text-slate-400">Правила глобального продвижения настольной игры. Действует для всех игровых страниц</p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">SEO Заголовок (Meta Title)</label>
                <input
                  type="text"
                  value={seo.title}
                  onChange={(e) => setSeo({ ...seo, title: e.target.value })}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 hover:border-slate-300 rounded-xl focus:bg-white focus:ring-4 focus:ring-emerald-500/5 focus:border-emerald-500 outline-none text-xs text-slate-755 font-bold transition-all shadow-3xs"
                  placeholder="Заголовок для вкладки..."
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">SEO Описание (Meta Description)</label>
                <textarea
                  value={seo.description}
                  onChange={(e) => setSeo({ ...seo, description: e.target.value })}
                  rows={2}
                  className="w-full p-4 bg-slate-50 border border-slate-200 hover:border-slate-300 rounded-xl focus:bg-white focus:ring-4 focus:ring-emerald-500/5 focus:border-emerald-500 outline-none text-xs text-slate-700 font-medium leading-relaxed transition-all shadow-3xs"
                  placeholder="Мета описание для поисковиков..."
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">SEO Ключевые слова (Keywords)</label>
                <input
                  type="text"
                  value={seo.keywords}
                  onChange={(e) => setSeo({ ...seo, keywords: e.target.value })}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 hover:border-slate-300 rounded-xl focus:bg-white focus:ring-4 focus:ring-emerald-500/5 focus:border-emerald-500 outline-none text-xs text-slate-700 transition-all font-semibold shadow-3xs"
                  placeholder="карты, монополия, игра онлайн..."
                />
              </div>

              {/* OpenGraph Settings Section */}
              <div className="border-t border-slate-100 pt-5 mt-4">
                <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <span className="p-1 bg-emerald-50 text-emerald-600 rounded-md">🔗</span>
                  Настройки OpenGraph (Превью для соцсетей и мессенджеров)
                </h3>
                <p className="text-[10px] text-slate-400 mb-4 leading-relaxed">
                  Определяет, как сайт будет выглядеть при отправке ссылки в Telegram, WhatsApp, ВКонтакте, Discord или Viber.
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 mb-1">OG Заголовок (og:title)</label>
                    <input
                      type="text"
                      value={seo.ogTitle || ''}
                      onChange={(e) => setSeo({ ...seo, ogTitle: e.target.value })}
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 hover:border-slate-300 rounded-xl focus:bg-white focus:ring-4 focus:ring-emerald-500/5 focus:border-emerald-500 outline-none text-xs text-slate-700 font-bold transition-all shadow-3xs"
                      placeholder="По умолчанию совпадает с главным SEO Заголовком..."
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 mb-1">OG Тип (og:type)</label>
                    <input
                      type="text"
                      value={seo.ogType || ''}
                      onChange={(e) => setSeo({ ...seo, ogType: e.target.value })}
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 hover:border-slate-300 rounded-xl focus:bg-white focus:ring-4 focus:ring-emerald-500/5 focus:border-emerald-500 outline-none text-xs text-slate-700 font-medium transition-all shadow-3xs"
                      placeholder="website, game, article..."
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-[11px] font-bold text-slate-500 mb-1">OG Описание (og:description)</label>
                    <textarea
                      value={seo.ogDescription || ''}
                      onChange={(e) => setSeo({ ...seo, ogDescription: e.target.value })}
                      rows={2}
                      className="w-full p-4 bg-slate-50 border border-slate-200 hover:border-slate-300 rounded-xl focus:bg-white focus:ring-4 focus:ring-emerald-500/5 focus:border-emerald-500 outline-none text-xs text-slate-700 font-medium leading-relaxed transition-all shadow-3xs"
                      placeholder="По умолчанию совпадает с главным SEO Описанием..."
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-[11px] font-bold text-slate-500 mb-1">OG Изображение превью (og:image URL)</label>
                    <input
                      type="text"
                      value={seo.ogImage || ''}
                      onChange={(e) => setSeo({ ...seo, ogImage: e.target.value })}
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 hover:border-slate-300 rounded-xl focus:bg-white focus:ring-4 focus:ring-emerald-500/5 focus:border-emerald-500 outline-none text-xs text-slate-600 font-mono transition-all shadow-3xs"
                      placeholder="Например: https://images.unsplash.com/... или ссылка на логотип"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">Вставить HTML / JavaScript в header (&lt;head&gt;)</label>
                <p className="text-[10px] text-slate-400 mb-1 leading-relaxed">
                  Используется для верификации сайтов, пикселей отслеживания, шрифтов или скриптов веб-аналитики (Яндекс.Метрика, Google Analytics, Google Tag Manager). Обязательно оборачивайте скрипты в тег &lt;script&gt;.
                </p>
                <textarea
                  value={seo.headerScript || ''}
                  onChange={(e) => setSeo({ ...seo, headerScript: e.target.value })}
                  rows={4}
                  className="w-full p-4 bg-slate-50 border border-slate-200 hover:border-slate-300 rounded-xl focus:bg-white focus:ring-4 focus:ring-emerald-500/5 focus:border-emerald-500 outline-none text-xs font-mono text-slate-700 leading-relaxed transition-all shadow-3xs"
                  placeholder="<!-- Код в HEAD, например: -->&#10;<script>&#10;  (function(m,e,t,r,i,k,a)...&#10;</script>"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">Вставить HTML / JavaScript в body (в конец &lt;body&gt;)</label>
                <p className="text-[10px] text-slate-400 mb-1 leading-relaxed">
                  Добавляется перед закрывающим тегом &lt;/body&gt;. Идеально подходит для кодов ретаргетинга, noscript-блоков, виджетов обратной связи или сторонних чатов.
                </p>
                <textarea
                  value={seo.bodyScript || ''}
                  onChange={(e) => setSeo({ ...seo, bodyScript: e.target.value })}
                  rows={4}
                  className="w-full p-4 bg-slate-50 border border-slate-200 hover:border-slate-300 rounded-xl focus:bg-white focus:ring-4 focus:ring-emerald-500/5 focus:border-emerald-500 outline-none text-xs font-mono text-slate-700 leading-relaxed transition-all shadow-3xs"
                  placeholder="<!-- Код в BODY, например: -->&#10;<noscript><div><img src=&quot;https://mc.yandex.ru/...&quot; /></div></noscript>"
                />
              </div>
            </div>

            <div className="flex justify-end">
              <button
                onClick={handleSaveSeo}
                className="inline-flex items-center gap-1.5 px-6 py-3 bg-slate-800 hover:bg-slate-900 text-white font-bold rounded-2xl text-xs transition-all active:scale-98 cursor-pointer"
              >
                <Save size={14} />
                <span>Сохранить SEO</span>
              </button>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-xs space-y-4">
            <div>
              <h2 className="text-base font-bold text-slate-800">Текст в копирайте (Копирайты в футере)</h2>
              <p className="text-xs text-slate-400">Настройки текста копирайта в самом низу Sidebar меню</p>
            </div>

            <div>
              <input
                type="text"
                value={footer.text}
                onChange={(e) => setFooter({ text: e.target.value })}
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 hover:border-slate-300 rounded-xl focus:bg-white focus:ring-4 focus:ring-emerald-500/5 focus:border-emerald-500 outline-none text-xs text-slate-755 font-bold transition-all shadow-3xs"
                placeholder="Текст футера..."
              />
            </div>

            <div className="flex justify-end">
              <button
                onClick={handleSaveFooter}
                className="inline-flex items-center gap-1.5 px-6 py-3 bg-slate-800 hover:bg-slate-900 text-white font-bold rounded-2xl text-xs transition-all active:scale-98 cursor-pointer"
              >
                <Save size={14} />
                <span>Обновить футер</span>
              </button>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-xs space-y-4">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-rose-50 rounded-xl text-rose-600">
                <KeyRound size={16} />
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-800">Изменение пароля администратора</h2>
                <p className="text-xs text-slate-400">Настройки логина и секретного ключа для админ панели</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">Учетный логин админа</label>
                <input
                  type="text"
                  value={adminLogin}
                  onChange={(e) => setAdminLogin(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 hover:border-slate-300 rounded-xl outline-none text-xs font-semibold text-slate-850 focus:bg-white focus:ring-4 focus:ring-rose-500/5 focus:border-rose-500/80 transition-all shadow-3xs"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">Секретный новый пароль</label>
                <input
                  type="password"
                  placeholder="Введите новый пароль..."
                  value={adminPassword}
                  onChange={(e) => setAdminPassword(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 hover:border-slate-300 rounded-xl outline-none text-xs font-semibold focus:bg-white focus:ring-4 focus:ring-rose-500/5 focus:border-rose-500/80 transition-all shadow-3xs"
                />
              </div>
            </div>

            <div className="flex justify-end">
              <button
                onClick={handleUpdateCredentials}
                className="inline-flex items-center gap-1.5 px-6 py-3 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-2xl text-xs transition-colors cursor-pointer"
              >
                <Lock size={12} />
                <span>Сохранить новые доступы</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'stats' && (() => {
        const rawHistory = stats?.history || [];
        const isDemo = rawHistory.length === 0;
        
        // If history is empty, populate with responsive demo analytics for the last 7 days so charts look instantly full
        const history = !isDemo ? rawHistory : [
          { event: 'table_created', timestamp: new Date(Date.now() - 6 * 24 * 3600 * 1000).toISOString(), roomId: 'ROOM_DUBAI' },
          { event: 'player_joined', timestamp: new Date(Date.now() - 6 * 24 * 3600 * 1000 + 400000).toISOString(), roomId: 'ROOM_DUBAI' },
          { event: 'player_joined', timestamp: new Date(Date.now() - 6 * 24 * 3600 * 1000 + 800000).toISOString(), roomId: 'ROOM_DUBAI' },
          { event: 'card_pulled', timestamp: new Date(Date.now() - 6 * 24 * 3600 * 1000 + 1200000).toISOString(), roomId: 'ROOM_DUBAI' },
          
          { event: 'table_created', timestamp: new Date(Date.now() - 5 * 24 * 3600 * 1000).toISOString(), roomId: 'ROOM_MOSCOW' },
          { event: 'player_joined', timestamp: new Date(Date.now() - 5 * 24 * 3600 * 1000 + 100000).toISOString(), roomId: 'ROOM_MOSCOW' },
          { event: 'card_pulled', timestamp: new Date(Date.now() - 5 * 24 * 3600 * 1000 + 500000).toISOString(), roomId: 'ROOM_MOSCOW' },
          { event: 'card_pulled', timestamp: new Date(Date.now() - 5 * 24 * 3600 * 1000 + 900000).toISOString(), roomId: 'ROOM_MOSCOW' },
          
          { event: 'table_created', timestamp: new Date(Date.now() - 4 * 24 * 3600 * 1000).toISOString(), roomId: 'ROOM_TOKYO' },
          { event: 'player_joined', timestamp: new Date(Date.now() - 4 * 24 * 3600 * 1000 + 200000).toISOString(), roomId: 'ROOM_TOKYO' },
          { event: 'player_joined', timestamp: new Date(Date.now() - 4 * 24 * 3600 * 1000 + 400000).toISOString(), roomId: 'ROOM_TOKYO' },
          { event: 'player_joined', timestamp: new Date(Date.now() - 4 * 24 * 3600 * 1000 + 600000).toISOString(), roomId: 'ROOM_TOKYO' },
          { event: 'card_pulled', timestamp: new Date(Date.now() - 4 * 24 * 3600 * 1000 + 1000000).toISOString(), roomId: 'ROOM_TOKYO' },
          { event: 'card_pulled', timestamp: new Date(Date.now() - 4 * 24 * 3600 * 1000 + 1400000).toISOString(), roomId: 'ROOM_TOKYO' },
          
          { event: 'table_created', timestamp: new Date(Date.now() - 3 * 24 * 3600 * 1000).toISOString(), roomId: 'ROOM_LONDON' },
          { event: 'player_joined', timestamp: new Date(Date.now() - 3 * 24 * 3600 * 1000 + 150000).toISOString(), roomId: 'ROOM_LONDON' },
          { event: 'card_pulled', timestamp: new Date(Date.now() - 3 * 24 * 3600 * 1000 + 600000).toISOString(), roomId: 'ROOM_LONDON' },
          
          { event: 'table_created', timestamp: new Date(Date.now() - 2 * 24 * 3600 * 1000).toISOString(), roomId: 'ROOM_MILAN' },
          { event: 'player_joined', timestamp: new Date(Date.now() - 2 * 24 * 3600 * 1000 + 100000).toISOString(), roomId: 'ROOM_MILAN' },
          { event: 'player_joined', timestamp: new Date(Date.now() - 2 * 24 * 3600 * 1000 + 180000).toISOString(), roomId: 'ROOM_MILAN' },
          { event: 'card_pulled', timestamp: new Date(Date.now() - 2 * 24 * 3600 * 1000 + 300000).toISOString(), roomId: 'ROOM_MILAN' },
          { event: 'card_pulled', timestamp: new Date(Date.now() - 2 * 24 * 3600 * 1000 + 500000).toISOString(), roomId: 'ROOM_MILAN' },
          
          { event: 'table_created', timestamp: new Date(Date.now() - 1 * 24 * 3600 * 1000).toISOString(), roomId: 'ROOM_MONACO' },
          { event: 'player_joined', timestamp: new Date(Date.now() - 1 * 24 * 3600 * 1000 + 80000).toISOString(), roomId: 'ROOM_MONACO' },
          { event: 'player_joined', timestamp: new Date(Date.now() - 1 * 24 * 3600 * 1000 + 160000).toISOString(), roomId: 'ROOM_MONACO' },
          { event: 'player_joined', timestamp: new Date(Date.now() - 1 * 24 * 3600 * 1000 + 240000).toISOString(), roomId: 'ROOM_MONACO' },
          { event: 'card_pulled', timestamp: new Date(Date.now() - 1 * 24 * 3600 * 1000 + 400000).toISOString(), roomId: 'ROOM_MONACO' },
          { event: 'card_pulled', timestamp: new Date(Date.now() - 1 * 24 * 3600 * 1000 + 600000).toISOString(), roomId: 'ROOM_MONACO' },
          { event: 'card_pulled', timestamp: new Date(Date.now() - 1 * 24 * 3600 * 1000 + 850000).toISOString(), roomId: 'ROOM_MONACO' },
          
          { event: 'table_created', timestamp: new Date().toISOString(), roomId: 'ROOM_PARIS' },
          { event: 'player_joined', timestamp: new Date(Date.now() + 20000).toISOString(), roomId: 'ROOM_PARIS' },
          { event: 'card_pulled', timestamp: new Date(Date.now() + 40000).toISOString(), roomId: 'ROOM_PARIS' },
        ];

        // 1. Timeline Chart (by Game Days formatted as DD.MM)
        const timelineMap: { [ymd: string]: { tables: number, players: number, cards: number } } = {};
        history.forEach(h => {
          if (!h.timestamp) return;
          const ymd = h.timestamp.split('T')[0];
          if (!timelineMap[ymd]) {
            timelineMap[ymd] = { tables: 0, players: 0, cards: 0 };
          }
          if (h.event === 'table_created') {
            timelineMap[ymd].tables++;
          } else if (h.event === 'player_joined') {
            timelineMap[ymd].players++;
          } else if (h.event === 'card_pulled') {
            timelineMap[ymd].cards++;
          }
        });

        const sortedDates = Object.keys(timelineMap).sort();
        const timelineData = sortedDates.map(ymd => {
          const parts = ymd.split('-');
          const m = parts[1] || '01';
          const d = parts[2] || '01';
          return {
            date: `${d}.${m}`,
            'Создано столов': timelineMap[ymd].tables,
            'Новых игроков': timelineMap[ymd].players,
            'Вытянуто карт': timelineMap[ymd].cards
          };
        });

        // 2. Hour distribution
        const hourCounts = Array(24).fill(0);
        if (isDemo) {
          [8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23].forEach((h, i) => {
            hourCounts[h] = Math.floor(Math.sin(i * 0.7) * 4 + 7);
          });
        } else {
          history.forEach(h => {
            if (!h.timestamp) return;
            const hour = new Date(h.timestamp).getHours();
            if (hour >= 0 && hour < 24) hourCounts[hour]++;
          });
        }
        const hourData = hourCounts.map((count, hr) => ({
          hour: `${String(hr).padStart(2, '0')}:00`,
          'Событий': count
        }));

        // 3. Event Type proportions
        let tablesCount = 0;
        let playersCount = 0;
        let cardsCount = 0;
        history.forEach(h => {
          if (h.event === 'table_created') tablesCount++;
          else if (h.event === 'player_joined') playersCount++;
          else if (h.event === 'card_pulled') cardsCount++;
        });

        const displayTables = isDemo ? 7 : (stats?.totalTablesCreated || tablesCount);
        const displayPlayers = isDemo ? 17 : (stats?.totalPlayersJoined || playersCount);
        const displayCards = isDemo ? 18 : cardsCount;

        const typeData = [
          { name: 'Создано столов', value: displayTables, color: '#10b981' },
          { name: 'Подключено игроков', value: displayPlayers, color: '#3b82f6' },
          { name: 'Вытянуто карт', value: displayCards, color: '#8b5cf6' }
        ].filter(v => v.value > 0);

        // Active KPI Values
        const activeTablesCount = stats?.activeTables?.length || (isDemo ? 1 : 0);
        const activePlayersCount = stats?.activeTables?.reduce((acc, t) => acc + (t.activePlayersCount || 0), 0) || (isDemo ? 3 : 0);
        const averagePlayersPerTable = displayTables > 0 ? (displayPlayers / displayTables).toFixed(1) : '0';
        const engagementScore = displayTables > 0 ? (displayCards / displayTables).toFixed(1) : '0';

        // Filters applied to actual raw stats log on Server (prevent demo leakage in table logger search)
        const filteredEvents = rawHistory.filter(h => {
          if (logEventFilter !== 'all' && h.event !== logEventFilter) return false;
          if (logSearchQuery.trim()) {
            const q = logSearchQuery.toLowerCase();
            const matchesRoom = h.roomId?.toLowerCase().includes(q);
            const matchesCard = h.cardId?.toLowerCase().includes(q);
            return matchesRoom || matchesCard;
          }
          return true;
        });

        const handleExportExcelStats = () => {
          const header = 'Время,Событие,Стол ID,Карточка ID\n';
          const rows = rawHistory.map(h => `"${new Date(h.timestamp).toLocaleString()}","${h.event === 'table_created' ? 'Создан стол' : h.event === 'player_joined' ? 'Игрок зашел' : 'Взята карта'}","${h.roomId || ''}","${h.cardId || ''}"`).join('\n');
          const blob = new Blob([header + rows], { type: 'text/csv;charset=utf-8;' });
          const url = URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.setAttribute('href', url);
          link.setAttribute('download', `mama_ya_bogat_analytics_${new Date().toISOString().split('T')[0]}.csv`);
          link.click();
        };

        return (
          <div className="space-y-6">
            {/* Header Block with Title & Filter Controls */}
            <div className="bg-slate-900 text-white rounded-3xl p-6 shadow-xl flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-6 relative overflow-hidden">
              {/* Decorative glows */}
              <div className="absolute -top-12 -right-12 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none"></div>
              <div className="absolute -bottom-12 -left-12 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none"></div>

              <div className="space-y-1 relative z-10">
                <div className="flex items-center gap-2">
                  <span className="px-3 py-1 bg-emerald-500/20 text-emerald-300 rounded-full text-[10px] font-bold tracking-wider uppercase border border-emerald-500/30 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-ping"></span>
                    Панель аналитики
                  </span>
                  {isDemo && (
                    <span className="px-3 py-1 bg-amber-500/20 text-amber-300 rounded-full text-[10px] font-bold tracking-wider uppercase border border-amber-500/30">
                      Демо режим
                    </span>
                  )}
                </div>
                <h2 className="text-xl lg:text-2xl font-black tracking-tight">Статистика игровой активности</h2>
                <p className="text-xs text-slate-300 leading-relaxed max-w-xl">
                  Визуализация игровых циклов, посещаемости комнат, нагрузочных часов и действий игроков по вытягиванию интерактивных бизнес-карт.
                </p>
              </div>

              {/* Date Filter Widget */}
              <div className="flex flex-wrap items-center gap-2 relative z-10 self-start lg:self-auto bg-slate-800/60 p-3 rounded-2xl border border-slate-700/50">
                <div className="flex items-center gap-1.5 px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl focus-within:ring-2 focus-within:ring-emerald-500/50 transition-all">
                  <Calendar size={13} className="text-slate-400" />
                  <input 
                    type="date"
                    value={filterFrom}
                    onChange={(e) => setFilterFrom(e.target.value)}
                    className="bg-transparent text-[11px] font-medium text-slate-200 outline-none border-none py-px cursor-pointer"
                    title="С даты"
                  />
                </div>
                <span className="text-xs font-bold text-slate-500">до</span>
                <div className="flex items-center gap-1.5 px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl focus-within:ring-2 focus-within:ring-emerald-500/50 transition-all">
                  <Calendar size={13} className="text-slate-400" />
                  <input 
                    type="date"
                    value={filterTo}
                    onChange={(e) => setFilterTo(e.target.value)}
                    className="bg-transparent text-[11px] font-medium text-slate-200 outline-none border-none py-px cursor-pointer"
                    title="По дату"
                  />
                </div>
                <div className="flex gap-1.5">
                  <button
                    onClick={fetchStats}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs rounded-xl shadow-md transition-all active:scale-98 cursor-pointer flex items-center gap-1"
                  >
                    <RefreshCcw size={12} className="animate-hover-spin" />
                    <span>Применить</span>
                  </button>
                  {(filterFrom || filterTo) && (
                    <button
                      onClick={() => {
                        setFilterFrom('');
                        setFilterTo('');
                        setTimeout(() => fetchStats(), 100);
                      }}
                      className="p-2 bg-slate-700 hover:bg-slate-600 rounded-xl text-slate-300 cursor-pointer"
                      title="Очистить фильтры дат"
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Premium Metric Cards Board */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
              {/* Table Created Count */}
              <div className="p-5 bg-white border border-slate-100 rounded-3xl shadow-3xs flex flex-col justify-between relative group hover:border-emerald-200 transition-all hover:shadow-xs">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Запущенные столы</span>
                  <div className="p-2 bg-emerald-50 text-emerald-600 rounded-2xl group-hover:scale-110 transition-transform">
                    <Gamepad2 size={16} />
                  </div>
                </div>
                <div className="mt-4">
                  <span className="text-3xl font-black text-slate-800 tracking-tight block">
                    {displayTables}
                  </span>
                  <span className="text-[10px] text-slate-400 mt-1 block">Всего создано игровых комнат</span>
                </div>
              </div>

              {/* Total Players Connections */}
              <div className="p-5 bg-white border border-slate-100 rounded-3xl shadow-3xs flex flex-col justify-between relative group hover:border-blue-200 transition-all hover:shadow-xs">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Игроков верифицировано</span>
                  <div className="p-2 bg-blue-50 text-blue-600 rounded-2xl group-hover:scale-110 transition-transform">
                    <Users size={16} />
                  </div>
                </div>
                <div className="mt-4">
                  <span className="text-3xl font-black text-slate-800 tracking-tight block">
                    {displayPlayers}
                  </span>
                  <span className="text-[10px] text-slate-400 mt-1 block">Среднее лобби: <b className="text-blue-600">{averagePlayersPerTable}</b> чел/стол</span>
                </div>
              </div>

              {/* Engagement Score Index */}
              <div className="p-5 bg-white border border-slate-100 rounded-3xl shadow-3xs flex flex-col justify-between relative group hover:border-purple-200 transition-all hover:shadow-xs">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Действия с картами</span>
                  <div className="p-2 bg-purple-50 text-purple-600 rounded-2xl group-hover:scale-110 transition-transform">
                    <Flame size={16} />
                  </div>
                </div>
                <div className="mt-4">
                  <span className="text-3xl font-black text-slate-800 tracking-tight block">
                    {displayCards}
                  </span>
                  <span className="text-[10px] text-slate-400 mt-1 block">Вовлеченность: <b className="text-purple-600">{engagementScore}</b> ходов/круг</span>
                </div>
              </div>

              {/* Live active tables rooms online */}
              <div className="p-5 bg-white border border-slate-100 rounded-3xl shadow-3xs flex flex-col justify-between relative group hover:border-teal-200 transition-all hover:shadow-xs">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Активно комнат</span>
                  <div className="p-2 bg-teal-50 text-teal-600 rounded-2xl flex items-center justify-center relative">
                    <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-teal-500 rounded-full animate-ping"></span>
                    <Activity size={16} />
                  </div>
                </div>
                <div className="mt-4">
                  <span className="text-3xl font-black text-teal-600 tracking-tight block flex items-center gap-1.5">
                    {activeTablesCount}
                    <span className="text-xs font-bold text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded-lg">онлайн</span>
                  </span>
                  <span className="text-[10px] text-slate-400 mt-1 block">Игровые сессии в реальном времени</span>
                </div>
              </div>

              {/* Real players in live rooms right details */}
              <div className="p-5 bg-white border border-slate-100 rounded-3xl shadow-3xs flex flex-col justify-between relative group hover:border-indigo-200 transition-all hover:shadow-xs">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Игроки онлайн</span>
                  <div className="p-2 bg-indigo-50 text-indigo-600 rounded-2xl group-hover:scale-110 transition-transform">
                    <TrendingUp size={16} />
                  </div>
                </div>
                <div className="mt-4">
                  <span className="text-3xl font-black text-indigo-600 tracking-tight block">
                    {activePlayersCount}
                  </span>
                  <span className="text-[10px] text-slate-400 mt-1 block">Игровые пульты подключены к столам</span>
                </div>
              </div>
            </div>

            {/* Main Visual Graphs Matrix container */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              {/* Timeline chart - Taking up 2 columns */}
              <div className="bg-white rounded-3xl border border-slate-100 p-5 shadow-xs lg:col-span-2 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-black text-slate-800">Динамика событий и вовлечения</h3>
                    <p className="text-[10px] text-slate-400">Временная шкала игровых комнат, подключений и ходов на игровом поле</p>
                  </div>
                  <span className="text-[10px] font-bold text-slate-400 bg-slate-50 border border-slate-100 px-2.5 py-1 rounded-xl">
                    Интервал: по дням
                  </span>
                </div>

                <div className="h-64 md:h-72 w-full text-xs font-sans">
                  {timelineData.length === 0 ? (
                    <div className="w-full h-full flex flex-col items-center justify-center text-slate-400 italic">
                      Нет достаточных данных для построения векового тренда.
                    </div>
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={timelineData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                        <defs>
                          <linearGradient id="gradientTables" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#10b981" stopOpacity={0.2}/>
                            <stop offset="95%" stopColor="#10b981" stopOpacity={0.01}/>
                          </linearGradient>
                          <linearGradient id="gradientPlayers" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2}/>
                            <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.01}/>
                          </linearGradient>
                          <linearGradient id="gradientCards" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.2}/>
                            <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0.01}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                        <XAxis dataKey="date" stroke="#94a3b8" fontSize={9} fontWeight="bold" />
                        <YAxis stroke="#94a3b8" fontSize={9} fontWeight="bold" />
                        <Tooltip 
                          contentStyle={{ 
                            background: '#0f172a', 
                            color: '#fff', 
                            borderRadius: '16px', 
                            border: 'none', 
                            fontSize: '11px', 
                            fontWeight: 'bold',
                            padding: '12px'
                          }} 
                        />
                        <Legend iconType="circle" wrapperStyle={{ fontSize: '10px', paddingTop: '10px', fontWeight: 'bold' }} />
                        <Area type="monotone" dataKey="Создано столов" stroke="#10b981" strokeWidth={2.5} fillOpacity={1} fill="url(#gradientTables)" />
                        <Area type="monotone" dataKey="Новых игроков" stroke="#3b82f6" strokeWidth={2.5} fillOpacity={1} fill="url(#gradientPlayers)" />
                        <Area type="monotone" dataKey="Вытянуто карт" stroke="#8b5cf6" strokeWidth={2.5} fillOpacity={1} fill="url(#gradientCards)" />
                      </AreaChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </div>

              {/* Proportion donut chart */}
              <div className="bg-white rounded-3xl border border-slate-100 p-5 shadow-xs flex flex-col justify-between space-y-4">
                <div>
                  <h3 className="text-sm font-black text-slate-800">Доли активности операций</h3>
                  <p className="text-[10px] text-slate-400">В процентном соотношении от общего объема взаимодействий</p>
                </div>

                <div className="h-48 w-full flex items-center justify-center relative">
                  {typeData.length === 0 ? (
                    <p className="text-xs text-slate-400 italic">Событий не зафиксировано</p>
                  ) : (
                    <div className="w-full h-full relative">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={typeData}
                            cx="50%"
                            cy="50%"
                            innerRadius={55}
                            outerRadius={75}
                            paddingAngle={5}
                            dataKey="value"
                          >
                            {typeData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                          </Pie>
                          <Tooltip formatter={(value) => [`${value} действий`, 'Количество']} />
                        </PieChart>
                      </ResponsiveContainer>

                      {/* Display inner total visual */}
                      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none mt-[-5px]">
                        <span className="text-2xl font-black text-slate-800">{displayTables + displayPlayers + displayCards}</span>
                        <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">событий всего</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Donut Legend */}
                <div className="space-y-2.5">
                  {typeData.map((item, idx) => {
                    const totalSum = displayTables + displayPlayers + displayCards;
                    const percent = totalSum > 0 ? Math.round((item.value / totalSum) * 100) : 0;
                    return (
                      <div key={idx} className="flex items-center justify-between text-xs bg-slate-50 hover:bg-slate-100/50 p-2 rounded-xl border border-slate-50 transition-colors">
                        <div className="flex items-center gap-2">
                          <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }}></span>
                          <span className="font-bold text-slate-600">{item.name}</span>
                        </div>
                        <div className="text-right">
                          <span className="font-mono font-black text-slate-700">{item.value}</span>
                          <span className="text-[9px] text-slate-400 font-bold ml-1.5">({percent}%)</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Hour Active bar chart */}
              <div className="bg-white rounded-3xl border border-slate-100 p-5 shadow-xs lg:col-span-3 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-black text-slate-800">Почасовая нагрузка сервера (Пиковые интервалы)</h3>
                    <p className="text-[10px] text-slate-400">Общее количество событий системы в разрезе 24-часового цикла (усредненно)</p>
                  </div>
                  <span className="text-[10.5px] font-bold text-indigo-600 bg-indigo-50 border border-indigo-100 px-3 py-1 rounded-xl flex items-center gap-1">
                    <Clock size={11} />
                    <span>Часовой пояс: Локальный</span>
                  </span>
                </div>

                <div className="h-44 w-full text-xs font-sans">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={hourData} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f8fafc" />
                      <XAxis dataKey="hour" stroke="#94a3b8" fontSize={8} fontWeight="bold" />
                      <YAxis stroke="#94a3b8" fontSize={8} fontWeight="bold" />
                      <Tooltip 
                        cursor={{ fill: 'rgba(148, 163, 184, 0.05)' }}
                        contentStyle={{ background: '#1e293b', edge: '12px', border: 'none', color: '#fff', fontSize: '10px', borderRadius: '12px' }}
                      />
                      <Bar dataKey="Событий" fill="#6366f1" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            {/* Active tables monitoring layout & launcher */}
            <div className="bg-white rounded-3xl border border-slate-100 overflow-hidden shadow-xs">
              <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 bg-emerald-500 rounded-full animate-ping"></div>
                  <div>
                    <h3 className="text-sm font-black text-slate-800">Мониторинг запущенных столов в реальном времени</h3>
                    <p className="text-[10px] text-slate-400">Список сессий, к которым подключены мобильные телефоны игроков прямо сейчас</p>
                  </div>
                </div>
                <span className="px-2.5 py-1 bg-slate-100 text-slate-600 font-extrabold rounded-xl text-[10px] uppercase border border-slate-200">
                  {stats?.activeTables?.length || 0} комнат в сети
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50/20 text-slate-400 uppercase text-[9px] font-black tracking-widest">
                      <th className="p-4">Имя / ID комнаты</th>
                      <th className="p-4">Время запуска</th>
                      <th className="p-4">Подключенные устройства</th>
                      <th className="p-2 text-right pr-6">Действие</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {!stats?.activeTables || stats.activeTables.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="p-8 text-center text-slate-400 italic">
                          <p className="font-bold text-xs">В данный момент нет активных игровых сессий.</p>
                          <p className="text-[10px] text-slate-400 mt-0.5">Когда игроки создадут стол по QR коду со смартфона, они появятся в этой ячейке вживую.</p>
                        </td>
                      </tr>
                    ) : (
                      stats.activeTables.map((room, idx) => {
                        const directUrl = `${window.location.protocol}//${window.location.host}/?table=${room.roomId}`;
                        return (
                          <tr key={idx} className="hover:bg-slate-50/30 transition-colors">
                            <td className="p-4 font-mono font-bold text-slate-700">{room.roomId}</td>
                            <td className="p-4 text-slate-400">{new Date(room.createdAt).toLocaleString('ru-RU')}</td>
                            <td className="p-4">
                              <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-blue-50 text-blue-700 font-bold rounded-lg text-[10px] border border-blue-100">
                                <span className="w-1.5 h-1.5 bg-blue-500 rounded-full"></span>
                                {room.activePlayersCount} игроков готово
                              </span>
                            </td>
                            <td className="p-2 text-right pr-6">
                              <a
                                href={directUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-1 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 active:bg-slate-900 text-white font-extrabold rounded-lg text-[10px] transition-all cursor-pointer shadow-3xs"
                              >
                                <span>Войти зрителем</span>
                                <ArrowUpRight size={10} />
                              </a>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Event logs logger table with custom tabs & filter inputs */}
            <div className="bg-white rounded-3xl border border-slate-100 p-5 shadow-xs space-y-4">
              <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 border-b border-slate-100 pb-4">
                <div>
                  <h3 className="text-sm font-black text-slate-800">Журнал и инспектирование аудита</h3>
                  <p className="text-[10px] text-slate-400">
                    Детализированный системный лог всех вызовов СДК и игровых инстанций на бэкенд сервере.
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {/* Excel export action button */}
                  <button
                    onClick={handleExportExcelStats}
                    disabled={rawHistory.length === 0}
                    className="px-3.5 py-1.5 border border-slate-200 hover:border-slate-300 text-slate-700 font-bold text-xs rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5 cursor-pointer shadow-3xs bg-white"
                  >
                    <Download size={13} className="text-slate-500" />
                    <span>Скачать CSV отчет</span>
                  </button>
                </div>
              </div>

              {/* Advanced search input and Tabs */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                
                {/* Search Bar */}
                <div className="flex-1 min-w-[200px] flex items-center gap-2 px-3 py-2 bg-slate-50 border border-slate-200 rounded-2xl focus-within:bg-white focus-within:border-emerald-500/80 transition-all shadow-3xs">
                  <Search size={14} className="text-slate-400" />
                  <input
                    type="text"
                    value={logSearchQuery}
                    onChange={(e) => setLogSearchQuery(e.target.value)}
                    placeholder="Быстрый поиск по ID стола, карточки..."
                    className="bg-transparent text-xs text-slate-700 font-medium outline-none border-none p-0 flex-grow"
                  />
                  {logSearchQuery && (
                    <button onClick={() => setLogSearchQuery('')} className="text-slate-400 hover:text-slate-600">
                      <X size={12} />
                    </button>
                  )}
                </div>

                {/* Quick Event Filter Tabs */}
                <div className="flex items-center bg-slate-50 p-1 rounded-2xl border border-slate-200/60 overflow-x-auto whitespace-nowrap scrollbar-none">
                  <button
                    onClick={() => setLogEventFilter('all')}
                    className={`px-3 py-1.5 rounded-xl font-bold text-[10.5px] transition-all cursor-pointer ${
                      logEventFilter === 'all' 
                        ? 'bg-white text-slate-800 shadow-sm' 
                        : 'text-slate-400 hover:text-slate-600'
                    }`}
                  >
                    Все события ({rawHistory.length})
                  </button>
                  <button
                    onClick={() => setLogEventFilter('table_created')}
                    className={`px-3 py-1.5 rounded-xl font-bold text-[10.5px] transition-all cursor-pointer ${
                      logEventFilter === 'table_created' 
                        ? 'bg-emerald-500 text-white shadow-sm' 
                        : 'text-slate-400 hover:text-emerald-600'
                    }`}
                  >
                    🚪 Новые столы
                  </button>
                  <button
                    onClick={() => setLogEventFilter('player_joined')}
                    className={`px-3 py-1.5 rounded-xl font-bold text-[10.5px] transition-all cursor-pointer ${
                      logEventFilter === 'player_joined' 
                        ? 'bg-blue-500 text-white shadow-sm' 
                        : 'text-slate-400 hover:text-blue-600'
                    }`}
                  >
                    🙋 Входы игроков
                  </button>
                  <button
                    onClick={() => setLogEventFilter('card_pulled')}
                    className={`px-3 py-1.5 rounded-xl font-bold text-[10.5px] transition-all cursor-pointer ${
                      logEventFilter === 'card_pulled' 
                        ? 'bg-purple-500 text-white shadow-sm' 
                        : 'text-slate-400 hover:text-purple-600'
                    }`}
                  >
                    🎲 Розыгрыш карт
                  </button>
                </div>
              </div>

              {/* Scrolling event lines viewer */}
              <div className="border border-slate-100 rounded-3xl divide-y divide-slate-100 max-h-[350px] overflow-y-auto bg-slate-50/50">
                {filteredEvents.length === 0 ? (
                  <div className="p-12 text-center text-slate-400 italic">
                    <Database size={24} className="text-slate-300 mx-auto mb-2" />
                    <p className="text-xs font-bold font-sans">Журнал событий пуст или не подобрана фраза поиска</p>
                    <p className="text-[10px] text-slate-400 font-sans mt-0.5">
                      {logSearchQuery ? 'Попробуйте сбросить строку поиска' : 'Создайте первый стол на главной, чтобы запустить логгер'}
                    </p>
                  </div>
                ) : (
                  filteredEvents.slice(0, 100).map((h, idx) => (
                    <div key={idx} className="p-3.5 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 text-xs hover:bg-slate-50 transition-colors">
                      <div className="flex items-center gap-2.5">
                        <span className="text-[10px] font-mono text-slate-400 bg-slate-100/80 px-2 py-0.5 rounded-md shrink-0">
                          {new Date(h.timestamp).toLocaleTimeString('ru-RU')}
                        </span>

                        <div>
                          {h.event === 'table_created' && (
                            <div className="flex items-center gap-1.5">
                              <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 font-black rounded-md text-[9px] uppercase tracking-wider border border-emerald-100">Игровой стол</span>
                              <span className="text-slate-600 font-semibold font-sans">
                                Создан новый игровой стол под идентификатором <b className="font-mono text-slate-800">{h.roomId}</b>
                              </span>
                            </div>
                          )}
                          {h.event === 'player_joined' && (
                            <div className="flex items-center gap-1.5">
                              <span className="px-2 py-0.5 bg-blue-50 text-blue-700 font-black rounded-md text-[9px] uppercase tracking-wider border border-blue-100">Игрок зашел</span>
                              <span className="text-slate-600 font-semibold font-sans">
                                Мобильное устройство успешно зацепилось к столу <b className="font-mono text-slate-800">{h.roomId}</b>
                              </span>
                            </div>
                          )}
                          {h.event === 'card_pulled' && (
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="px-2 py-0.5 bg-purple-50 text-purple-700 font-black rounded-md text-[9px] uppercase tracking-wider border border-purple-100">Взята карта</span>
                              <span className="text-slate-600 font-semibold font-sans">
                                Вытянута игровая карта <code className="font-mono text-[10.5px] bg-purple-50 text-purple-600 px-1 py-0.5 rounded-md font-bold">{h.cardId || 'ID отсутствует'}</code> на игровом столе <b className="font-mono text-slate-800">{h.roomId}</b>
                              </span>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="text-right text-[10px] text-slate-400 font-medium shrink-0 font-sans">
                        {new Date(h.timestamp).toLocaleDateString('ru-RU')}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
