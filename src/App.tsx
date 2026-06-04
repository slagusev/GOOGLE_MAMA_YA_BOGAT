import React, { useState, useEffect } from 'react';
import { 
  Menu, 
  X, 
  Dices, 
  ShieldCheck, 
  Sparkles, 
  Lock, 
  User, 
  LogIn, 
  Play,
  ArrowRight,
  Calculator,
  Eye,
  Settings
} from 'lucide-react';
import Sidebar from './components/Sidebar';
import RulesView from './components/RulesView';
import WordDownload from './components/WordDownload';
import CalculatorView from './components/CalculatorView';
import AdminPanel from './components/AdminPanel';
import GameScreen from './components/GameScreen';
import LocalCaptcha from './components/LocalCaptcha';
import { Theme, Card, GameRules, SEOSettings, HomeSettings, FooterSettings } from './types';

export default function App() {
  // Determine initial tab based on window path or search parameters immediately
  const getInitialTab = () => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('table')) return 'game';
    
    const path = window.location.pathname;
    if (path === '/game') return 'game';
    if (path === '/rules') return 'rules';
    if (path === '/calculator') return 'calculator';
    if (path === '/card') return 'card';
    if (path === '/admin') return 'admin';
    return 'home';
  };

  const [currentTab, setCurrentTab] = useState<string>(getInitialTab);
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(false); // mobile responsive sidebar state
  const [isAdmin, setIsAdmin] = useState<boolean>(false);

  // Loaded database configs
  const [themes, setThemes] = useState<Theme[]>([]);
  const [cards, setCards] = useState<Card[]>([]);
  const [rules, setRules] = useState<GameRules>({ text: '' });
  const [seo, setSeo] = useState<SEOSettings>({ title: '', description: '', keywords: '' });
  const [home, setHome] = useState<HomeSettings>({ title: '', subtitle: '', imageUrl: '', calculatorUrl: '', cardUrl: '' });
  const [footer, setFooter] = useState<FooterSettings>({ text: '' });

  // Admin login credentials input
  const [loginUser, setLoginUser] = useState('');
  const [loginPass, setLoginPass] = useState('');
  const [authError, setAuthError] = useState('');
  const [isAdminLoginOpen, setIsAdminLoginOpen] = useState(false);
  const [failedAttempts, setFailedAttempts] = useState<number>(0);

  useEffect(() => {
    loadGameState();

    // Check if admin is currently authorized (localStorage check)
    const token = localStorage.getItem('admin_authorized_token');
    if (token === 'admin-authorized-token') {
      setIsAdmin(true);
    }

    // Listen to popstate for back/forward browser support
    const handlePopState = () => {
      const currentPath = window.location.pathname;
      const urlParams = new URLSearchParams(window.location.search);
      
      if (urlParams.get('table')) {
        setCurrentTab('game');
      } else if (currentPath === '/game') {
        setCurrentTab('game');
      } else if (currentPath === '/rules') {
        setCurrentTab('rules');
      } else if (currentPath === '/calculator') {
        setCurrentTab('calculator');
      } else if (currentPath === '/card') {
        setCurrentTab('card');
      } else if (currentPath === '/admin') {
        setCurrentTab('admin');
      } else {
        setCurrentTab('home');
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, []);

  // Sync view selection state with window pathname / URL state machine
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const tableId = params.get('table');

    let targetPath = '/';
    if (currentTab === 'game') {
      targetPath = '/game';
    } else if (currentTab === 'rules') {
      targetPath = '/rules';
    } else if (currentTab === 'calculator') {
      targetPath = '/calculator';
    } else if (currentTab === 'card') {
      targetPath = '/card';
    } else if (currentTab === 'admin') {
      targetPath = '/admin';
    }

    // Preserve the table query if we are transition-synced to game screen
    const newUrl = new URL(window.location.href);
    newUrl.pathname = targetPath;
    
    if (currentTab === 'game' && tableId) {
      newUrl.searchParams.set('table', tableId);
    } else {
      newUrl.searchParams.delete('table');
    }

    // Only update history if the pathname or search query has actually changed
    if (
      window.location.pathname !== targetPath || 
      (currentTab === 'game' && tableId && !window.location.search.includes('table=')) || 
      (currentTab !== 'game' && window.location.search.includes('table='))
    ) {
      window.history.pushState({ tab: currentTab }, '', newUrl.toString());
    }
  }, [currentTab]);

  // Sync website head SEO dynamically (Message 9)
  useEffect(() => {
    if (seo.title) {
      document.title = seo.title;
    }
    
    // Update or insert meta description
    let metaDesc = document.querySelector('meta[name="description"]');
    if (!metaDesc) {
      metaDesc = document.createElement('meta');
      metaDesc.setAttribute('name', 'description');
      document.head.appendChild(metaDesc);
    }
    metaDesc.setAttribute('content', seo.description || '');

    // Update or insert meta keywords
    let metaKeywords = document.querySelector('meta[name="keywords"]');
    if (!metaKeywords) {
      metaKeywords = document.createElement('meta');
      metaKeywords.setAttribute('name', 'keywords');
      document.head.appendChild(metaKeywords);
    }
    metaKeywords.setAttribute('content', seo.keywords || '');

    // Sync OpenGraph Title
    const ogTitleVal = seo.ogTitle || seo.title || '';
    if (ogTitleVal) {
      let ogTitle = document.querySelector('meta[property="og:title"]');
      if (!ogTitle) {
        ogTitle = document.createElement('meta');
        ogTitle.setAttribute('property', 'og:title');
        document.head.appendChild(ogTitle);
      }
      ogTitle.setAttribute('content', ogTitleVal);
    }

    // Sync OpenGraph Description
    const ogDescVal = seo.ogDescription || seo.description || '';
    if (ogDescVal) {
      let ogDesc = document.querySelector('meta[property="og:description"]');
      if (!ogDesc) {
        ogDesc = document.createElement('meta');
        ogDesc.setAttribute('property', 'og:description');
        document.head.appendChild(ogDesc);
      }
      ogDesc.setAttribute('content', ogDescVal);
    }

    // Sync OpenGraph Image
    const ogImgVal = seo.ogImage || '';
    if (ogImgVal) {
      let ogImg = document.querySelector('meta[property="og:image"]');
      if (!ogImg) {
        ogImg = document.createElement('meta');
        ogImg.setAttribute('property', 'og:image');
        document.head.appendChild(ogImg);
      }
      ogImg.setAttribute('content', ogImgVal);
    }

    // Sync OpenGraph Type
    const ogTypeVal = seo.ogType || 'website';
    if (ogTypeVal) {
      let ogType = document.querySelector('meta[property="og:type"]');
      if (!ogType) {
        ogType = document.createElement('meta');
        ogType.setAttribute('property', 'og:type');
        document.head.appendChild(ogType);
      }
      ogType.setAttribute('content', ogTypeVal);
    }

    // Sync OpenGraph URL
    let ogUrl = document.querySelector('meta[property="og:url"]');
    if (!ogUrl) {
      ogUrl = document.createElement('meta');
      ogUrl.setAttribute('property', 'og:url');
      document.head.appendChild(ogUrl);
    }
    ogUrl.setAttribute('content', window.location.href);
  }, [seo]);

  const loadGameState = async () => {
    try {
      const res = await fetch('/api/game/state');
      if (res.ok) {
        const data = await res.json();
        setThemes(data.themes);
        setCards(data.cards);
        setRules(data.rules);
        setSeo(data.seo);
        setHome(data.home);
        setFooter(data.footer);
      }
    } catch (err) {
      console.error('Error fetching game data', err);
    }
  };

  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    if (failedAttempts >= 3) {
      setAuthError('Вы превысили лимит неудачных попыток. Пожалуйста, решите капчу.');
      return;
    }
    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ login: loginUser, password: loginPass })
      });
      if (res.ok) {
        localStorage.setItem('admin_authorized_token', 'admin-authorized-token');
        setIsAdmin(true);
        setLoginUser('');
        setLoginPass('');
        setFailedAttempts(0); // Reset failures on success
        // Close modal and transition
        setCurrentTab('admin');
        setIsAdminLoginOpen(false);
      } else {
        const errorData = await res.json();
        setAuthError(errorData.message || 'Ошибка входа');
        setFailedAttempts(prev => prev + 1);
      }
    } catch {
      setAuthError('Ошибка подключения к серверу');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('admin_authorized_token');
    setIsAdmin(false);
  };

  return (
    <div className="flex min-h-screen bg-slate-50/50 text-slate-800 font-sans">
      
      {/* Sidebar Wrapper: responsive desktop/mobile */}
      {currentTab !== 'home' && (
        <div className={`inset-y-0 left-0 z-50 transform transition-transform duration-300 ${
          sidebarOpen 
            ? 'fixed translate-x-0 md:relative' 
            : 'fixed -translate-x-full md:absolute md:-translate-x-full'
        } shrink-0`}>
          <Sidebar
            currentTab={currentTab}
            setCurrentTab={setCurrentTab}
            isAdmin={isAdmin}
            logout={handleLogout}
            footerText={footer.text}
            onCloseMobile={() => setSidebarOpen(false)}
            calculatorUrl={home.calculatorUrl}
            cardUrl={home.cardUrl}
          />
        </div>
      )}

      {/* Backdrop overlay for mobile screen when sidebar is open */}
      {sidebarOpen && currentTab !== 'home' && (
        <div 
          className="fixed inset-0 bg-slate-900/40 z-40 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Primary content area */}
      <div className="flex-1 flex flex-col min-w-0">
        
        {/* Navigation Top Header */}
        {currentTab !== 'home' && (
          <header className="bg-white border-b border-slate-100 px-6 py-4 flex items-center justify-between sticky top-0 z-30 shadow-3xs">
            <div className="flex items-center gap-3">
              {/* Toggle button under desktop & mobile (Message 1, Message 3) */}
              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-50 cursor-pointer"
                title="Открыть меню"
              >
                {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
              </button>
              <span className="font-extrabold text-slate-800 tracking-tight text-base flex sm:hidden items-center gap-1.5">
                <Dices className="h-4.5 w-4.5 text-emerald-600 shrink-0" />
                <span>Мама, я богат!</span>
              </span>
              <span className="hidden sm:inline font-bold text-slate-700 text-sm">
                {currentTab === 'game' && 'Игровое поле'}
                {currentTab === 'rules' && 'Свод игровых правил'}
                {currentTab === 'card' && 'Печатный документ'}
                {currentTab === 'calculator' && 'Финансовый расчетник'}
                {currentTab === 'admin' && 'АДМИНИСТРАТИВНАЯ ПАНЕЛЬ'}
              </span>
            </div>

            <div className="flex items-center gap-3">
              {isAdmin && (
                <span className="hidden md:flex items-center gap-1 text-[11px] font-bold text-purple-600 bg-purple-50 px-2 py-1 rounded-lg">
                  <ShieldCheck size={12} />
                  <span>Режим администрирования</span>
                </span>
              )}
              
              <button
                onClick={() => {
                  if (currentTab === 'game') {
                    setCurrentTab('home');
                  } else {
                    setCurrentTab('game');
                  }
                }}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs shadow-xs transition-colors cursor-pointer"
              >
                <Dices size={14} />
                <span>{currentTab === 'game' ? 'На главную' : 'Перейти к игре'}</span>
              </button>
            </div>
          </header>
        )}

        {/* Outer content renderer window */}
        <main className={`flex-1 p-6 w-full mx-auto ${currentTab === 'home' ? 'max-w-2xl flex flex-col justify-center min-h-screen py-12' : 'max-w-7xl'}`}>
          
          {/* Landing / Welcome route tab */}
          {currentTab === 'home' && (
            <div className="max-w-2xl mx-auto bg-white border border-slate-100 rounded-3xl p-6 sm:p-8 shadow-xs space-y-6 flex flex-col items-center text-center animate-fade-in">
              
              {/* Visual Image / Service Illustration custom configured (Message 6) */}
              {home.imageUrl && (
                <div className="rounded-2xl overflow-hidden w-full max-h-[380px] relative group border border-slate-100/80 bg-slate-50">
                  <img 
                    src={home.imageUrl} 
                    alt="Мама, я богат!" 
                    className="w-full h-full object-cover group-hover:scale-101 transition-transform duration-500 ease-out min-h-[200px]"
                    referrerPolicy="no-referrer"
                  />
                  <div className="absolute inset-0 bg-linear-to-t from-slate-950/20 via-transparent to-transparent pointer-events-none" />
                </div>
              )}

              <div className="space-y-3 max-w-lg">
                <h1 className="text-3xl sm:text-4xl font-black text-slate-850 tracking-tight leading-tight">
                  {home.title || 'Мама, я богат! 💸'}
                </h1>
                <p className="text-slate-600 leading-relaxed text-sm">
                  {home.subtitle || 'Интерактивная настольная игра для весёлой компании. Создавайте столы, делитесь QR кодом и разыгрывайте случайные карты бизнес-ситуаций, акций и форс-мазоров в режиме реального времени.'}
                </p>
              </div>

              <div className="w-full pt-2">
                <button
                  onClick={() => setCurrentTab('game')}
                  className="w-full inline-flex items-center justify-center gap-2 px-6 py-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-2xl shadow-md hover:shadow-lg transition-all active:scale-98 cursor-pointer"
                >
                  <Play className="h-5 w-5 fill-current animate-pulse" />
                  <span>Начать игру</span>
                  <ArrowRight className="h-4 w-4" />
                </button>
              </div>

              <div className="pt-2 border-t border-slate-50 w-full flex flex-col items-center">
                <button
                  onClick={() => setIsAdminLoginOpen(true)}
                  className="text-xs font-bold text-slate-450 hover:text-purple-600 transition-colors cursor-pointer decoration-dotted underline underline-offset-4"
                >
                  Войти
                </button>
              </div>
            </div>
          )}

          {/* Core interactive board game screen */}
          {currentTab === 'game' && (
            <GameScreen
              themes={themes}
              cards={cards}
              footerText={footer.text}
            />
          )}

          {/* Book rules viewer screen */}
          {currentTab === 'rules' && (
            <RulesView rulesHtml={rules.text} />
          )}

          {/* Downloader screen */}
          {currentTab === 'card' && (
            <WordDownload />
          )}

          {/* Scoreboard balance calculator screen */}
          {currentTab === 'calculator' && (
            <CalculatorView />
          )}

          {/* Control center screen */}
          {currentTab === 'admin' && isAdmin && (
            <AdminPanel />
          )}

        </main>
      </div>

      {/* Admin Login Modal Overlay */}
      {isAdminLoginOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in select-none">
          <div className="bg-white border border-slate-100 rounded-3xl p-6 sm:p-8 w-full max-w-md shadow-xl relative animate-in fade-in zoom-in-95 duration-200 text-left">
            {/* Close Button */}
            <button
              onClick={() => {
                setIsAdminLoginOpen(false);
                setAuthError('');
              }}
              className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-50 cursor-pointer"
              title="Закрыть"
            >
              <X size={20} />
            </button>

            <div className="flex items-center gap-2.5 pb-4 border-b border-slate-50 mb-6">
              <div className="p-2.5 bg-purple-50 rounded-xl text-purple-600">
                <Lock className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-extrabold text-slate-800 text-base">Вход в личный кабинет</h3>
              </div>
            </div>

            {isAdmin ? (
              <div className="text-center py-6 space-y-4">
                <div className="inline-flex h-12 w-12 bg-purple-50 text-purple-600 rounded-xl items-center justify-center text-lg">
                  👑
                </div>
                <div className="space-y-1">
                  <p className="font-extrabold text-slate-800 text-sm">Вы уже вошли как администратор</p>
                  <p className="text-xs text-slate-400 leading-normal px-4">Перейдите в панель управления из левого меню.</p>
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => {
                      setIsAdminLoginOpen(false);
                      setCurrentTab('admin');
                    }}
                    className="flex-1 inline-flex items-center justify-center gap-1.5 px-4 py-3 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl text-xs cursor-pointer shadow-xs transition-colors"
                  >
                    <Settings size={14} />
                    <span>Панель управления</span>
                  </button>
                  <button
                    onClick={() => {
                      handleLogout();
                    }}
                    className="inline-flex items-center justify-center gap-1.5 px-4 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs cursor-pointer transition-colors"
                  >
                    <span>Выйти</span>
                  </button>
                </div>
              </div>
            ) : failedAttempts >= 3 ? (
              <LocalCaptcha
                onSuccess={() => {
                  setFailedAttempts(2); // Unlocks exactly 1 more attempt
                  setAuthError('');
                }}
              />
            ) : (
              <form onSubmit={handleAdminLogin} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">Имя пользователя (Логин)</label>
                  <div className="relative">
                    <User className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-400" />
                    <input
                      type="text"
                      required
                      value={loginUser}
                      onChange={(e) => setLoginUser(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 hover:border-slate-300 rounded-xl outline-none focus:bg-white focus:ring-4 focus:ring-purple-500/5 focus:border-purple-500 text-xs text-slate-700 font-bold transition-all shadow-3xs"
                      placeholder="Например: admin"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">Пароль</label>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-440" />
                    <input
                      type="password"
                      required
                      value={loginPass}
                      onChange={(e) => setLoginPass(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 hover:border-slate-300 rounded-xl outline-none focus:bg-white focus:ring-4 focus:ring-purple-500/5 focus:border-purple-500 text-xs font-bold transition-all shadow-3xs"
                      placeholder="Например: admin"
                    />
                  </div>
                </div>

                {authError && (
                  <p className="text-[11px] font-bold text-rose-600 bg-rose-50 border border-rose-100 rounded-lg p-2.5 text-center">
                    🛑 {authError}
                  </p>
                )}

                <button
                  type="submit"
                  className="w-full flex items-center justify-center gap-1.5 py-3 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl text-xs shadow-md transition-colors cursor-pointer"
                >
                  <LogIn size={14} />
                  <span>Авторизоваться</span>
                </button>


              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
