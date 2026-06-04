import React, { useState, useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { QRCodeSVG } from 'qrcode.react';
import { 
  Users, 
  Share2, 
  QrCode, 
  RotateCcw, 
  Sparkles, 
  X, 
  Info, 
  Layers, 
  Check, 
  Play, 
  Tv, 
  MonitorPlay,
  Bookmark
} from 'lucide-react';
import { Theme, Card } from '../types';

interface GameScreenProps {
  themes: Theme[];
  cards: Card[];
  footerText: string;
}

export default function GameScreen({ themes, cards, footerText }: GameScreenProps) {
  const [roomId, setRoomId] = useState<string>('');
  const [inRoom, setInRoom] = useState<boolean>(false);
  const [playersCount, setPlayersCount] = useState<number>(1);
  const [drawnCards, setDrawnCards] = useState<{ [themeId: string]: string[] }>({}); // synced with room or local
  const [activeCard, setActiveCard] = useState<Card | null>(null);
  const [activeTheme, setActiveTheme] = useState<Theme | null>(null);
  const [showShareModal, setShowShareModal] = useState<boolean>(false);
  const [log, setLog] = useState<string[]>([]);
  const [isCopied, setIsCopied] = useState<boolean>(false);

  // Local-only drawn status if off-line / no joint table
  const [localDrawnCardIds, setLocalDrawnCardIds] = useState<{ [themeId: string]: string[] }>({});

  const socketRef = useRef<Socket | null>(null);

  // Auto-connect table if 'table' query parameter exists in URL
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const tableParam = params.get('table');
    if (tableParam) {
      joinRoom(tableParam);
    }
  }, [cards]); // retype if cards load

  // Cleanup socket on unmount
  useEffect(() => {
    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, []);

  // Generate random room ID
  const generateRandomRoomId = () => {
    return 'table_' + Math.random().toString(36).substring(2, 7).toUpperCase();
  };

  const getShareUrl = (room: string) => {
    try {
      // Использование встроенного API URL гарантирует 100% валидный формат ссылки:
      // правильный регистр протокола и хоста, наличие слеша перед параметрами и отсутствие пробелов.
      const url = new URL(window.location.href);
      url.pathname = '/game'; // Всегда генерировать ссылку на страницу игры
      url.searchParams.set('table', room);
      return url.toString().trim();
    } catch {
      const base = window.location.origin + '/game';
      return `${base}?table=${room}`.trim();
    }
  };

  // Join Table Room via WebSocket
  const joinRoom = (targetRoomId: string) => {
    if (!targetRoomId.trim()) return;
    const cleanId = targetRoomId.trim();

    // Disconnect old connection if exists
    if (socketRef.current) {
      socketRef.current.disconnect();
    }

    // Connect to same origin standard socket.io server
    const socket = io(window.location.origin);
    socketRef.current = socket;

    socket.on('connect', () => {
      socket.emit('join-room', cleanId);
    });

    socket.on('room-sync', (data: { roomId: string; drawnCardIds: { [tId: string]: string[] }; activePlayersCount: number }) => {
      setRoomId(data.roomId);
      setDrawnCards(data.drawnCardIds);
      setPlayersCount(data.activePlayersCount);
      setInRoom(true);
      
      // Update browser URL query param cleanly without reloading
      const newUrl = getShareUrl(data.roomId);
      window.history.replaceState({ path: newUrl }, '', newUrl);

      addLog(`Вы подключились к столу ${data.roomId}`);
    });

    socket.on('player-joined', (data: { activePlayersCount: number }) => {
      setPlayersCount(data.activePlayersCount);
      addLog(`👨‍👩‍👦 Новый игрок присоединился к столу! Всего игроков: ${data.activePlayersCount}`);
    });

    socket.on('player-left', (data: { activePlayersCount: number }) => {
      setPlayersCount(data.activePlayersCount);
      addLog(`🚶 Игрок покинул стол. Всего игроков: ${data.activePlayersCount}`);
    });

    socket.on('card-drawn-broadcast', (payload: { themeId: string; card: Card; drawnCardIds: { [tId: string]: string[] }; reshuffled: boolean }) => {
      setDrawnCards(payload.drawnCardIds);
      const theme = themes.find(t => t.id === payload.themeId);
      
      if (payload.reshuffled) {
        addLog(`🔄 Колода темы "${theme?.name || 'Без названия'}" была перемешана, так как все карты были разыграны!`);
      }

      addLog(`🎲 Вытянута карта из темы "${theme?.name || 'Без названия'}"`);

      // Open card description ONLY if we are the drawing tab (we manage who drawing)
      // Since it broadcasts to everyone, we can show a log for passive watchers, and the drawer gets a popup.
      // Wait, let's make it so whoever clicked gets shown the card. Since clicking draws it server-side, 
      // let's save a ref or state of who triggered, or simply show the card for everyone so all people at the table see it!
      // This is perfect because in a party, everyone sees the drawn card on their screen too! That's a true collaborative multiplier!
      const targetTheme = themes.find(t => t.id === payload.card.themeId);
      setActiveTheme(targetTheme || null);
      setActiveCard(payload.card);
    });

    socket.on('room-cards-reset', (data: { drawnCardIds: { [tID: string]: string[] } }) => {
      setDrawnCards(data.drawnCardIds);
      addLog('🧹 Все разыгранные карты на этом столе были сброшены к началу.');
    });
  };

  const addLog = (msg: string) => {
    setLog(prev => [msg, ...prev.slice(0, 15)]);
  };

  const handleCreateNewTable = () => {
    const newRoom = generateRandomRoomId();
    joinRoom(newRoom);
    setShowShareModal(true);
  };

  const handleDisconnectTable = () => {
    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
    }
    setInRoom(false);
    setRoomId('');
    setPlayersCount(1);
    setDrawnCards({});
    // Remove query params
    const cleanUrl = window.location.origin + window.location.pathname;
    window.history.replaceState({ path: cleanUrl }, '', cleanUrl);
    addLog('Вы вышли из режима совместного стола.');
  };

  const resetAllCardHistory = () => {
    if (inRoom && socketRef.current) {
      if (confirm('Сбросить историю вытянутых карт для всего совместного стола?')) {
        socketRef.current.emit('reset-room-cards', roomId);
      }
    } else {
      if (confirm('Сбросить историю вытянутых карт для вашей локальной сессии?')) {
        setLocalDrawnCardIds({});
        addLog('Локальная история ходов сброшена.');
      }
    }
  };

  // Pulling a card (Action)
  const drawCard = (theme: Theme) => {
    const themeCards = cards.filter(c => c.themeId === theme.id);
    if (themeCards.length === 0) {
      alert('В этой теме пока нет карточек! Добавьте их в админке.');
      return;
    }

    if (inRoom && socketRef.current) {
      // Draw server-authoritative
      socketRef.current.emit('draw-card', { roomId, themeId: theme.id });
    } else {
      // Solo / Offline Mode
      const drawnIds = localDrawnCardIds[theme.id] || [];
      const available = themeCards.filter(c => !drawnIds.includes(c.id));

      let finalDrawnIds = [...drawnIds];
      let selected: Card;
      let shuffled = false;

      if (available.length === 0) {
        // Shuffling local
        finalDrawnIds = [];
        const randomIndex = Math.floor(Math.random() * themeCards.length);
        selected = themeCards[randomIndex];
        finalDrawnIds.push(selected.id);
        shuffled = true;
      } else {
        const randomIndex = Math.floor(Math.random() * available.length);
        selected = available[randomIndex];
        finalDrawnIds.push(selected.id);
      }

      setLocalDrawnCardIds(prev => ({
        ...prev,
        [theme.id]: finalDrawnIds
      }));

      if (shuffled) {
        addLog(`🔄 Колода "${theme.name}" была перемешана (карты пошли по второму кругу)`);
      }
      addLog(`🎲 Вытянули карту из темы "${theme.name}"`);

      setActiveTheme(theme);
      setActiveCard(selected);
    }
  };

  const copyShareLink = () => {
    navigator.clipboard.writeText(getShareUrl(roomId));
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  // Tailwind styling mapper for colors
  const getColorClasses = (color: string) => {
    switch (color) {
      case 'emerald':
        return {
          btn: 'bg-emerald-50 hover:bg-emerald-100/80 border-emerald-200 text-emerald-800',
          badge: 'bg-emerald-600 text-white',
          themeIcon: 'text-emerald-600 bg-emerald-50 border-emerald-100',
          gradient: 'from-emerald-500 to-teal-500',
          accent: 'border-emerald-500'
        };
      case 'sky':
        return {
          btn: 'bg-sky-50 hover:bg-sky-100/80 border-sky-200 text-sky-800',
          badge: 'bg-sky-600 text-white',
          themeIcon: 'text-sky-600 bg-sky-50 border-sky-100',
          gradient: 'from-sky-500 to-blue-500',
          accent: 'border-sky-500'
        };
      case 'indigo':
        return {
          btn: 'bg-indigo-50 hover:bg-indigo-100/80 border-indigo-200 text-indigo-800',
          badge: 'bg-indigo-600 text-white',
          themeIcon: 'text-indigo-600 bg-indigo-50 border-indigo-100',
          gradient: 'from-indigo-500 to-violet-500',
          accent: 'border-indigo-500'
        };
      case 'amber':
        return {
          btn: 'bg-amber-50 hover:bg-amber-100/80 border-amber-200 text-amber-800',
          badge: 'bg-amber-600 text-white',
          themeIcon: 'text-amber-600 bg-amber-50 border-amber-100',
          gradient: 'from-amber-500 to-orange-500',
          accent: 'border-amber-500'
        };
      case 'rose':
        return {
          btn: 'bg-rose-50 hover:bg-rose-100/80 border-rose-200 text-rose-800',
          badge: 'bg-rose-600 text-white',
          themeIcon: 'text-rose-600 bg-rose-50 border-rose-100',
          gradient: 'from-rose-500 to-pink-500',
          accent: 'border-rose-500'
        };
      case 'purple':
        return {
          btn: 'bg-purple-50 hover:bg-purple-100/80 border-purple-200 text-purple-800',
          badge: 'bg-purple-600 text-white',
          themeIcon: 'text-purple-600 bg-purple-50 border-purple-100',
          gradient: 'from-purple-500 to-fuchsia-500',
          accent: 'border-purple-500'
        };
      case 'orange':
        return {
          btn: 'bg-orange-50 hover:bg-orange-100/80 border-orange-200 text-orange-800',
          badge: 'bg-orange-600 text-white',
          themeIcon: 'text-orange-600 bg-orange-50 border-orange-100',
          gradient: 'from-orange-500 to-red-500',
          accent: 'border-orange-500'
        };
      case 'teal':
        return {
          btn: 'bg-teal-50 hover:bg-teal-100/80 border-teal-200 text-teal-800',
          badge: 'bg-teal-600 text-white',
          themeIcon: 'text-teal-600 bg-teal-50 border-teal-100',
          gradient: 'from-teal-500 to-emerald-500',
          accent: 'border-teal-500'
        };
      default:
        return {
          btn: 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-800',
          badge: 'bg-slate-600 text-white',
          themeIcon: 'text-slate-600 bg-slate-50 border-slate-100',
          gradient: 'from-slate-500 to-gray-500',
          accent: 'border-slate-500'
        };
    }
  };

  return (
    <div className="relative min-h-[80vh] flex flex-col justify-between">
      {/* Game Mode Header Indicators */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-black text-slate-800 tracking-tight flex items-center gap-2">
            <span>🎮 Игровой Стол</span>
            {inRoom ? (
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 border border-emerald-200 animate-pulse">
                СВЯЗАННЫЙ СТОЛ
              </span>
            ) : (
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
                ОФЛАЙН РЕЖИМ
              </span>
            )}
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            {inRoom 
              ? `Вы играете вместе. ID стола: ${roomId}. Любое вытягивание карточки синхронизируется.` 
              : 'Индивидуальная игра на одном устройстве. Карточки сохраняются в браузере.'
            }
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          {inRoom ? (
            <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-100 rounded-xl px-3 py-2 text-xs">
              <Users size={14} className="text-emerald-600 shrink-0" />
              <span className="font-bold text-emerald-800">{playersCount} игроков</span>
              <button 
                onClick={handleDisconnectTable}
                className="ml-2 font-bold text-[10px] text-rose-600 hover:text-rose-800 cursor-pointer underline underline-offset-2"
              >
                Отсоединить
              </button>
            </div>
          ) : (
            <button
              onClick={handleCreateNewTable}
              className="inline-flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-emerald-50 hover:text-emerald-700 text-slate-700 font-bold rounded-xl text-xs transition-colors cursor-pointer border border-slate-200/50"
            >
              <Users size={14} />
              <span>Играть с друзьями</span>
            </button>
          )}

          <button
            onClick={resetAllCardHistory}
            className="p-2 border border-slate-100 hover:bg-slate-50 rounded-xl text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
            title="Сбросить историю карт"
          >
            <RotateCcw size={16} />
          </button>
        </div>
      </div>

      {/* Main Topics selection container */}
      {themes.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center bg-slate-50 border border-dashed border-slate-200 rounded-3xl p-8">
          <Layers className="h-10 w-10 text-slate-300 mb-2" />
          <h3 className="font-bold text-slate-700">Нет доступных тем</h3>
          <p className="text-xs text-slate-500 max-w-sm mt-1">
            Для выбранного по умолчанию комплекта не добавлены темы. Создайте их в панели администратора.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {themes.map(theme => {
            const styled = getColorClasses(theme.color);
            return (
              <button
                key={theme.id}
                onClick={() => drawCard(theme)}
                className={`flex flex-col justify-between align-stretch text-left p-6 min-h-[120px] rounded-2xl border transition-all active:scale-98 hover:scale-[1.01] hover:shadow-sm relative overflow-hidden cursor-pointer ${styled.btn}`}
              >
                <div className="flex items-start justify-between w-full">
                  <span className="font-extrabold text-base leading-tight pr-6 drop-shadow-2xs">{theme.name}</span>
                  <div className="shrink-0 flex items-center justify-center h-8 w-8 rounded-xl bg-white/75 text-xs shadow-3xs">
                    🃏
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}



      {/* CENTER-POSITIONED MODAL: Drawn Card Modal (Message 3) */}
      {activeCard && activeTheme && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <div 
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity"
            onClick={() => {
              setActiveCard(null);
              setActiveTheme(null);
            }}
          />

          {/* Modal Card content centered */}
          <div className="relative bg-white rounded-3xl w-full max-w-lg shadow-2xl border border-slate-100 overflow-hidden transform transition-all p-6 md:p-8 animate-scale-up text-center">
            {/* Header Theme tag */}
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-slate-100 text-slate-600 mb-6 border border-slate-200/50">
              <span>{activeTheme.name}</span>
            </div>

            {/* Simulated Envelope Vector Logo */}
            <div className={`mx-auto w-12 h-12 rounded-xl flex items-center justify-center mb-6 text-xl bg-linear-to-r ${getColorClasses(activeTheme.color).gradient} text-white shadow-md shadow-emerald-500/10`}>
              💸
            </div>

            {/* Question Text in center */}
            <div className="min-h-[140px] flex items-center justify-center mb-8 px-2">
              <p className="text-lg md:text-xl font-extrabold text-slate-800 leading-snug tracking-tight">
                {activeCard.text}
              </p>
            </div>

            {/* Rule 3: Beneath question, a single "CLOSE" ("Закрыть") button instead of next card */}
            <button
              onClick={() => {
                setActiveCard(null);
                setActiveTheme(null);
              }}
              className="w-full py-4 bg-slate-800 hover:bg-slate-900 text-white font-bold rounded-2xl transition-all shadow-md hover:shadow-lg active:scale-98 cursor-pointer text-sm"
            >
              Закрыть
            </button>
          </div>
        </div>
      )}

      {/* FLOAT BUTTON (FAB) IN BOTTOM-RIGHT: Table share & QR (Message 7) */}
      <button
        onClick={() => {
          if (!inRoom) {
            handleCreateNewTable();
          } else {
            setShowShareModal(true);
          }
        }}
        className="fixed bottom-6 right-6 z-40 p-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-full shadow-xl transition-all hover:scale-105 active:scale-95 cursor-pointer flex items-center gap-2 group-hover:scale-110"
        title="Совместный стол"
      >
        <QrCode className="h-6 w-6" />
        <span className="max-w-0 overflow-hidden group-hover:max-w-xs transition-all duration-300 ease-in-out text-sm font-bold whitespace-nowrap">
          {inRoom ? 'Инфо стола' : 'Поделиться столом'}
        </span>
      </button>

      {/* SHARE COMPANION MODAL */}
      {showShareModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <div 
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-xs"
            onClick={() => setShowShareModal(false)}
          />

          <div className="relative bg-white rounded-3xl w-full max-w-md shadow-2xl border border-slate-100 p-6 text-center z-10 animate-scale-up">
            <button
              onClick={() => setShowShareModal(false)}
              className="absolute right-4 top-4 p-1 rounded-lg text-slate-400 hover:bg-slate-50 cursor-pointer"
            >
              <X size={18} />
            </button>

            <div className="mx-auto w-12 h-12 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center mb-4">
              <QrCode className="h-6 w-6" />
            </div>

            <h3 className="text-lg font-black text-slate-800 mb-1">Совместная игра</h3>
            <p className="text-xs text-slate-400 max-w-xs mx-auto mb-6">
              Сканируйте QR-код или скопируйте ссылку, чтобы подключить другие телефоны к этому игровому столу!
            </p>

            {/* QR Code Canvas */}
            <div className="inline-block p-4 bg-slate-50 rounded-2xl border border-slate-100 mb-6">
              <QRCodeSVG 
                value={getShareUrl(roomId)} 
                size={160} 
                level="M" 
                includeMargin={true}
              />
            </div>

            {/* Share Link display */}
            <div className="flex items-center gap-2 p-2.5 bg-slate-50 border border-slate-100 rounded-xl mb-6">
              <input
                type="text"
                readOnly
                value={getShareUrl(roomId)}
                className="flex-1 bg-transparent text-slate-600 text-xs font-semibold outline-none px-2 select-all truncate"
              />
              <button
                onClick={copyShareLink}
                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[10px] rounded-lg shadow-xs transition-all active:scale-95 cursor-pointer shrink-0"
              >
                {isCopied ? 'Скопировано!' : 'Копировать'}
              </button>
            </div>

            <div className="flex items-center justify-center gap-1.5 text-[10px] text-slate-400 font-bold border-t border-slate-100 pt-4">
              <Users size={12} className="text-emerald-500" />
              <span>Сейчас подключено: {playersCount} чел.</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
