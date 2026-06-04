import React from 'react';
import { Database, Download, Check, FileSpreadsheet } from 'lucide-react';

export default function WordDownload() {
  const triggerDownload = () => {
    window.location.href = '/api/admin/export-excel';
  };

  return (
    <div className="max-w-xl mx-auto bg-white rounded-3xl border border-slate-100 p-8 shadow-3xs animate-fade-in text-center mt-6">
      <div className="mx-auto w-16 h-16 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center mb-6 border border-emerald-100/50">
        <FileSpreadsheet className="h-8 w-8" />
      </div>

      <h1 className="text-2xl font-black text-slate-800 tracking-tight mb-2">
        Скачать базу карточек в Excel
      </h1>
      <p className="text-sm text-slate-500 max-w-md mx-auto mb-8 leading-relaxed">
        Хотите просмотреть полный перечень заданий офлайн или сохранить резервную копию своего каталога? Скачайте готовый документ со всеми игровыми наборами, темами и карточками!
      </p>

      {/* Feature list */}
      <div className="text-left bg-slate-50/70 rounded-2xl p-5 border border-slate-100/70 max-w-sm mx-auto mb-8 space-y-3">
        <div className="flex items-start gap-2.5 text-xs text-slate-600">
          <Check className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
          <span>Экспорт всех созданных комплектов и тем</span>
        </div>
        <div className="flex items-start gap-2.5 text-xs text-slate-600">
          <Check className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
          <span>Формат Microsoft Excel (.xlsx) с автоподбором колонок</span>
        </div>
        <div className="flex items-start gap-2.5 text-xs text-slate-600">
          <Check className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
          <span>Удобное редактирование и последующий импорт в админке</span>
        </div>
        <div className="flex items-start gap-2.5 text-xs text-slate-600">
          <Check className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
          <span>Совместимо с Microsoft Excel, Google Таблицами и Pages</span>
        </div>
      </div>

      {/* Action CTA */}
      <button
        onClick={triggerDownload}
        className="inline-flex items-center justify-center gap-2 px-6 py-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-2xl shadow-md transition-all active:scale-95 cursor-pointer w-full max-w-xs"
      >
        <Download className="h-5 w-5" />
        <span>Скачать Microsoft Excel</span>
      </button>

      <div className="mt-6 flex items-center justify-center gap-1.5 text-xs text-slate-400">
        <Database size={14} />
        <span>Файл обновляется автоматически при любых изменениях в игре</span>
      </div>
    </div>
  );
}
