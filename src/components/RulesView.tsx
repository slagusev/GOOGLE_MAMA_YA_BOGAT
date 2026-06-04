import React from 'react';
import { BookOpen, Sparkles, Trophy } from 'lucide-react';

interface RulesViewProps {
  rulesHtml: string;
}

export default function RulesView({ rulesHtml }: RulesViewProps) {
  return (
    <div className="max-w-3xl mx-auto bg-white rounded-2xl border border-slate-100 p-6 md:p-10 shadow-xs animate-fade-in">
      {/* Title */}
      <div className="flex items-center gap-3 mb-8 pb-4 border-b border-slate-100">
        <div className="p-3 bg-emerald-50 rounded-2xl text-emerald-600">
          <BookOpen className="h-6 w-6" />
        </div>
        <div>
          <h1 className="text-2xl font-black text-slate-800 tracking-tight">Правила Игры</h1>
          <p className="text-sm text-slate-500">Официальный кодекс начинающих миллионеров</p>
        </div>
      </div>

      {/* Embedded HTML Block */}
      <div 
        className="prose prose-slate max-w-none text-slate-600 leading-relaxed
          [&>h1]:text-2xl [&>h1]:font-extrabold [&>h1]:text-slate-800 [&>h1]:mt-6 [&>h1]:mb-3
          [&>h2]:text-xl [&>h2]:font-bold [&>h2]:text-slate-800 [&>h2]:mt-5 [&>h2]:mb-2
          [&>h3]:text-lg [&>h3]:font-bold [&>h3]:text-emerald-700 [&>h3]:mt-4 [&>h3]:mb-2
          [&>p]:mb-4 [&>p]:text-slate-600
          [&>ol]:list-decimal [&>ol]:pl-6 [&>ol]:mb-4 [&>ol]:space-y-1.5
          [&>ul]:list-disc [&>ul]:pl-6 [&>ul]:mb-4 [&>ul]:space-y-1.5
          [&>li]:text-slate-600
          [&>strong]:font-bold [&>strong]:text-slate-900"
        dangerouslySetInnerHTML={{ __html: rulesHtml }}
      />

      {/* Decorative summary footer */}
      <div className="mt-10 p-5 rounded-2xl bg-amber-50/70 border border-amber-100 flex gap-4 items-start">
        <div className="p-2 bg-amber-100 rounded-xl text-amber-600 shrink-0 mt-0.5">
          <Trophy className="h-5 w-5" />
        </div>
        <div>
          <h4 className="font-bold text-amber-900 text-sm">Приятной игры!</h4>
          <p className="text-xs text-amber-700 leading-relaxed mt-1">
            Помните, что за каждым великим падением на бирже следует стремительный взлет! Рискуйте вовремя и не забывайте вовлекать друзей через Совместный Стол.
          </p>
        </div>
      </div>
    </div>
  );
}
