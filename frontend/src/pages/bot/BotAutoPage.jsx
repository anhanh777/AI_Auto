import React, { useState, useEffect } from 'react';
import { useBusiness } from '../../contexts/BusinessContext.jsx';
import { useToast } from '../../contexts/ToastContext.jsx';
import { aiConfigService } from '../../services/aiConfig.service.js';
import {
  Bot,
  Sparkles,
  Save,
  RefreshCw,
  ShieldAlert,
  Clock,
  ShoppingCart,
  MessageSquare,
  Sliders,
  CheckCircle2
} from 'lucide-react';

const BotAutoPage = () => {
  const { activeBusiness } = useBusiness();
  const { showToast } = useToast();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [tagInput, setTagInput] = useState('');

  const [form, setForm] = useState({
    bot_name: 'AI Assistant',
    model_name: 'gemini-1.5-flash',
    ai_persona_tone: 'FRIENDLY',
    system_prompt: '',
    welcome_message: '',
    guardrail_blocklist: [],
    debounce_delay_seconds: 3,
    auto_order_extraction: true,
    is_active: true
  });

  const fetchConfig = async () => {
    if (!activeBusiness?._id) return;
    try {
      setLoading(true);
      const res = await aiConfigService.getAIConfig({ business_id: activeBusiness._id });
      if (res.success && res.data) {
        setForm({
          bot_name: res.data.bot_name || 'AI Assistant',
          model_name: res.data.model_name || 'gemini-1.5-flash',
          ai_persona_tone: res.data.ai_persona_tone || 'FRIENDLY',
          system_prompt: res.data.system_prompt || '',
          welcome_message: res.data.welcome_message || '',
          guardrail_blocklist: res.data.guardrail_blocklist || [],
          debounce_delay_seconds: res.data.debounce_delay_seconds || 3,
          auto_order_extraction: res.data.auto_order_extraction !== undefined ? res.data.auto_order_extraction : true,
          is_active: res.data.is_active !== undefined ? res.data.is_active : true
        });
      }
    } catch (err) {
      console.error('Lỗi khi tải cấu hình AI:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchConfig();
  }, [activeBusiness?._id]);

  const handleSave = async (e) => {
    e.preventDefault();
    if (!activeBusiness?._id) return;
    try {
      setSaving(true);
      const res = await aiConfigService.updateAIConfig({
        ...form,
        business_id: activeBusiness._id
      });
      if (res.success) {
        showToast('success', `Đã lưu cấu hình AI Bot cho ${activeBusiness.business_name}`);
      }
    } catch (err) {
      showToast('error', err.message || 'Lỗi khi lưu cấu hình');
    } finally {
      setSaving(false);
    }
  };

  const handleAddBlockWord = (e) => {
    if (e.key === 'Enter' && tagInput.trim()) {
      e.preventDefault();
      if (!form.guardrail_blocklist.includes(tagInput.trim())) {
        setForm({
          ...form,
          guardrail_blocklist: [...form.guardrail_blocklist, tagInput.trim()]
        });
      }
      setTagInput('');
    }
  };

  const handleRemoveBlockWord = (word) => {
    setForm({
      ...form,
      guardrail_blocklist: form.guardrail_blocklist.filter((w) => w !== word)
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-slate-400">
        <RefreshCw size={24} className="animate-spin text-blue-600 mr-2" />
        <span className="text-xs font-semibold">Đang tải cấu hình AI Bot...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fadeIn pb-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white flex items-center space-x-2">
              <Bot className="text-blue-600" />
              <span>Cấu hình Trợ Lý AI (Bot-Auto)</span>
            </h1>
            <span className="px-2.5 py-0.5 rounded-full bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 text-xs font-extrabold">
              {activeBusiness?.business_name}
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Thiết lập phong cách tư vấn, prompt chỉ thị, rào chắn từ khóa và tự động bóc tách đơn hàng cho cửa hàng này
          </p>
        </div>

        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="flex items-center space-x-1.5 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow transition cursor-pointer disabled:opacity-50 shrink-0"
        >
          {saving ? <RefreshCw size={15} className="animate-spin" /> : <Save size={15} />}
          <span>{saving ? 'Đang lưu...' : 'Lưu cấu hình AI'}</span>
        </button>
      </div>

      <form onSubmit={handleSave} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Cột trái: Cấu hình phong cách & Prompt */}
        <div className="lg:col-span-2 space-y-5">
          {/* Card 1: Nhân vật & Giọng điệu AI */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-5 shadow-sm space-y-4">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center space-x-2">
              <Sparkles size={16} className="text-amber-500" />
              <span>Định danh & Giọng điệu tư vấn</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Tên hiển thị của Bot AI
                </label>
                <input
                  type="text"
                  value={form.bot_name}
                  onChange={(e) => setForm({ ...form, bot_name: e.target.value })}
                  className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs text-slate-800 dark:text-white focus:ring-2 focus:ring-blue-600 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Phong cách / Giọng điệu (Persona)
                </label>
                <select
                  value={form.ai_persona_tone}
                  onChange={(e) => setForm({ ...form, ai_persona_tone: e.target.value })}
                  className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs text-slate-800 dark:text-white focus:ring-2 focus:ring-blue-600 focus:outline-none"
                >
                  <option value="FRIENDLY">😊 Thân thiện, gần gũi (Dạ shop xin chào bạn...)</option>
                  <option value="PROFESSIONAL">👔 Chuyên nghiệp, lịch sự (Kính chào quý khách...)</option>
                  <option value="POLITE">🌸 Dịu dàng, chăm sóc (Cảm ơn bạn đã tin tưởng...)</option>
                  <option value="GENZ">🔥 Trẻ trung, bắt trend (Helu bạn iu nha...)</option>
                  <option value="ENTHUSIASTIC">⚡ Năng động, chốt deal nhanh (Shop đang có deal sốc...)</option>
                </select>
              </div>
            </div>

            {/* Lời chào mở đầu */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Lời chào tự động khi khách mở chat
              </label>
              <textarea
                rows={2}
                value={form.welcome_message}
                onChange={(e) => setForm({ ...form, welcome_message: e.target.value })}
                className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs text-slate-800 dark:text-white focus:ring-2 focus:ring-blue-600 focus:outline-none"
              />
            </div>
          </div>

          {/* Card 2: System Prompt cốt lõi */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center space-x-2">
                <Sliders size={16} className="text-blue-600" />
                <span>Prompt Chỉ Thị Gốc (System Instruction)</span>
              </h3>
              <span className="text-[11px] text-slate-400">Nạp vào Google Gemini AI</span>
            </div>

            <textarea
              rows={8}
              value={form.system_prompt}
              onChange={(e) => setForm({ ...form, system_prompt: e.target.value })}
              placeholder="Nhập các nguyên tắc tư vấn, quy định báo giá, cách chốt sale và xử lý phản hồi của khách hàng..."
              className="w-full p-3.5 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs text-slate-800 dark:text-white font-mono leading-relaxed focus:ring-2 focus:ring-blue-600 focus:outline-none"
            />
          </div>

          {/* Card 3: Rào chắn an toàn AI (Guardrails) */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-5 shadow-sm space-y-4">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center space-x-2">
              <ShieldAlert size={16} className="text-rose-500" />
              <span>Danh sách từ khóa cấm & Rào chắn (Guardrails)</span>
            </h3>
            <p className="text-xs text-slate-400">
              Khi khách hàng nhắc đến các từ khóa này, AI sẽ tạm dừng và chuyển quyền cho nhân viên trực tiếp tiếp quản
            </p>

            <div className="flex flex-wrap gap-2 p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl min-h-[50px] items-center">
              {form.guardrail_blocklist.map((word, idx) => (
                <span
                  key={idx}
                  className="px-2.5 py-1 bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border border-rose-300 dark:border-rose-800 rounded-lg text-xs font-semibold flex items-center space-x-1.5"
                >
                  <span>{word}</span>
                  <button
                    type="button"
                    onClick={() => handleRemoveBlockWord(word)}
                    className="hover:text-rose-900 font-bold ml-1"
                  >
                    ×
                  </button>
                </span>
              ))}
              <input
                type="text"
                placeholder="+ Thêm từ khóa (ấn Enter)..."
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={handleAddBlockWord}
                className="bg-transparent text-xs text-slate-800 dark:text-white focus:outline-none flex-1 min-w-[150px]"
              />
            </div>
          </div>
        </div>

        {/* Cột phải: Các công tắc bật tắt tự động hóa */}
        <div className="space-y-5">
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-5 shadow-sm space-y-5">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center space-x-2">
              <Bot size={16} className="text-emerald-500" />
              <span>Trạng thái Tự Động Hóa</span>
            </h3>

            {/* Bật/Tắt Bot toàn cửa hàng */}
            <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-900 rounded-xl">
              <div>
                <p className="text-xs font-bold text-slate-900 dark:text-white">Kích hoạt Trợ lý AI</p>
                <p className="text-[11px] text-slate-400">Tự động trả lời tin nhắn mới</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.is_active}
                  onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-slate-600 peer-checked:bg-blue-600"></div>
              </label>
            </div>

            {/* Tự động bóc tách đơn hàng */}
            <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-900 rounded-xl">
              <div>
                <p className="text-xs font-bold text-slate-900 dark:text-white">Tự động chốt đơn</p>
                <p className="text-[11px] text-slate-400">Bóc tách Tên, SĐT, Địa chỉ tạo đơn</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.auto_order_extraction}
                  onChange={(e) => setForm({ ...form, auto_order_extraction: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-slate-600 peer-checked:bg-blue-600"></div>
              </label>
            </div>

            {/* Thời gian trễ gõ phím giả lập */}
            <div className="p-3 bg-slate-50 dark:bg-slate-900 rounded-xl space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-xs font-bold text-slate-900 dark:text-white flex items-center space-x-1.5">
                  <Clock size={14} className="text-slate-400" />
                  <span>Độ trễ phản hồi tự nhiên</span>
                </p>
                <span className="text-xs font-bold text-blue-600">{form.debounce_delay_seconds} giây</span>
              </div>
              <input
                type="range"
                min="1"
                max="10"
                value={form.debounce_delay_seconds}
                onChange={(e) => setForm({ ...form, debounce_delay_seconds: Number(e.target.value) })}
                className="w-full accent-blue-600 cursor-pointer"
              />
              <p className="text-[10px] text-slate-400">
                Gom nhiều tin nhắn liên tiếp của khách trước khi AI xử lý câu trả lời
              </p>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
};

export default BotAutoPage;
