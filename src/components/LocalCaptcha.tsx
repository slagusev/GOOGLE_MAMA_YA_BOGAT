import React, { useState, useEffect, useRef } from 'react';
import { RefreshCw, ShieldAlert, Check } from 'lucide-react';

interface LocalCaptchaProps {
  onSuccess: () => void;
}

export default function LocalCaptcha({ onSuccess }: LocalCaptchaProps) {
  const [captchaText, setCaptchaText] = useState('');
  const [userInput, setUserInput] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const generateCaptcha = () => {
    const chars = '23456789ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz';
    let text = '';
    for (let i = 0; i < 5; i++) {
      text += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setCaptchaText(text);
    setUserInput('');
    setErrorMsg('');
  };

  useEffect(() => {
    generateCaptcha();
  }, []);

  useEffect(() => {
    if (!captchaText) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear and background
    ctx.fillStyle = '#f8fafc'; // slate-50
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Grid lines for distortion / robotic reading difficulty
    ctx.strokeStyle = '#e2e8f0'; // slate-200
    ctx.lineWidth = 1;
    for (let i = 10; i < canvas.width; i += 20) {
      ctx.beginPath();
      ctx.moveTo(i, 0);
      ctx.lineTo(i, canvas.height);
      ctx.stroke();
    }
    for (let j = 10; j < canvas.height; j += 15) {
      ctx.beginPath();
      ctx.moveTo(0, j);
      ctx.lineTo(canvas.width, j);
      ctx.stroke();
    }

    // Random noise lines
    for (let i = 0; i < 6; i++) {
      ctx.strokeStyle = `rgba(${Math.floor(Math.random() * 150)}, ${Math.floor(Math.random() * 150)}, ${Math.floor(Math.random() * 150)}, 0.35)`;
      ctx.lineWidth = 1.2 + Math.random() * 1.5;
      ctx.beginPath();
      ctx.moveTo(Math.random() * canvas.width, Math.random() * canvas.height);
      ctx.lineTo(Math.random() * canvas.width, Math.random() * canvas.height);
      ctx.stroke();
    }

    // Random noise dots
    for (let i = 0; i < 50; i++) {
      ctx.fillStyle = `rgba(${Math.floor(Math.random() * 180)}, ${Math.floor(Math.random() * 180)}, ${Math.floor(Math.random() * 180)}, 0.4)`;
      ctx.beginPath();
      ctx.arc(Math.random() * canvas.width, Math.random() * canvas.height, 1 + Math.random() * 1.5, 0, Math.PI * 2);
      ctx.fill();
    }

    // Text rendering setup
    ctx.font = 'bold 23px "JetBrains Mono", monospace, Courier';
    ctx.textBaseline = 'middle';

    for (let i = 0; i < captchaText.length; i++) {
      const char = captchaText[i];
      ctx.save();
      const x = 18 + i * 28 + Math.random() * 6;
      const y = canvas.height / 2 + (Math.random() * 8 - 4);
      ctx.translate(x, y);

      const angle = (Math.random() * 30 - 15) * Math.PI / 180;
      ctx.rotate(angle);

      ctx.fillStyle = `rgb(${Math.floor(Math.random() * 100)}, ${Math.floor(Math.random() * 80)}, ${Math.floor(Math.random() * 140)})`;
      ctx.fillText(char, 0, 0);
      ctx.restore();
    }
  }, [captchaText]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (userInput.trim().toLowerCase() === captchaText.toLowerCase()) {
      onSuccess();
    } else {
      setErrorMsg('Неверный код с картинки, попробуйте еще раз');
      generateCaptcha();
    }
  };

  return (
    <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 space-y-4 shadow-3xs">
      <div className="flex items-center gap-2 text-slate-700">
        <ShieldAlert className="h-4 w-4 text-purple-600 shrink-0" />
        <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Защита от перебора паролей</span>
      </div>

      <p className="text-[11px] text-slate-500 leading-normal">
        Превышен лимит попыток входа! Решите капчу, чтобы подтвердить, что вы человек, и получить <strong>+1 попытку ввода пароля</strong>.
      </p>

      <div className="flex items-center gap-3">
        <div className="relative rounded-xl overflow-hidden border border-slate-200 bg-white">
          <canvas
            ref={canvasRef}
            width={160}
            height={50}
            className="block"
          />
        </div>

        <button
          type="button"
          onClick={generateCaptcha}
          className="p-3 bg-white hover:bg-slate-100 border border-slate-200 rounded-xl text-slate-500 hover:text-slate-800 transition-colors shadow-3xs"
          title="Обновить код"
        >
          <RefreshCw className="h-4 w-4" />
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-3">
        <div>
          <input
            type="text"
            required
            value={userInput}
            onChange={(e) => {
              setUserInput(e.target.value);
              setErrorMsg('');
            }}
            placeholder="Введите символы с картинки"
            className="w-full px-4 py-2.5 bg-white border border-slate-200 hover:border-slate-300 rounded-xl outline-none focus:ring-4 focus:ring-purple-500/5 focus:border-purple-500 text-xs font-bold transition-all shadow-3xs placeholder:font-normal"
          />
        </div>

        {errorMsg && (
          <p className="text-[10px] font-bold text-rose-600 leading-normal pt-1">
            🛑 {errorMsg}
          </p>
        )}

        <button
          type="submit"
          className="w-full flex items-center justify-center gap-1.5 py-2 px-4 bg-slate-800 hover:bg-slate-900 text-white font-bold rounded-xl text-xs shadow-xs transition-colors cursor-pointer"
        >
          <Check size={14} />
          <span>Подтвердить код безопасности</span>
        </button>
      </form>
    </div>
  );
}
