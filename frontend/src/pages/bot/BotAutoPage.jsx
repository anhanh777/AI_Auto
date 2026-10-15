import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useBusiness } from '../../contexts/BusinessContext.jsx';
import { useToast } from '../../contexts/ToastContext.jsx';
import { aiConfigService } from '../../services/aiConfig.service.js';
import { botScenarioService } from '../../services/botScenario.service.js';
import { uploadService } from '../../services/upload.service.js';
import MediaPickerModal from '../../components/modals/MediaPickerModal.jsx';
import ImportScenarioModal from '../../components/modals/ImportScenarioModal.jsx';
import ConfirmModal from '../../components/common/ConfirmModal.jsx';
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
  Images,
  Upload,
  Paperclip,
  FileSpreadsheet,
  Download
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

  // 1. CẤU HÌNH AI MẶC ĐỊNH & STATE CỐT LÕI
  const DEFAULT_SYSTEM_PROMPT = 'Bạn là chuyên viên tư vấn bán hàng thông minh, nhiệt tình và chu đáo. Hãy chào đón khách hàng, giải đáp chi tiết thông tin sản phẩm dựa trên kho hàng thực tế và hỗ trợ đặt hàng lịch sự, nhanh chóng.';
  const DEFAULT_WELCOME_MSG = 'Dạ shop xin chào bạn ạ! Bạn đang quan tâm đến mẫu sản phẩm nào để shop hỗ trợ tư vấn ngay cho mình nhé?';
  const DEFAULT_GUARDRAILS = ['chửi bậy', 'lừa đảo', 'hoàn tiền gấp', 'hàng giả', 'đối thủ'];

  const [configForm, setConfigForm] = useState({
    bot_name: 'AI Assistant',
    model_name: 'gemini-1.5-flash',
    ai_persona_tone: 'FRIENDLY',
    system_prompt: DEFAULT_SYSTEM_PROMPT,
    welcome_message: DEFAULT_WELCOME_MSG,
    guardrail_blocklist: DEFAULT_GUARDRAILS,
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
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState({
    isOpen: false,
    title: '',
    message: '',
    confirmText: 'Xác nhận xóa',
    cancelText: 'Hủy bỏ',
    type: 'danger',
    loading: false,
    onConfirm: () => {}
  });

  // Form kịch bản mới/sửa
  const [scenarioForm, setScenarioForm] = useState({
    scenario_name: '',
    trigger_type: 'KEYWORD_CONTAINS',
    keywords: [],
    action_type: 'REPLY_TEXT',
    response_content: '',
    image_urls: [],
    image_url: '',
    tag_to_add: '',
    priority: 0,
    is_active: true
  });
  const [keywordInput, setKeywordInput] = useState('');
  const [urlInput, setUrlInput] = useState('');
  const [uploadingImage, setUploadingImage] = useState(false);
  const [showMediaPicker, setShowMediaPicker] = useState(false);
  const fileInputRef = useRef(null);

  // 4. Modal Biến dữ liệu động & Ref con trỏ textarea
  const [showVariableModal, setShowVariableModal] = useState(false);
  const responseTextareaRef = useRef(null);

  const DYNAMIC_VARIABLES = [
    {
      category: 'Khách hàng',
      icon: '👤',
      items: [
        {
          tag: '{customer_name}',
          name: 'Tên khách hàng',
          desc: 'Tên Facebook thật của khách hoặc tên khách tự xưng trong chat',
          example: 'Ying Ying'
        },
        {
          tag: '{phone}',
          name: 'Số điện thoại',
          desc: 'Số điện thoại 10 số của khách đã được kiểm tra hợp lệ',
          example: '0988776655'
        },
        {
          tag: '{shipping_address}',
          name: 'Địa chỉ giao hàng',
          desc: 'Địa chỉ nhận hàng chi tiết và sạch sẽ của khách',
          example: 'Số 25 Cầu Giấy, Hà Nội'
        }
      ]
    },
    {
      category: 'Sản phẩm & Kho',
      icon: '📦',
      items: [
        {
          tag: '{product_name}',
          name: 'Tên sản phẩm',
          desc: 'Tên sản phẩm khách đang quan tâm hoặc đặt mua',
          example: 'Áo Sơ Mi Oxford'
        },
        {
          tag: '{size}',
          name: 'Kích cỡ (Size)',
          desc: 'Size khách hàng đã chọn',
          example: 'Size L'
        },
        {
          tag: '{color}',
          name: 'Màu sắc',
          desc: 'Màu sắc khách hàng đã chọn',
          example: 'Trắng'
        },
        {
          tag: '{quantity}',
          name: 'Số lượng',
          desc: 'Số lượng sản phẩm khách đặt',
          example: '1'
        },
        {
          tag: '{price}',
          name: 'Đơn giá sản phẩm',
          desc: 'Giá bán ưu đãi của sản phẩm kèm đơn vị đ',
          example: '290.000đ'
        },
        {
          tag: '{available_sizes}',
          name: 'Các size còn hàng',
          desc: 'Danh sách các size còn hàng thực tế trong kho',
          example: 'M, L, XL'
        },
        {
          tag: '{available_colors}',
          name: 'Các màu còn hàng',
          desc: 'Danh sách các màu còn hàng thực tế trong kho',
          example: 'Trắng, Đen, Xanh'
        }
      ]
    },
    {
      category: 'Đơn hàng & Cửa hàng',
      icon: '🏷️',
      items: [
        {
          tag: '{order_code}',
          name: 'Mã đơn hàng',
          desc: 'Mã đơn hàng tự động sinh ra khi chốt đơn',
          example: '#DH-1005258'
        },
        {
          tag: '{total_amount}',
          name: 'Tổng tiền thanh toán',
          desc: 'Tổng số tiền khách cần thanh toán',
          example: '290.000đ'
        },
        {
          tag: '{shop_name}',
          name: 'Tên cửa hàng',
          desc: 'Tên Fanpage hoặc tên thương hiệu của shop',
          example: 'Shop Thời Trang Nam'
        },
        {
          tag: '{hotline}',
          name: 'Hotline cửa hàng',
          desc: 'Số hotline hỗ trợ khách hàng',
          example: '1900 6868'
        }
      ]
    }
  ];

  const handleInsertVariable = (variableTag) => {
    const textarea = responseTextareaRef.current;
    if (!textarea) {
      setScenarioForm((prev) => ({
        ...prev,
        response_content: prev.response_content ? `${prev.response_content} ${variableTag}` : variableTag
      }));
      return;
    }

    const start = textarea.selectionStart ?? textarea.value.length;
    const end = textarea.selectionEnd ?? textarea.value.length;
    const currentVal = scenarioForm.response_content || '';
    const newVal = currentVal.substring(0, start) + variableTag + currentVal.substring(end);

    setScenarioForm((prev) => ({
      ...prev,
      response_content: newVal
    }));

    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + variableTag.length, start + variableTag.length);
    }, 50);
  };

  // Xử lý chọn và upload nhiều ảnh cùng lúc từ máy tính
  const handleImageFilesChange = async (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    const invalid = files.some((f) => !f.type.startsWith('image/'));
    if (invalid) {
      showToast('error', 'Chỉ chấp nhận các file định dạng hình ảnh (JPG, PNG, WEBP, GIF)');
      return;
    }

    try {
      setUploadingImage(true);
      const res = await uploadService.uploadMultiple(files, 'bot');
      const list = res?.data || (Array.isArray(res) ? res : []);
      const newUrls = list.map((item) => item.path || item.url).filter(Boolean);

      if (newUrls.length > 0) {
        setScenarioForm((prev) => {
          const updated = [...(prev.image_urls || []), ...newUrls];
          return {
            ...prev,
            image_urls: updated,
            image_url: updated[0] || ''
          };
        });
        showToast('success', `Đã tải lên ${newUrls.length} ảnh đính kèm thành công`);
      }
    } catch (err) {
      showToast('error', err.message || 'Lỗi khi tải ảnh lên');
    } finally {
      setUploadingImage(false);
      if (e.target) e.target.value = '';
    }
  };

  // Thêm ảnh từ đường link URL trực tiếp
  const handleAddImageUrl = (e) => {
    if (e) e.preventDefault();
    const val = urlInput.trim();
    if (!val) return;
    if (!val.startsWith('http://') && !val.startsWith('https://') && !val.startsWith('/uploads/')) {
      showToast('error', 'Đường link ảnh phải bắt đầu bằng https:// hoặc http://');
      return;
    }
    setScenarioForm((prev) => {
      const updated = [...(prev.image_urls || []), val];
      return {
        ...prev,
        image_urls: updated,
        image_url: updated[0] || ''
      };
    });
    setUrlInput('');
    showToast('success', 'Đã thêm link ảnh vào danh sách');
  };

  // Xóa 1 ảnh cụ thể khỏi danh sách
  const handleRemoveImage = (indexToRemove) => {
    setScenarioForm((prev) => {
      const updated = (prev.image_urls || []).filter((_, idx) => idx !== indexToRemove);
      return {
        ...prev,
        image_urls: updated,
        image_url: updated[0] || ''
      };
    });
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
      const data = res?.data || res;
      if (data) {
        const shopPrompt = activeBusiness?.business_name
          ? `Bạn là chuyên viên tư vấn bán hàng thông minh, nhiệt tình và chu đáo của ${activeBusiness.business_name}. Hãy giải đáp chi tiết thông tin mẫu mã sản phẩm dựa trên kho hàng thực tế, tư vấn giá ưu đãi và hỗ trợ chốt đơn lịch sự, nhanh chóng.`
          : DEFAULT_SYSTEM_PROMPT;

        setConfigForm({
          bot_name: data.bot_name || 'AI Assistant',
          model_name: data.model_name || 'gemini-1.5-flash',
          ai_persona_tone: data.ai_persona_tone || 'FRIENDLY',
          system_prompt: (data.system_prompt && data.system_prompt.trim()) ? data.system_prompt : shopPrompt,
          welcome_message: (data.welcome_message && data.welcome_message.trim()) ? data.welcome_message : DEFAULT_WELCOME_MSG,
          guardrail_blocklist: Array.isArray(data.guardrail_blocklist) && data.guardrail_blocklist.length > 0
            ? data.guardrail_blocklist
            : DEFAULT_GUARDRAILS,
          debounce_delay_seconds: data.debounce_delay_seconds || 3,
          auto_order_extraction: data.auto_order_extraction !== undefined ? data.auto_order_extraction : true,
          is_active: data.is_active !== undefined ? data.is_active : true
        });
      }
    } catch (err) {
      console.error('Lỗi khi tải cấu hình AI:', err);
    } finally {
      setLoadingConfig(false);
    }
  }, [activeBusiness?._id, activeBusiness?.business_name]);

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
        fetchAIConfig();
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
  const handleDeleteScenario = (id, name) => {
    setConfirmDialog({
      isOpen: true,
      title: 'Xóa kịch bản tự động',
      message: `Bạn có chắc chắn muốn xóa vĩnh viễn kịch bản "${name}" khỏi hệ thống?`,
      confirmText: 'Xóa kịch bản',
      cancelText: 'Hủy bỏ',
      type: 'danger',
      loading: false,
      onConfirm: async () => {
        try {
          setConfirmDialog((prev) => ({ ...prev, loading: true }));
          const res = await botScenarioService.deleteScenario(id, activeBusiness._id);
          if (res.success || res.message) {
            showToast('success', 'Đã xóa kịch bản');
            fetchScenarios();
          }
        } catch (err) {
          showToast('error', err.message || 'Lỗi khi xóa kịch bản');
        } finally {
          setConfirmDialog((prev) => ({ ...prev, isOpen: false, loading: false }));
        }
      }
    });
  };

  // Mở modal tạo / sửa kịch bản
  const handleOpenScenarioModal = (item = null) => {
    if (item) {
      setEditingScenario(item);
      const initialImages = Array.isArray(item.image_urls) && item.image_urls.length > 0
        ? item.image_urls
        : (item.image_url ? [item.image_url] : []);
      setScenarioForm({
        scenario_name: item.scenario_name || '',
        trigger_type: item.trigger_type || 'KEYWORD_CONTAINS',
        keywords: item.keywords || [],
        action_type: item.action_type || 'REPLY_TEXT',
        response_content: item.response_content || '',
        image_urls: initialImages,
        image_url: initialImages[0] || '',
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
        image_urls: [],
        image_url: '',
        tag_to_add: '',
        priority: 0,
        is_active: true
      });
    }
    setUrlInput('');
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

      // Nếu không khớp kịch bản của chủ shop -> Cho AI Gemini tư vấn & bóc tách thử nghiệm luôn!
      if (!data?.is_matched) {
        try {
          const aiRes = await aiConfigService.testAIChat({
            business_id: activeBusiness._id,
            messageText: simMessage.trim()
          });
          data.ai_response = aiRes?.data || aiRes;
        } catch (aiErr) {
          console.warn('AI Test Error:', aiErr);
        }
      }

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
            <div className="flex items-center space-x-2">
              <button
                type="button"
                onClick={() => setIsImportModalOpen(true)}
                className="flex items-center space-x-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white rounded-xl text-xs font-bold shadow-md shadow-emerald-600/20 transition cursor-pointer"
                title="Nhập hàng loạt kịch bản từ file Excel hoặc CSV"
              >
                <FileSpreadsheet size={14} />
                <span>Nhập từ file</span>
              </button>

              <button
                type="button"
                onClick={() => handleOpenScenarioModal()}
                className="flex items-center space-x-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white rounded-xl text-xs font-bold shadow-md shadow-blue-600/25 transition cursor-pointer"
              >
                <Plus size={15} />
                <span>Thêm kịch bản mới</span>
              </button>
            </div>
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
                <div className="flex flex-wrap items-center justify-center gap-2.5">
                  <button
                    type="button"
                    onClick={() => handleOpenScenarioModal()}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition shadow-md shadow-blue-600/20 inline-flex items-center space-x-1.5 cursor-pointer"
                  >
                    <Plus size={14} />
                    <span>Tạo kịch bản thủ công</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setIsImportModalOpen(true)}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition shadow-md shadow-emerald-600/20 inline-flex items-center space-x-1.5 cursor-pointer"
                  >
                    <FileSpreadsheet size={14} />
                    <span>Nhập từ file Excel mẫu</span>
                  </button>
                </div>
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
                          {(() => {
                            const images = Array.isArray(sc.image_urls) && sc.image_urls.length > 0
                              ? sc.image_urls
                              : (sc.image_url ? [sc.image_url] : []);
                            return (
                              <div className="flex items-center space-x-2">
                                {images.length > 0 && (
                                  <div className="relative w-9 h-9 rounded-lg overflow-hidden border border-slate-200 dark:border-slate-700 shrink-0 bg-slate-100 dark:bg-slate-800">
                                    <img
                                      src={images[0]}
                                      alt="attachment"
                                      className="w-full h-full object-cover"
                                      onError={(e) => { e.target.style.display = 'none'; }}
                                    />
                                    {images.length > 1 && (
                                      <span className="absolute inset-0 bg-slate-900/60 text-white font-extrabold text-[9px] flex items-center justify-center">
                                        +{images.length - 1}
                                      </span>
                                    )}
                                  </div>
                                )}
                                <div className="min-w-0 flex-1">
                                  <p className="truncate text-slate-700 dark:text-slate-300 text-[11px]" title={sc.response_content}>
                                    {sc.response_content || (images.length > 0 ? `[Đính kèm ${images.length} ảnh]` : '—')}
                                  </p>
                                  {images.length > 0 && (
                                    <span className="text-[10px] text-blue-600 dark:text-blue-400 font-medium flex items-center space-x-1 mt-0.5">
                                      <ImageIcon size={10} />
                                      <span>{images.length} ảnh đính kèm</span>
                                    </span>
                                  )}
                                </div>
                              </div>
                            );
                          })()}
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
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                    Lời chào tự động khi khách mới mở hộp thoại chat:
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setConfigForm((prev) => ({
                        ...prev,
                        welcome_message: DEFAULT_WELCOME_MSG
                      }));
                      showToast('info', 'Đã điền lời chào mẫu');
                    }}
                    className="text-[11px] text-blue-600 dark:text-blue-400 hover:underline font-bold cursor-pointer"
                  >
                    Điền mẫu chuẩn
                  </button>
                </div>
                <textarea
                  rows={2}
                  value={configForm.welcome_message}
                  onChange={(e) => setConfigForm({ ...configForm, welcome_message: e.target.value })}
                  placeholder={DEFAULT_WELCOME_MSG}
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
                <div className="flex items-center space-x-3">
                  <button
                    type="button"
                    onClick={() => {
                      const shopPrompt = activeBusiness?.business_name
                        ? `Bạn là chuyên viên tư vấn bán hàng thông minh, nhiệt tình và chu đáo của ${activeBusiness.business_name}. Hãy giải đáp chi tiết thông tin mẫu mã sản phẩm dựa trên kho hàng thực tế, tư vấn giá ưu đãi và hỗ trợ chốt đơn lịch sự, nhanh chóng.`
                        : DEFAULT_SYSTEM_PROMPT;
                      setConfigForm((prev) => ({
                        ...prev,
                        system_prompt: shopPrompt
                      }));
                      showToast('info', 'Đã điền gợi ý prompt mẫu cho cửa hàng');
                    }}
                    className="text-[11px] text-blue-600 dark:text-blue-400 hover:underline font-bold cursor-pointer"
                  >
                    Gợi ý mẫu chuẩn
                  </button>
                  <span className="text-[11px] text-slate-400 font-mono">Google Gemini 1.5 Flash</span>
                </div>
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

              {/* Phản hồi từ Trợ lý AI Gemini khi không khớp kịch bản */}
              {!simResult.is_matched && simResult.ai_response && (
                <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="font-bold text-slate-900 dark:text-white text-xs flex items-center space-x-1.5">
                      <Sparkles size={14} className="text-blue-600" />
                      <span>Trợ lý AI Gemini phản hồi tự động:</span>
                    </p>
                    {simResult.ai_response.handover_to_staff && (
                      <span className="px-2 py-0.5 bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20 rounded-md text-[10px] font-bold">
                        Bàn giao nhân viên
                      </span>
                    )}
                  </div>

                  <div className="p-3 bg-blue-50/70 dark:bg-blue-950/40 rounded-xl text-xs text-slate-800 dark:text-slate-200 border border-blue-200/50 dark:border-blue-800/50 leading-relaxed whitespace-pre-wrap">
                    {simResult.ai_response.reply}
                  </div>

                  {/* Bóc tách Đơn hàng thông minh */}
                  {simResult.ai_response.is_order_intent && simResult.ai_response.order_data && (
                    <div className="p-3 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/50 rounded-xl space-y-2 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-emerald-700 dark:text-emerald-300 flex items-center space-x-1">
                          <CheckCircle2 size={13} />
                          <span>AI đã bóc tách dữ liệu đơn hàng:</span>
                        </span>
                        <span className="px-2 py-0.5 rounded bg-emerald-600 text-white text-[10px] font-bold">
                          Trạng thái: PENDING (Chờ duyệt)
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-600 dark:text-slate-300">
                        <div>
                          <strong>Người nhận:</strong> {simResult.ai_response.order_data.customer_name || 'Khách hàng'}
                        </div>
                        <div>
                          <strong>Số điện thoại:</strong> {simResult.ai_response.order_data.phone || 'Chưa rõ'}
                        </div>
                        <div className="col-span-2">
                          <strong>Địa chỉ giao:</strong> {simResult.ai_response.order_data.shipping_address || 'Chưa rõ'}
                        </div>
                        {Array.isArray(simResult.ai_response.order_data.items) && simResult.ai_response.order_data.items.length > 0 && (
                          <div className="col-span-2">
                            <strong>Sản phẩm:</strong>{' '}
                            {simResult.ai_response.order_data.items.map((it) => `${it.product_name || it.sku} (x${it.quantity || 1})`).join(', ')}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
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

                {/* Nội dung câu trả lời tự động kèm Thẻ biến dữ liệu động */}
                <div className="space-y-1.5">
                  <div className="flex flex-wrap items-center justify-between gap-1.5">
                    <label className="text-slate-700 dark:text-slate-300 font-bold text-xs flex items-center space-x-1">
                      <span>Nội dung tin nhắn Bot sẽ trả lời: *</span>
                    </label>
                    <button
                      type="button"
                      onClick={() => setShowVariableModal(true)}
                      className="inline-flex items-center space-x-1 px-2.5 py-1 bg-amber-50 hover:bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:hover:bg-amber-900/80 dark:text-amber-300 rounded-lg text-[11px] font-bold border border-amber-200 dark:border-amber-800 transition-colors shadow-xs"
                    >
                      <Sparkles size={12} className="text-amber-500 animate-pulse" />
                      <span>{'{x}'} Bảng tất cả biến động ▾</span>
                    </button>
                  </div>

                  {/* Thanh nút bấm chèn nhanh biến động */}
                  <div className="flex flex-wrap items-center gap-1.5 p-2 bg-slate-100 dark:bg-slate-900/80 rounded-xl border border-slate-200 dark:border-slate-800">
                    <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 mr-1 flex items-center space-x-1">
                      <span>Chèn nhanh:</span>
                    </span>
                    {[
                      { label: '👤 Tên khách', tag: '{customer_name}' },
                      { label: '📦 Tên SP', tag: '{product_name}' },
                      { label: '📏 Size', tag: '{size}' },
                      { label: '🎨 Màu', tag: '{color}' },
                      { label: '📞 SĐT', tag: '{phone}' },
                      { label: '📍 Địa chỉ', tag: '{shipping_address}' },
                      { label: '💰 Giá', tag: '{price}' },
                      { label: '🏷️ Mã đơn', tag: '{order_code}' }
                    ].map((btn) => (
                      <button
                        key={btn.tag}
                        type="button"
                        onClick={() => handleInsertVariable(btn.tag)}
                        title={`Chèn ${btn.tag} vào vị trí con trỏ`}
                        className="px-2 py-0.5 bg-white dark:bg-slate-800 hover:bg-blue-50 dark:hover:bg-blue-900/40 text-slate-700 dark:text-slate-200 hover:text-blue-600 dark:hover:text-blue-400 border border-slate-200 dark:border-slate-700 rounded-md text-[11px] font-medium transition-all shadow-2xs active:scale-95"
                      >
                        + {btn.label}
                      </button>
                    ))}
                  </div>

                  <textarea
                    ref={responseTextareaRef}
                    rows={4}
                    required={scenarioForm.action_type === 'REPLY_TEXT'}
                    placeholder="Soạn nội dung tin nhắn gửi tự động cho khách. Bạn có thể chèn các biến động như {customer_name}, {product_name}, {phone}..."
                    value={scenarioForm.response_content}
                    onChange={(e) => setScenarioForm({ ...scenarioForm, response_content: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-600"
                  />
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 italic">
                    💡 Mẹo: Khi khách chat, các thẻ như <code className="text-blue-600 font-bold bg-blue-50 dark:bg-blue-950/60 px-1 py-0.5 rounded">{'{customer_name}'}</code>, <code className="text-blue-600 font-bold bg-blue-50 dark:bg-blue-950/60 px-1 py-0.5 rounded">{'{product_name}'}</code> sẽ tự động thay bằng dữ liệu thực tế của khách hàng.
                  </p>
                </div>

                {/* Hình ảnh đính kèm (Ảnh bảng size, Voucher, Bộ sưu tập...) */}
                <div className="space-y-2.5 p-3.5 bg-slate-50 dark:bg-slate-900/60 rounded-2xl border border-slate-200 dark:border-slate-700">
                  <div className="flex items-center justify-between">
                    <label className="text-slate-700 dark:text-slate-300 font-bold flex items-center space-x-1.5">
                      <ImageIcon size={14} className="text-blue-600" />
                      <span>Hình ảnh đính kèm (Bảng size, Voucher, Bộ sưu tập mẫu...):</span>
                    </label>
                    <span className="text-[10px] text-blue-600 dark:text-blue-400 font-bold">
                      {(scenarioForm.image_urls || []).length} ảnh đã chọn
                    </span>
                  </div>

                  <input
                    type="file"
                    multiple
                    ref={fileInputRef}
                    onChange={handleImageFilesChange}
                    accept="image/*"
                    className="hidden"
                  />

                  {/* Nút bấm Chọn từ Kho Media & Tải ảnh lên từ máy */}
                  <div className="flex flex-wrap items-center gap-2.5">
                    <button
                      type="button"
                      onClick={() => setShowMediaPicker(true)}
                      className="px-4 py-2 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/60 dark:hover:bg-indigo-900/60 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800 rounded-xl text-xs font-bold transition flex items-center justify-center space-x-1.5 cursor-pointer shadow-xs"
                      title="Mở thư viện ảnh doanh nghiệp để chọn bảng size, voucher, sản phẩm..."
                    >
                      <Images size={14} />
                      <span>Chọn từ Kho Media Shop</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploadingImage}
                      className="px-4 py-2 bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/60 dark:hover:bg-blue-900/60 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800 rounded-xl text-xs font-bold transition flex items-center justify-center space-x-1.5 cursor-pointer disabled:opacity-50"
                    >
                      {uploadingImage ? (
                        <>
                          <RefreshCw size={14} className="animate-spin" />
                          <span>Đang tải ảnh...</span>
                        </>
                      ) : (
                        <>
                          <Upload size={14} />
                          <span>Tải từ máy tính</span>
                        </>
                      )}
                    </button>
                  </div>

                  {/* Danh sách lưới các ảnh đã chọn (Album) */}
                  {Array.isArray(scenarioForm.image_urls) && scenarioForm.image_urls.length > 0 && (
                    <div className="space-y-1.5 pt-1">
                      <p className="text-[11px] text-slate-400 font-medium">
                        Danh sách các ảnh sẽ gửi kèm theo tin nhắn này:
                      </p>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                        {scenarioForm.image_urls.map((imgUrl, idx) => (
                          <div
                            key={idx}
                            className="relative group w-full aspect-square rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-xs"
                          >
                            <img
                              src={imgUrl}
                              alt={`img-${idx}`}
                              className="w-full h-full object-cover"
                              onError={(e) => { e.target.src = 'https://placehold.co/100x100?text=Lỗi+ảnh'; }}
                            />
                            <span className="absolute top-1.5 left-1.5 px-1.5 py-0.5 bg-slate-900/70 text-white rounded font-mono text-[9px] font-bold">
                              #{idx + 1}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleRemoveImage(idx)}
                              className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-rose-600 text-white flex items-center justify-center hover:bg-rose-700 transition shadow cursor-pointer"
                              title="Xóa ảnh này"
                            >
                              <X size={12} />
                            </button>
                          </div>
                        ))}
                      </div>
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

      {/* MODAL CHỌN ẢNH TỪ KHO MEDIA DOANH NGHIỆP */}
      <MediaPickerModal
        isOpen={showMediaPicker}
        onClose={() => setShowMediaPicker(false)}
        initialFolder="bot"
        multiple={true}
        onSelect={(urls) => {
          setScenarioForm((prev) => {
            const current = prev.image_urls || [];
            const updated = [...current, ...urls.filter((u) => !current.includes(u))];
            return {
              ...prev,
              image_urls: updated,
              image_url: updated[0] || ''
            };
          });
          showToast('success', `Đã thêm ${urls.length} ảnh từ Kho Media vào kịch bản`);
        }}
      />

      {/* MODAL BẢNG TRA CỨU & CHÈN BIẾN DỮ LIỆU ĐỘNG */}
      {showVariableModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-800 rounded-2xl max-w-2xl w-full border border-slate-200 dark:border-slate-700 shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
            {/* Header */}
            <div className="p-4 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/50">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 rounded-lg bg-amber-100 dark:bg-amber-950/80 text-amber-600 dark:text-amber-400 flex items-center justify-center font-bold text-xs">
                  {'{x}'}
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-800 dark:text-white">
                    Bảng Tra Cứu & Chèn Biến Dữ Liệu Động
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Click vào nút <span className="font-semibold text-blue-600">"+ Chèn"</span> để gắn biến vào câu trả lời của Bot.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowVariableModal(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-white rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            {/* Body */}
            <div className="p-4 overflow-y-auto space-y-5 flex-1">
              {DYNAMIC_VARIABLES.map((cat) => (
                <div key={cat.category} className="space-y-2">
                  <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center space-x-1.5 uppercase tracking-wider">
                    <span>{cat.icon}</span>
                    <span>Nhóm {cat.category}</span>
                  </h4>
                  <div className="border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden divide-y divide-slate-100 dark:divide-slate-700/60 bg-slate-50/50 dark:bg-slate-900/40">
                    {cat.items.map((it) => (
                      <div
                        key={it.tag}
                        className="p-3 flex items-center justify-between gap-3 hover:bg-white dark:hover:bg-slate-800/80 transition-colors"
                      >
                        <div className="space-y-0.5 flex-1 min-w-0">
                          <div className="flex items-center space-x-2">
                            <code className="text-xs font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60 px-2 py-0.5 rounded-md border border-blue-200/60 dark:border-blue-900/40">
                              {it.tag}
                            </code>
                            <span className="text-xs font-bold text-slate-800 dark:text-white">
                              {it.name}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400">
                            {it.desc}
                          </p>
                          <p className="text-[10px] text-slate-400 dark:text-slate-500">
                            Ví dụ thực tế: <span className="text-emerald-600 dark:text-emerald-400 font-medium">"{it.example}"</span>
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            handleInsertVariable(it.tag);
                            showToast('success', `Đã chèn biến ${it.tag} vào nội dung tin nhắn`);
                            setShowVariableModal(false);
                          }}
                          className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition flex items-center space-x-1 shrink-0 shadow-xs cursor-pointer active:scale-95"
                        >
                          <Plus size={13} />
                          <span>Chèn</span>
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {/* Footer */}
            <div className="p-3 border-t border-slate-100 dark:border-slate-700 flex justify-end bg-slate-50/50 dark:bg-slate-900/50">
              <button
                type="button"
                onClick={() => setShowVariableModal(false)}
                className="px-4 py-2 bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-white rounded-xl text-xs font-bold transition cursor-pointer"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 8. MODAL: NHẬP KỊCH BẢN TỪ FILE EXCEL / CSV */}
      <ImportScenarioModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        businessId={activeBusiness?._id}
        onImportSuccess={() => fetchScenarios()}
      />

      {/* Modal xác nhận xóa kịch bản thay thế window.confirm */}
      <ConfirmModal
        isOpen={confirmDialog.isOpen}
        onClose={() => setConfirmDialog((prev) => ({ ...prev, isOpen: false }))}
        onConfirm={confirmDialog.onConfirm}
        title={confirmDialog.title}
        message={confirmDialog.message}
        confirmText={confirmDialog.confirmText}
        cancelText={confirmDialog.cancelText}
        type={confirmDialog.type}
        loading={confirmDialog.loading}
      />
    </div>
  );
};

export default BotAutoPage;
