import React, { useState } from 'react';
import { Calculator, ExternalLink, Plus, Minus, RotateCcw, PiggyBank, Receipt } from 'lucide-react';

export default function CalculatorView() {
  const [balance, setBalance] = useState(10000);
  const [delta, setDelta] = useState('');
  const [history, setHistory] = useState<Array<{ type: 'plus' | 'minus'; amount: number; desc: string; time: string }>>([
    { type: 'plus', amount: 10000, desc: 'Стартовый баланс игры', time: new Date().toLocaleTimeString() }
  ]);
  const [desc, setDesc] = useState('');

  const handlePlus = () => {
    const num = parseFloat(delta);
    if (!isNaN(num) && num > 0) {
      setBalance(prev => prev + num);
      setHistory(prev => [
        { type: 'plus', amount: num, desc: desc || 'Общие поступления', time: new Date().toLocaleTimeString() },
        ...prev
      ]);
      setDelta('');
      setDesc('');
    }
  };

  const handleMinus = () => {
    const num = parseFloat(delta);
    if (!isNaN(num) && num > 0) {
      setBalance(prev => prev - num);
      setHistory(prev => [
        { type: 'minus', amount: num, desc: desc || 'Расходы / налоги', time: new Date().toLocaleTimeString() },
        ...prev
      ]);
      setDelta('');
      setDesc('');
    }
  };

  const handleReset = () => {
    if (confirm('Сбросить баланс до стартовых 10,000$?')) {
      setBalance(10000);
      setHistory([{ type: 'plus', amount: 10000, desc: 'Новая игра начата', time: new Date().toLocaleTimeString() }]);
      setDelta('');
      setDesc('');
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-fade-in">
      {/* Header card with external fallback */}
      <div className="bg-white rounded-2xl border border-slate-100 p-6 md:p-8 shadow-xs flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="flex items-center gap-4 text-center md:text-left">
          <div className="p-3 bg-teal-50 rounded-2xl text-teal-600 self-center">
            <Calculator className="h-7 w-7" />
          </div>
          <div>
            <h1 className="text-xl font-extrabold text-slate-800 tracking-tight">Финансовый Калькулятор</h1>
            <p className="text-sm text-slate-500">Управляйте своим счетом или откройте расширенный калькулятор</p>
          </div>
        </div>
        
        <a 
          href="https://www.google.com/search?q=calculator" 
          target="_blank" 
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 px-5 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition-all text-sm cursor-pointer"
        >
          <span>Внешний калькулятор Google</span>
          <ExternalLink size={14} />
        </a>
      </div>

      {/* Grid: Ledger + Operations */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
        {/* Balance & Ledger */}
        <div className="md:col-span-7 bg-white rounded-2xl border border-slate-100 p-6 shadow-xs flex flex-col h-[500px]">
          <div className="flex items-center justify-between mb-4 pb-4 border-b border-slate-100">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <PiggyBank size={14} /> Личный Счет Игрока
            </span>
            <button 
              onClick={handleReset}
              className="p-1.5 hover:bg-slate-50 rounded-lg text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
              title="Начать заново"
            >
              <RotateCcw size={16} />
            </button>
          </div>

          {/* Balance Display */}
          <div className="text-center py-6 bg-slate-50 rounded-2xl border border-slate-100 mb-6">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest">Текущий Капитал</p>
            <p className="text-4xl font-black text-emerald-600 mt-1">${balance.toLocaleString()}</p>
          </div>

          {/* Transaction history log */}
          <div className="flex-1 overflow-y-auto space-y-3 pr-1">
            <h4 className="text-xs font-bold text-slate-400 mb-2 uppercase tracking-wide">История операций:</h4>
            {history.length === 0 ? (
              <p className="text-xs text-slate-400 italic text-center py-8">История пуста</p>
            ) : (
              history.map((h, i) => (
                <div key={i} className="flex items-center justify-between p-3 rounded-xl bg-slate-50/50 border border-slate-100/30 text-xs">
                  <div>
                    <p className="font-semibold text-slate-700">{h.desc}</p>
                    <p className="text-[10px] text-slate-400 mt-0.5">{h.time}</p>
                  </div>
                  <span className={`font-extrabold text-sm ${h.type === 'plus' ? 'text-emerald-600' : 'text-rose-600'}`}>
                    {h.type === 'plus' ? '+' : '-'}${h.amount.toLocaleString()}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Dynamic Calculator Operations */}
        <div className="md:col-span-5 bg-white rounded-2xl border border-slate-100 p-6 shadow-xs flex flex-col justify-between h-auto md:h-[500px]">
          <div>
            <div className="pb-4 border-b border-slate-100 mb-6 flex items-center gap-1.5 text-xs font-bold text-slate-400 uppercase tracking-wider">
              <Receipt size={14} /> Добавить транзакцию
            </div>

            <div className="space-y-4">
              {/* Op Amount */}
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">Сумма ($)</label>
                <input 
                  type="number"
                  placeholder="Например: 1500"
                  value={delta}
                  onChange={(e) => setDelta(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 hover:border-slate-300 rounded-xl focus:bg-white focus:ring-4 focus:ring-emerald-500/5 focus:border-emerald-500 transition-all text-sm outline-none font-bold text-slate-800 shadow-3xs"
                />
              </div>

              {/* Op Details */}
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">Комментарий / Описание</label>
                <input 
                  type="text"
                  placeholder="Например: Покупка темы акции"
                  value={desc}
                  onChange={(e) => setDesc(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 hover:border-slate-300 rounded-xl focus:bg-white focus:ring-4 focus:ring-emerald-500/5 focus:border-emerald-500 transition-all text-sm outline-none text-slate-700 shadow-3xs"
                />
              </div>
            </div>
          </div>

          <div className="space-y-3 mt-8">
            <button
              onClick={handlePlus}
              className="w-full flex items-center justify-center gap-2 py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl transition-all shadow-xs active:scale-98 cursor-pointer text-sm"
            >
              <Plus size={16} /> Начислить прибыль
            </button>
            <button
              onClick={handleMinus}
              className="w-full flex items-center justify-center gap-2 py-3.5 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl transition-all shadow-xs active:scale-98 cursor-pointer text-sm"
            >
              <Minus size={16} /> Снять за расход
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
