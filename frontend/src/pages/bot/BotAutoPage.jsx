import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useBusiness } from '../../contexts/BusinessContext.jsx';
import { useToast } from '../../contexts/ToastContext.jsx';
import { aiConfigService } from '../../services/aiConfig.service.js';
import { botScenarioService } from '../../services/botScenario.service.js';
import { uploadService } from '../../services/upload.service.js';
import {
  Bot,
  Sparkles,
  Save,
  RefreshCw,
  ShieldAlert,
  Clock,
  MessageSquare,
  Sliders,
  Plus,
  Trash2,
  Edit3,
  CheckCircle2,
  AlertTriangle,
  Play,
  X,
  Tag,
  Search,
  Check,
  Send,
  HelpCircle,
  Layers,
  ArrowRight,
  Image as ImageIcon,
  Upload,
  Paperclip
} from 'lucide-react';

const BotAutoPage = () => {
  const { activeBusiness } = useBusiness();
  const { showToast } = useToast();

  // Tab điều hướng: 'scenarios' | 'ai_config' | 'simulator'
  const [activeTab, setActiveTab] = useState('scenarios');

  // Loading states
  const [loadingConfig, setLoadingConfig] = useState(true);
  const [savingConfig, setSavingConfig] = useState(false);
  const [loadingScenarios, setLoadingScenarios] = useState(true);

  // 1. STATE CẤU HÌNH AI CỐT LÕI
  const [configForm, setConfigForm] = useState({
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
  const [guardrailInput, setGuardrailInput] = useState('');

  // 2. STATE KỊCH BẢN DO CHỦ SHOP TỰ TẠO
  const [scenarios, setScenarios] = useState([]);
  const [scenarioSearch, setScenarioSearch] = useState('');
  const [scenarioFilterType, setScenarioFilterType] = useState('');
  const [isScenarioModalOpen, setIsScenarioModalOpen] = useState(false);
  const [editingScenario, setEditingScenario] = useState(null);
  const [scenarioSubmitting, setScenarioSubmitting] = useState(false);

  // Form kịch bản mới/sửa
  const [scenarioForm, setScenarioForm] = useState({
    scenario_name: '',
    trigger_type: 'KEYWORD_CONTAINS',
    keywords: [],
    action_type: 'REPLY_TEXT',
    response_content: '',
    image_url: '',
    tag_to_add: '',
    priority: 0,
    is_active: true
  });
  const [keywordInput, setKeywordInput] = useState('');
  const [uploadingImage, setUploadingImage] = useState(false);
  const fileInputRef = useRef(null);

  // Xử lý chọn và upload ảnh từ máy tính cho kịch bản
  const handleImageFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      showToast('error', 'Vui lòng chọn file định dạng hình ảnh (JPG, PNG, WEBP, GIF)');
      return;
    }

    try {
      setUploadingImage(true);
      const res = await uploadService.uploadSingle(file, 'bot');
      const uploadedPath = res?.data?.path || res?.data?.url || res?.path || res?.url;
      if (uploadedPath) {
        setScenarioForm((prev) => ({ ...prev, image_url: uploadedPath }));
        showToast('success', 'Đã tải ảnh đính kèm thành công');
      }
    } catch (err) {
      showToast('error', err.message || 'Lỗi khi tải ảnh lên');
    } finally {
      setUploadingImage(false);
      if (e.target) e.target.value = '';
    }
  };

  // 3. STATE THỬ NGHIỆM SANDBOX / SIMULATOR
  const [simMessage, setSimMessage] = useState('');
  const [simLoading, setSimLoading] = useState(false);
  const [simResult, setSimResult] = useState(null);

  // Load Cấu hình AI
  const fetchAIConfig = useCallback(async () => {
    if (!activeBusiness?._id) return;
    try {
      setLoadingConfig(true);
      const res = await aiConfigService.getAIConfig({ business_id: activeBusiness._id });
      if (res.success && res.data) {
        setConfigForm({
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
      setLoadingConfig(false);
    }
  }, [activeBusiness?._id]);

  // Load Danh sách Kịch bản
  const fetchScenarios = useCallback(async () => {
    if (!activeBusiness?._id) return;
    try {
      setLoadingScenarios(true);
      const res = await botScenarioService.getScenarios({
        business_id: activeBusiness._id,
        search: scenarioSearch.trim() || undefined,
        trigger_type: scenarioFilterType || undefined
      });
      const list = res?.data || (Array.isArray(res) ? res : []);
      if (Array.isArray(list)) {
        setScenarios(list);
      }
    } catch (err) {
      console.error('Lỗi khi tải danh sách kịch bản:', err);
    } finally {
      setLoadingScenarios(false);
    }
  }, [activeBusiness?._id, scenarioSearch, scenarioFilterType]);

  useEffect(() => {
    fetchAIConfig();
  }, [fetchAIConfig]);

  useEffect(() => {
    fetchScenarios();
  }, [fetchScenarios]);

  // Lưu cấu hình AI
  const handleSaveAIConfig = async (e) => {
    e.preventDefault();
    if (!activeBusiness?._id) return;
    try {
      setSavingConfig(true);
      const res = await aiConfigService.updateAIConfig({
        ...configForm,
        business_id: activeBusiness._id
      });
      if (res.success) {
        showToast('success', `Đã lưu cấu hình AI Bot cho ${activeBusiness.business_name}`);
      }
    } catch (err) {
      showToast('error', err.message || 'Lỗi khi lưu cấu hình');
    } finally {
      setSavingConfig(false);
    }
  };

  // Thêm / Xóa từ khóa cấm Guardrail
  const handleAddGuardrail = (e) => {
    if (e.key === 'Enter' && guardrailInput.trim()) {
      e.preventDefault();
      const val = guardrailInput.trim();
      if (!configForm.guardrail_blocklist.includes(val)) {
        setConfigForm({
          ...configForm,
          guardrail_blocklist: [...configForm.guardrail_blocklist, val]
        });
      }
      setGuardrailInput('');
    }
  };

  const handleRemoveGuardrail = (word) => {
    setConfigForm({
      ...configForm,
      guardrail_blocklist: configForm.guardrail_blocklist.filter((w) => w !== word)
    });
  };

  // Bật/tắt nhanh kịch bản
  const handleToggleScenario = async (id) => {
    if (!activeBusiness?._id) return;
    try {
      const res = await botScenarioService.toggleScenario(id, activeBusiness._id);
      if (res.success || res.data) {
        showToast('success', res.message || 'Cập nhật trạng thái kịch bản thành công');
        fetchScenarios();
      }
    } catch (err) {
      showToast('error', err.message || 'Lỗi khi bật/tắt kịch bản');
    }
  };

  // Xóa kịch bản
  const handleDeleteScenario = async (id, name) => {
    if (!window.confirm(`Bạn có chắc muốn xóa kịch bản "${name}"?`)) return;
    try {
      const res = await botScenarioService.deleteScenario(id, activeBusiness._id);
      if (res.success || res.message) {
        showToast('success', 'Đã xóa kịch bản');
        fetchScenarios();
      }
    } catch (err) {
      showToast('error', err.message || 'Lỗi khi xóa kịch bản');
    }
  };

  // Mở modal tạo / sửa kịch bản
  const handleOpenScenarioModal = (item = null) => {
    if (item) {
      setEditingScenario(item);
      setScenarioForm({
        scenario_name: item.scenario_name || '',
        trigger_type: item.trigger_type || 'KEYWORD_CONTAINS',
        keywords: item.keywords || [],
        action_type: item.action_type || 'REPLY_TEXT',
        response_content: item.response_content || '',
        image_url: item.image_url || '',
        tag_to_add: item.tag_to_add || '',
        priority: item.priority || 0,
        is_active: item.is_active !== undefined ? item.is_active : true
      });
    } else {
      setEditingScenario(null);
      setScenarioForm({
        scenario_name: '',
        trigger_type: 'KEYWORD_CONTAINS',
        keywords: [],
        action_type: 'REPLY_TEXT',
        response_content: '',
        image_url: '',
        tag_to_add: '',
        priority: 0,
        is_active: true
      });
    }
    setKeywordInput('');
    setIsScenarioModalOpen(true);
  };

  // Thêm từ khóa vào form kịch bản
  const handleAddKeywordToForm = (e) => {
    if (e.key === 'Enter' && keywordInput.trim()) {
      e.preventDefault();
      const val = keywordInput.trim();
      if (!scenarioForm.keywords.includes(val)) {
        setScenarioForm({
          ...scenarioForm,
          keywords: [...scenarioForm.keywords, val]
        });
      }
      setKeywordInput('');
    }
  };

  const handleRemoveKeywordFromForm = (kw) => {
    setScenarioForm({
      ...scenarioForm,
      keywords: scenarioForm.keywords.filter((k) => k !== kw)
    });
  };

  // Submit form Kịch bản (Thêm hoặc Sửa)
  const handleScenarioSubmit = async (e) => {
    e.preventDefault();
    if (!activeBusiness?._id) return;
    if (!scenarioForm.scenario_name.trim()) {
      showToast('error', 'Vui lòng nhập tên kịch bản');
      return;
    }

    if (scenarioForm.trigger_type !== 'FIRST_MESSAGE' && scenarioForm.keywords.length === 0) {
      showToast('error', 'Vui lòng thêm ít nhất 1 từ khóa kích hoạt kịch bản');
      return;
    }

    if (scenarioForm.action_type === 'REPLY_TEXT' && !scenarioForm.response_content.trim()) {
      showToast('error', 'Vui lòng nhập nội dung câu trả lời tự động');
      return;
    }

    try {
      setScenarioSubmitting(true);
      if (editingScenario) {
        const res = await botScenarioService.updateScenario(editingScenario._id, {
          ...scenarioForm,
          business_id: activeBusiness._id
        });
        if (res.success || res.data) {
          showToast('success', `Đã cập nhật kịch bản "${scenarioForm.scenario_name}"`);
          setIsScenarioModalOpen(false);
          fetchScenarios();
        }
      } else {
        const res = await botScenarioService.createScenario({
          ...scenarioForm,
          business_id: activeBusiness._id
        });
        if (res.success || res.data) {
          showToast('success', `Đã tạo kịch bản mới "${scenarioForm.scenario_name}"`);
          setIsScenarioModalOpen(false);
          fetchScenarios();
        }
      }
    } catch (err) {
      showToast('error', err.message || 'Lỗi khi lưu kịch bản');
    } finally {
      setScenarioSubmitting(false);
    }
  };

  // Thử nghiệm kịch bản trong Sandbox
  const handleTestMatch = async (e) => {
    e.preventDefault();
    if (!simMessage.trim() || !activeBusiness?._id) return;
    try {
      setSimLoading(true);
      const res = await botScenarioService.testMatchScenario({
        business_id: activeBusiness._id,
        message_text: simMessage.trim()
      });
      const data = res?.data || res;
      setSimResult(data);
    } catch (err) {
      showToast('error', err.message || 'Lỗi khi thử nghiệm kịch bản');
    } finally {
      setSimLoading(false);
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn pb-16">
      {/* 1. Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2.5">
            <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-md shadow-blue-500/20">
              <Bot size={20} />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white flex items-center space-x-2">
                <span>Cấu hình Bot & AI Tự Động</span>
                <span className="px-2.5 py-0.5 rounded-full bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 text-xs font-black">
                  {activeBusiness?.business_name}
                </span>
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Thiết lập kịch bản phản hồi theo tin nhắn do chủ shop tự cấu hình kết hợp Trợ lý AI Gemini
              </p>
            </div>
          </div>
        </div>

        {/* Nút hành động theo từng Tab */}
        <div className="flex items-center space-x-2 shrink-0">
          {activeTab === 'scenarios' && (
            <button
              type="button"
              onClick={() => handleOpenScenarioModal()}
              className="flex items-center space-x-1.5 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white rounded-xl text-xs font-bold shadow-md shadow-blue-600/25 transition cursor-pointer"
            >
              <Plus size={15} />
              <span>Thêm kịch bản mới</span>
            </button>
          )}

          {activeTab === 'ai_config' && (
            <button
              type="button"
              onClick={handleSaveAIConfig}
              disabled={savingConfig}
              className="flex items-center space-x-1.5 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white rounded-xl text-xs font-bold shadow-md shadow-blue-600/25 transition cursor-pointer disabled:opacity-50"
            >
              {savingConfig ? <RefreshCw size={14} className="animate-spin" /> : <Save size={14} />}
              <span>{savingConfig ? 'Đang lưu...' : 'Lưu cấu hình AI'}</span>
            </button>
          )}
        </div>
      </div>

      {/* 2. TAB NAVIGATION */}
      <div className="flex items-center space-x-2 border-b border-slate-200 dark:border-slate-700 pb-2">
        <button
          type="button"
          onClick={() => setActiveTab('scenarios')}
          className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl text-xs font-bold transition cursor-pointer ${
            activeTab === 'scenarios'
              ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/20'
              : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
          }`}
        >
          <Layers size={14} />
          <span>Kịch bản tự động theo tin nhắn ({scenarios.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('ai_config')}
          className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl text-xs font-bold transition cursor-pointer ${
            activeTab === 'ai_config'
              ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/20'
              : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
          }`}
        >
          <Sparkles size={14} />
          <span>Trợ lý AI & Prompt (Gemini)</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('simulator')}
          className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl text-xs font-bold transition cursor-pointer ${
            activeTab === 'simulator'
              ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/20'
              : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
          }`}
        >
          <Play size={14} />
          <span>Thử nghiệm Kịch bản (Simulator)</span>
        </button>
      </div>

      {/* 3. NỘI DUNG TAB 1: QUẢN LÝ KỊCH BẢN TỰ ĐỘNG THEO TIN NHẮN */}
      {activeTab === 'scenarios' && (
        <div className="space-y-4">
          {/* Thanh tìm kiếm & Lọc kịch bản */}
          <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="relative flex-1 sm:max-w-md">
              <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Tìm kịch bản theo tên, từ khóa hoặc câu trả lời..."
                value={scenarioSearch}
                onChange={(e) => setScenarioSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-800 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600"
              />
            </div>

            <div className="flex items-center space-x-2">
              <span className="text-xs text-slate-400 font-medium shrink-0">Loại kích hoạt:</span>
              <select
                value={scenarioFilterType}
                onChange={(e) => setScenarioFilterType(e.target.value)}
                className="px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-600 cursor-pointer"
              >
                <option value="">Tất cả loại kích hoạt</option>
                <option value="KEYWORD_CONTAINS">Chứa từ khóa</option>
                <option value="KEYWORD_EXACT">Khớp chính xác</option>
                <option value="FIRST_MESSAGE">Tin nhắn đầu tiên</option>
                <option value="HANDOVER_KEYWORD">Yêu cầu gặp nhân viên</option>
              </select>
            </div>
          </div>

          {/* Bảng danh sách kịch bản do chủ shop tự tạo */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
            {loadingScenarios ? (
              <div className="p-16 text-center text-slate-400 text-xs flex flex-col items-center justify-center space-y-2">
                <RefreshCw size={24} className="animate-spin text-blue-600" />
                <span className="font-bold">Đang tải danh sách kịch bản...</span>
              </div>
            ) : scenarios.length === 0 ? (
              <div className="p-16 text-center text-slate-400 space-y-3">
                <div className="w-14 h-14 mx-auto rounded-2xl bg-blue-50 dark:bg-blue-950/60 flex items-center justify-center text-blue-600 dark:text-blue-400">
                  <Layers size={28} />
                </div>
                <div>
                  <p className="font-bold text-slate-700 dark:text-slate-200 text-sm">
                    Chưa có kịch bản nào được thiết lập
                  </p>
                  <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
                    Chủ shop có thể tự tạo các kịch bản trả lời tự động cho các câu hỏi phổ biến như: Địa chỉ shop, Chính sách đổi trả, Bảng size, Mã giảm giá...
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => handleOpenScenarioModal()}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition shadow-md shadow-blue-600/20 inline-flex items-center space-x-1.5 cursor-pointer"
                >
                  <Plus size={14} />
                  <span>Tạo kịch bản đầu tiên ngay</span>
                </button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50/80 dark:bg-slate-900/60 text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-700">
                      <th className="py-3 px-4 font-bold">Tên kịch bản</th>
                      <th className="py-3 px-4 font-bold">Loại kích hoạt</th>
                      <th className="py-3 px-4 font-bold">Từ khóa nhận diện</th>
                      <th className="py-3 px-4 font-bold">Nội dung phản hồi</th>
                      <th className="py-3 px-4 font-bold text-center">Hành động</th>
                      <th className="py-3 px-4 font-bold text-center">Bật / Tắt</th>
                      <th className="py-3 px-4 font-bold text-center">Thao tác</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60">
                    {scenarios.map((sc) => (
                      <tr key={sc._id} className="hover:bg-slate-50/80 dark:hover:bg-slate-700/30 transition">
                        {/* Tên kịch bản */}
                        <td className="py-3.5 px-4 font-bold text-slate-900 dark:text-white">
                          <p>{sc.scenario_name}</p>
                          {sc.tag_to_add && (
                            <span className="inline-flex items-center space-x-1 text-[10px] text-blue-600 font-medium mt-0.5">
                              <Tag size={10} />
                              <span>Gắn tag: {sc.tag_to_add}</span>
                            </span>
                          )}
                        </td>

                        {/* Loại kích hoạt */}
                        <td className="py-3.5 px-4">
                          {sc.trigger_type === 'FIRST_MESSAGE' && (
                            <span className="px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 font-bold text-[10px] border border-emerald-500/20">
                              Tin nhắn đầu tiên
                            </span>
                          )}
                          {sc.trigger_type === 'KEYWORD_CONTAINS' && (
                            <span className="px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 font-bold text-[10px] border border-blue-500/20">
                              Chứa từ khóa
                            </span>
                          )}
                          {sc.trigger_type === 'KEYWORD_EXACT' && (
                            <span className="px-2 py-0.5 rounded-full bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 font-bold text-[10px] border border-purple-500/20">
                              Khớp chính xác
                            </span>
                          )}
                          {sc.trigger_type === 'HANDOVER_KEYWORD' && (
                            <span className="px-2 py-0.5 rounded-full bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 font-bold text-[10px] border border-rose-500/20">
                              Gặp nhân viên
                            </span>
                          )}
                        </td>

                        {/* Từ khóa */}
                        <td className="py-3.5 px-4">
                          <div className="flex flex-wrap gap-1 max-w-[220px]">
                            {sc.trigger_type === 'FIRST_MESSAGE' ? (
                              <span className="text-slate-400 italic text-[11px]">Kích hoạt khi khách mới mở chat</span>
                            ) : sc.keywords && sc.keywords.length > 0 ? (
                              sc.keywords.map((kw, i) => (
                                <span
                                  key={i}
                                  className="px-2 py-0.5 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-md font-mono text-[10px]"
                                >
                                  {kw}
                                </span>
                              ))
                            ) : (
                              <span className="text-slate-400 italic text-[11px]">Chưa cài từ khóa</span>
                            )}
                          </div>
                        </td>

                        {/* Câu trả lời */}
                        <td className="py-3.5 px-4 max-w-[280px]">
                          <div className="flex items-center space-x-2">
                            {sc.image_url && (
                              <div className="w-8 h-8 rounded-lg overflow-hidden border border-slate-200 dark:border-slate-700 shrink-0 bg-slate-100 dark:bg-slate-800">
                                <img
                                  src={sc.image_url}
                                  alt="attachment"
                                  className="w-full h-full object-cover"
                                  onError={(e) => { e.target.style.display = 'none'; }}
                                />
                              </div>
                            )}
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-slate-700 dark:text-slate-300 text-[11px]" title={sc.response_content}>
                                {sc.response_content || (sc.image_url ? '[Chỉ gửi ảnh đính kèm]' : '—')}
                              </p>
                              {sc.image_url && (
                                <span className="text-[10px] text-blue-600 dark:text-blue-400 font-medium flex items-center space-x-1 mt-0.5">
                                  <ImageIcon size={10} />
                                  <span>Có đính kèm ảnh</span>
                                </span>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* Hành động */}
                        <td className="py-3.5 px-4 text-center">
                          {sc.action_type === 'HANDOVER_STAFF' ? (
                            <span className="px-2 py-0.5 bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300 rounded-full font-bold text-[10px]">
                              Bàn giao nhân viên
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-full font-bold text-[10px]">
                              Gửi tin nhắn trả lời
                            </span>
                          )}
                        </td>

                        {/* Công tắc Bật / Tắt */}
                        <td className="py-3.5 px-4 text-center">
                          <label className="relative inline-flex items-center cursor-pointer">
                            <input
                              type="checkbox"
                              checked={sc.is_active}
                              onChange={() => handleToggleScenario(sc._id)}
                              className="sr-only peer"
                            />
                            <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all dark:border-slate-600 peer-checked:bg-blue-600"></div>
                          </label>
                        </td>

                        {/* Thao tác Sửa / Xóa */}
                        <td className="py-3.5 px-4 text-center">
                          <div className="flex items-center justify-center space-x-1">
                            <button
                              type="button"
                              onClick={() => handleOpenScenarioModal(sc)}
                              className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-slate-700 rounded-lg transition cursor-pointer"
                              title="Chỉnh sửa kịch bản"
                            >
                              <Edit3 size={14} />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteScenario(sc._id, sc.scenario_name)}
                              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-slate-700 rounded-lg transition cursor-pointer"
                              title="Xóa kịch bản"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 4. NỘI DUNG TAB 2: CẤU HÌNH TRỢ LÝ AI & PROMPT GEMINI */}
      {activeTab === 'ai_config' && (
        <form onSubmit={handleSaveAIConfig} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Cột trái: Persona & System Prompt */}
          <div className="lg:col-span-2 space-y-5">
            {/* Card: Persona & Định danh */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-5 shadow-sm space-y-4">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center space-x-2">
                <Sparkles size={16} className="text-amber-500" />
                <span>Định danh & Giọng điệu tư vấn (Persona)</span>
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Tên hiển thị của Bot AI
                  </label>
                  <input
                    type="text"
                    value={configForm.bot_name}
                    onChange={(e) => setConfigForm({ ...configForm, bot_name: e.target.value })}
                    className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs text-slate-800 dark:text-white focus:ring-2 focus:ring-blue-600 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Phong cách / Giọng điệu (Tone)
                  </label>
                  <select
                    value={configForm.ai_persona_tone}
                    onChange={(e) => setConfigForm({ ...configForm, ai_persona_tone: e.target.value })}
                    className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs text-slate-800 dark:text-white focus:ring-2 focus:ring-blue-600 focus:outline-none"
                  >
                    <option value="FRIENDLY">😊 Thân thiện, gần gũi (Dạ shop xin chào bạn...)</option>
                    <option value="PROFESSIONAL">👔 Chuyên nghiệp, chuẩn mực (Kính chào quý khách...)</option>
                    <option value="POLITE">🌸 Lịch sự, nhã nhặn (Cảm ơn bạn đã ghé thăm...)</option>
                    <option value="GENZ">🔥 Trẻ trung, năng động (Helu bạn iu nha...)</option>
                    <option value="ENTHUSIASTIC">⚡ Nhiệt huyết, chốt sale nhanh</option>
                  </select>
                </div>
              </div>

              {/* Lời chào mặc định khi mở chat */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Lời chào tự động khi khách mới mở hộp thoại chat:
                </label>
                <textarea
                  rows={2}
                  value={configForm.welcome_message}
                  onChange={(e) => setConfigForm({ ...configForm, welcome_message: e.target.value })}
                  className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs text-slate-800 dark:text-white focus:ring-2 focus:ring-blue-600 focus:outline-none"
                />
              </div>
            </div>

            {/* Card: System Prompt */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-5 shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center space-x-2">
                  <Sliders size={16} className="text-blue-600" />
                  <span>Prompt Chỉ Thị Gốc (System Instruction)</span>
                </h3>
                <span className="text-[11px] text-slate-400 font-mono">Google Gemini 1.5 Flash</span>
              </div>
              <p className="text-xs text-slate-400">
                Chỉ dẫn hành vi, nguyên tắc tư vấn giá, quy định bảo mật và cách thuyết phục khách hàng cho AI
              </p>
              <textarea
                rows={7}
                value={configForm.system_prompt}
                onChange={(e) => setConfigForm({ ...configForm, system_prompt: e.target.value })}
                placeholder="Ví dụ: Bạn là chuyên viên tư vấn bán hàng của shop thời trang Gentleverse. Hãy nhiệt tình, giải đáp kích cỡ và chốt đơn lịch sự..."
                className="w-full p-3.5 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs text-slate-800 dark:text-white font-mono leading-relaxed focus:ring-2 focus:ring-blue-600 focus:outline-none"
              />
            </div>

            {/* Card: Rào chắn từ khóa (Guardrails) */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-5 shadow-sm space-y-3">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center space-x-2">
                <ShieldAlert size={16} className="text-rose-500" />
                <span>Từ khóa cấm & Rào chắn an toàn (Guardrails)</span>
              </h3>
              <p className="text-xs text-slate-400">
                Nếu khách nhắc các từ khóa này, AI sẽ tạm dừng ngay và bàn giao cho nhân viên trực chat tiếp quản
              </p>

              <div className="flex flex-wrap gap-2 p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl min-h-[50px] items-center">
                {configForm.guardrail_blocklist.map((word, idx) => (
                  <span
                    key={idx}
                    className="px-2.5 py-1 bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border border-rose-300 dark:border-rose-800 rounded-lg text-xs font-semibold flex items-center space-x-1.5"
                  >
                    <span>{word}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveGuardrail(word)}
                      className="hover:text-rose-900 font-bold ml-1 cursor-pointer"
                    >
                      ×
                    </button>
                  </span>
                ))}
                <input
                  type="text"
                  placeholder="+ Thêm từ khóa (ấn Enter)..."
                  value={guardrailInput}
                  onChange={(e) => setGuardrailInput(e.target.value)}
                  onKeyDown={handleAddGuardrail}
                  className="bg-transparent text-xs text-slate-800 dark:text-white focus:outline-none flex-1 min-w-[150px]"
                />
              </div>
            </div>
          </div>

          {/* Cột phải: Các công tắc */}
          <div className="space-y-5">
            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-5 shadow-sm space-y-4">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center space-x-2">
                <Bot size={16} className="text-emerald-500" />
                <span>Trạng thái Tự Động Hóa</span>
              </h3>

              {/* Bật/Tắt Bot AI toàn shop */}
              <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-900 rounded-xl">
                <div>
                  <p className="text-xs font-bold text-slate-900 dark:text-white">Kích hoạt Trợ lý AI</p>
                  <p className="text-[11px] text-slate-400">Tự động trả lời khi không khớp kịch bản</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={configForm.is_active}
                    onChange={(e) => setConfigForm({ ...configForm, is_active: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-slate-600 peer-checked:bg-blue-600"></div>
                </label>
              </div>

              {/* Tự động bóc tách đơn hàng */}
              <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-900 rounded-xl">
                <div>
                  <p className="text-xs font-bold text-slate-900 dark:text-white">Tự động chốt đơn</p>
                  <p className="text-[11px] text-slate-400">Bóc tách Tên, SĐT, Địa chỉ tạo đơn Chờ duyệt</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={configForm.auto_order_extraction}
                    onChange={(e) => setConfigForm({ ...configForm, auto_order_extraction: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-slate-600 peer-checked:bg-blue-600"></div>
                </label>
              </div>

              {/* Độ trễ gõ phím giả lập */}
              <div className="p-3 bg-slate-50 dark:bg-slate-900 rounded-xl space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-bold text-slate-900 dark:text-white flex items-center space-x-1.5">
                    <Clock size={14} className="text-slate-400" />
                    <span>Độ trễ phản hồi tự nhiên</span>
                  </p>
                  <span className="text-xs font-bold text-blue-600">{configForm.debounce_delay_seconds} giây</span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="10"
                  value={configForm.debounce_delay_seconds}
                  onChange={(e) => setConfigForm({ ...configForm, debounce_delay_seconds: Number(e.target.value) })}
                  className="w-full accent-blue-600 cursor-pointer"
                />
                <p className="text-[10px] text-slate-400">
                  Gom các câu nhắn vụn vặt liên tiếp của khách thành 1 ngữ cảnh hoàn chỉnh trước khi AI phản hồi
                </p>
              </div>
            </div>
          </div>
        </form>
      )}

      {/* 5. NỘI DUNG TAB 3: GIẢ LẬP THỬ NGHIỆM (SIMULATOR / SANDBOX) */}
      {activeTab === 'simulator' && (
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6 shadow-sm max-w-2xl mx-auto space-y-5">
          <div>
            <h3 className="font-bold text-slate-900 dark:text-white text-base flex items-center space-x-2">
              <Play size={18} className="text-blue-600" />
              <span>Hộp Thử Nghiệm Kịch Bản (Sandbox Simulator)</span>
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              Gõ thử một câu tin nhắn của khách hàng để kiểm tra xem hệ thống sẽ khớp kịch bản nào do bạn tạo ra hay chuyển sang AI Gemini.
            </p>
          </div>

          <form onSubmit={handleTestMatch} className="flex items-center space-x-2">
            <input
              type="text"
              placeholder="Ví dụ: 'Shop ở đâu vậy', 'có freeship không', 'cho gặp nhân viên'..."
              value={simMessage}
              onChange={(e) => setSimMessage(e.target.value)}
              className="flex-1 px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-600"
            />
            <button
              type="submit"
              disabled={simLoading || !simMessage.trim()}
              className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition flex items-center space-x-1.5 cursor-pointer disabled:opacity-50 shrink-0"
            >
              {simLoading ? <RefreshCw size={13} className="animate-spin" /> : <Send size={13} />}
              <span>Kiểm tra</span>
            </button>
          </form>

          {/* Kết quả thử nghiệm */}
          {simResult && (
            <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/60 space-y-3 animate-scaleIn">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  Kết quả phân tích tin nhắn:
                </span>
                {simResult.is_matched ? (
                  <span className="px-2.5 py-1 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 rounded-full font-bold text-[11px] flex items-center space-x-1">
                    <CheckCircle2 size={12} />
                    <span>Đã khớp Kịch bản của Chủ shop</span>
                  </span>
                ) : (
                  <span className="px-2.5 py-1 bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 rounded-full font-bold text-[11px] flex items-center space-x-1">
                    <Sparkles size={12} />
                    <span>Chuyển tiếp cho AI Gemini suy luận</span>
                  </span>
                )}
              </div>

              {simResult.is_matched && simResult.scenario && (
                <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="font-bold text-slate-900 dark:text-white text-xs">
                      Tên kịch bản: <span className="text-blue-600">{simResult.scenario.scenario_name}</span>
                    </p>
                    <span className="text-[10px] text-slate-400 font-mono">
                      Loại: {simResult.scenario.trigger_type}
                    </span>
                  </div>
                  <div>
                    <span className="text-xs font-bold text-slate-400 block mb-1">
                      Tin nhắn phản hồi tự động sẽ gửi cho khách:
                    </span>
                    <div className="p-3 bg-blue-50 dark:bg-blue-950/40 rounded-xl text-xs text-slate-800 dark:text-slate-200 border border-blue-200/50 dark:border-blue-800/50">
                      {simResult.scenario.response_content}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* 6. MODAL: TẠO / SỬA KỊCH BẢN DO CHỦ SHOP TỰ CẤU HÌNH */}
      {isScenarioModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white dark:bg-slate-800 w-full max-w-xl rounded-3xl border border-slate-200 dark:border-slate-700 shadow-2xl overflow-hidden animate-scaleIn my-8">
            <form onSubmit={handleScenarioSubmit}>
              {/* Modal Header */}
              <div className="px-6 py-4 bg-slate-50 dark:bg-slate-900/60 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
                <div className="flex items-center space-x-2.5">
                  <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold">
                    <Layers size={18} />
                  </div>
                  <div>
                    <h3 className="font-black text-slate-900 dark:text-white text-base">
                      {editingScenario ? 'Chỉnh Sửa Kịch Bản' : 'Tạo Kịch Bản Tự Động Mới'}
                    </h3>
                    <p className="text-xs text-slate-400">
                      Tự thiết lập điều kiện từ khóa và câu trả lời riêng của shop
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsScenarioModalOpen(false)}
                  className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 transition"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Modal Body */}
              <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto text-xs">
                {/* Tên kịch bản */}
                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1">
                    Tên kịch bản: *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ví dụ: Hỏi địa chỉ cửa hàng, Chính sách bảo hành, Tư vấn size..."
                    value={scenarioForm.scenario_name}
                    onChange={(e) => setScenarioForm({ ...scenarioForm, scenario_name: e.target.value })}
                    className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-600"
                  />
                </div>

                {/* Loại kích hoạt */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1">
                      Loại kích hoạt:
                    </label>
                    <select
                      value={scenarioForm.trigger_type}
                      onChange={(e) => setScenarioForm({ ...scenarioForm, trigger_type: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-600"
                    >
                      <option value="KEYWORD_CONTAINS">Chứa từ khóa (Trong câu có từ này)</option>
                      <option value="KEYWORD_EXACT">Khớp chính xác 100%</option>
                      <option value="FIRST_MESSAGE">Tin nhắn đầu tiên của khách mới</option>
                      <option value="HANDOVER_KEYWORD">Yêu cầu gặp nhân viên / khiếu nại</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1">
                      Hành động khi khớp:
                    </label>
                    <select
                      value={scenarioForm.action_type}
                      onChange={(e) => setScenarioForm({ ...scenarioForm, action_type: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-600"
                    >
                      <option value="REPLY_TEXT">Gửi tin nhắn trả lời tự động</option>
                      <option value="HANDOVER_STAFF">Tắt bot, bàn giao cho nhân viên trực</option>
                    </select>
                  </div>
                </div>

                {/* Danh sách từ khóa kích hoạt (Nếu không phải FIRST_MESSAGE) */}
                {scenarioForm.trigger_type !== 'FIRST_MESSAGE' && (
                  <div>
                    <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1">
                      Từ khóa kích hoạt (Ấn Enter sau mỗi từ khóa): *
                    </label>
                    <div className="flex flex-wrap gap-1.5 p-3 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl min-h-[50px] items-center">
                      {scenarioForm.keywords.map((kw, idx) => (
                        <span
                          key={idx}
                          className="px-2.5 py-1 bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-300 dark:border-blue-800 rounded-lg text-xs font-semibold flex items-center space-x-1"
                        >
                          <span>{kw}</span>
                          <button
                            type="button"
                            onClick={() => handleRemoveKeywordFromForm(kw)}
                            className="hover:text-blue-900 font-bold ml-1 cursor-pointer"
                          >
                            ×
                          </button>
                        </span>
                      ))}
                      <input
                        type="text"
                        placeholder="Nhập từ khóa (VD: địa chỉ, ở đâu, shop ở đâu...) ấn Enter..."
                        value={keywordInput}
                        onChange={(e) => setKeywordInput(e.target.value)}
                        onKeyDown={handleAddKeywordToForm}
                        className="bg-transparent text-xs text-slate-800 dark:text-white focus:outline-none flex-1 min-w-[150px]"
                      />
                    </div>
                  </div>
                )}

                {/* Nội dung câu trả lời tự động */}
                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1">
                    Nội dung tin nhắn Bot sẽ trả lời: *
                  </label>
                  <textarea
                    rows={4}
                    required={scenarioForm.action_type === 'REPLY_TEXT'}
                    placeholder="Soạn nội dung tin nhắn gửi tự động cho khách khi khớp kịch bản này..."
                    value={scenarioForm.response_content}
                    onChange={(e) => setScenarioForm({ ...scenarioForm, response_content: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-600"
                  />
                </div>

                {/* Hình ảnh đính kèm (Ảnh bảng size, Voucher, QR chuyển khoản...) */}
                <div className="space-y-2.5 p-3.5 bg-slate-50 dark:bg-slate-900/60 rounded-2xl border border-slate-200 dark:border-slate-700">
                  <div className="flex items-center justify-between">
                    <label className="text-slate-700 dark:text-slate-300 font-bold flex items-center space-x-1.5">
                      <ImageIcon size={14} className="text-blue-600" />
                      <span>Hình ảnh đính kèm (Ảnh bảng size, Voucher, QR...):</span>
                    </label>
                    <span className="text-[10px] text-slate-400">Tùy chọn</span>
                  </div>

                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleImageFileChange}
                    accept="image/*"
                    className="hidden"
                  />

                  {/* Nút bấm tải ảnh lên & ô nhập URL */}
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploadingImage}
                      className="px-3.5 py-2 bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/60 dark:hover:bg-blue-900/60 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800 rounded-xl text-xs font-bold transition flex items-center justify-center space-x-1.5 shrink-0 cursor-pointer disabled:opacity-50"
                    >
                      {uploadingImage ? (
                        <>
                          <RefreshCw size={13} className="animate-spin" />
                          <span>Đang tải ảnh...</span>
                        </>
                      ) : (
                        <>
                          <Upload size={13} />
                          <span>Tải ảnh từ máy tính</span>
                        </>
                      )}
                    </button>

                    <div className="relative flex-1">
                      <input
                        type="text"
                        placeholder="Hoặc dán link ảnh trực tiếp: https://..."
                        value={scenarioForm.image_url}
                        onChange={(e) => setScenarioForm({ ...scenarioForm, image_url: e.target.value })}
                        className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-600 font-mono"
                      />
                    </div>
                  </div>

                  {/* Preview ảnh nếu có */}
                  {scenarioForm.image_url && (
                    <div className="flex items-center space-x-3 p-2.5 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 animate-fadeIn">
                      <div className="w-14 h-14 rounded-lg overflow-hidden border border-slate-200 dark:border-slate-700 shrink-0 bg-slate-100 dark:bg-slate-800">
                        <img
                          src={scenarioForm.image_url}
                          alt="Preview"
                          className="w-full h-full object-cover"
                          onError={(e) => { e.target.src = 'https://placehold.co/100x100?text=Lỗi+ảnh'; }}
                        />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-bold text-slate-800 dark:text-slate-200 text-xs truncate">
                          Đã chọn ảnh đính kèm
                        </p>
                        <p className="text-[10px] text-slate-400 truncate font-mono mt-0.5" title={scenarioForm.image_url}>
                          {scenarioForm.image_url}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setScenarioForm({ ...scenarioForm, image_url: '' })}
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-slate-700 rounded-lg transition shrink-0 cursor-pointer"
                        title="Gỡ ảnh này"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  )}
                </div>

                {/* Tự động gắn Tag khách hàng */}
                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1">
                    Tự động gắn Tag cho khách hàng (Tùy chọn):
                  </label>
                  <input
                    type="text"
                    placeholder="Ví dụ: Hỏi khuyến mãi, Hỏi địa chỉ, Khách cần hỗ trợ..."
                    value={scenarioForm.tag_to_add}
                    onChange={(e) => setScenarioForm({ ...scenarioForm, tag_to_add: e.target.value })}
                    className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-600"
                  />
                </div>
              </div>

              {/* Modal Footer */}
              <div className="px-6 py-3.5 bg-slate-50 dark:bg-slate-900/60 border-t border-slate-200 dark:border-slate-700 flex items-center justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setIsScenarioModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold transition cursor-pointer"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  disabled={scenarioSubmitting}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition flex items-center space-x-1.5 shadow-md shadow-blue-600/20 cursor-pointer disabled:opacity-50"
                >
                  {scenarioSubmitting ? (
                    <>
                      <RefreshCw size={13} className="animate-spin" />
                      <span>Đang lưu...</span>
                    </>
                  ) : (
                    <>
                      <Check size={14} />
                      <span>{editingScenario ? 'Cập nhật kịch bản' : 'Tạo Kịch Bản'}</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default BotAutoPage;
