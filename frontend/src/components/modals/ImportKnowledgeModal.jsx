import React, { useState, useRef } from 'react';
import {
  X,
  Upload,
  FileSpreadsheet,
  Download,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  FileText,
  AlertCircle,
  HelpCircle,
  Check,
  Tag
} from 'lucide-react';
import { knowledgeService } from '../../services/knowledge.service.js';
import { useToast } from '../../contexts/ToastContext.jsx';

const ImportKnowledgeModal = ({
  isOpen,
  onClose,
  businessId,
  onImportSuccess
}) => {
  const { showToast } = useToast();
  const fileInputRef = useRef(null);

  const [selectedFile, setSelectedFile] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [importing, setImporting] = useState(false);
  const [downloadingTemplate, setDownloadingTemplate] = useState(false);

  // Dữ liệu xem trước từ backend
  const [previewData, setPreviewData] = useState(null);
  const [overwriteMode, setOverwriteMode] = useState('SKIP'); // 'SKIP' | 'OVERWRITE'

  if (!isOpen) return null;

  // 1. Tải file mẫu Excel
  const handleDownloadTemplate = async () => {
    try {
      setDownloadingTemplate(true);
      const resData = await knowledgeService.downloadTemplate();
      const blob =
        resData instanceof Blob
          ? resData
          : new Blob([resData?.data || resData], {
              type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
            });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'Kho_Tri_Thuc_Mau_AI_Sales.xlsx');
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      showToast('success', 'Đã tải file Excel mẫu tri thức về máy');
    } catch (err) {
      console.error(err);
      showToast(
        'error',
        'Không thể tải file mẫu: ' + (err.response?.data?.message || err.message)
      );
    } finally {
      setDownloadingTemplate(false);
    }
  };

  // 2. Xử lý khi chọn hoặc thả file
  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) processFile(file);
  };

  const processFile = async (file) => {
    const validExtensions = ['.xlsx', '.xls', '.csv'];
    const fileName = file.name.toLowerCase();
    const isValid = validExtensions.some((ext) => fileName.endsWith(ext));

    if (!isValid) {
      showToast('warning', 'Vui lòng chọn file định dạng .xlsx, .xls hoặc .csv');
      return;
    }

    setSelectedFile(file);
    setPreviewData(null);

    // Gửi lên backend để phân tích dữ liệu xem trước
    try {
      setAnalyzing(true);
      const formData = new FormData();
      formData.append('file', file);

      const res = await knowledgeService.previewKnowledgeFile(formData);
      setPreviewData(res.data?.data || res.data);
      showToast('success', 'Phân tích file thành công! Bạn có thể xem trước nội dung bên dưới.');
    } catch (err) {
      console.error(err);
      showToast(
        'error',
        'Lỗi đọc file: ' + (err.response?.data?.message || err.message)
      );
    } finally {
      setAnalyzing(false);
    }
  };

  // 3. Thực hiện lưu nhập hàng loạt vào CSDL
  const handleConfirmImport = async () => {
    if (!selectedFile) return;

    try {
      setImporting(true);
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('business_id', businessId);
      formData.append('overwrite_mode', overwriteMode);

      const res = await knowledgeService.importKnowledge(formData);
      const result = res.data?.data || res.data;

      const successMsg = `Đã nhập thành công ${result.successCount || 0} tài liệu mới${
        result.updatedCount ? `, cập nhật ${result.updatedCount} tài liệu cũ` : ''
      }!`;
      showToast('success', successMsg);

      if (onImportSuccess) {
        onImportSuccess(result);
      }
      handleClose();
    } catch (err) {
      console.error(err);
      showToast(
        'error',
        'Nhập tài liệu thất bại: ' + (err.response?.data?.message || err.message)
      );
    } finally {
      setImporting(false);
    }
  };

  const handleClose = () => {
    setSelectedFile(null);
    setPreviewData(null);
    onClose();
  };

  const getCategoryBadge = (cat) => {
    const defaultBadges = {
      SHIPPING: { text: 'Vận chuyển', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300' },
      RETURN_POLICY: { text: 'Đổi trả', color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300' },
      SIZE_GUIDE: { text: 'Bảng size', color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300' },
      PROMOTION: { text: 'Khuyến mãi', color: 'bg-pink-100 text-pink-700 dark:bg-pink-900/40 dark:text-pink-300' },
      FAQ: { text: 'FAQ', color: 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300' },
      GENERAL: { text: 'Chung', color: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300' }
    };
    if (defaultBadges[cat]) return defaultBadges[cat];
    return {
      text: cat || 'Chung',
      color: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300'
    };
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden border border-slate-200 dark:border-slate-800">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-gradient-to-r from-blue-50/70 to-indigo-50/70 dark:from-slate-800 dark:to-slate-900">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-md shadow-blue-500/20">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                Nhập tài liệu tri thức từ file Excel / CSV
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Cung cấp chính sách, quy định, hướng dẫn mua sắm để AI tự tra cứu RAG
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-white/80 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          {/* Vùng tải file mẫu & Dropzone */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Hộp tải file mẫu */}
            <div className="md:col-span-1 border border-dashed border-slate-200 dark:border-slate-700 rounded-xl p-4 bg-slate-50/60 dark:bg-slate-800/50 flex flex-col justify-between">
              <div>
                <div className="flex items-center space-x-2 text-blue-600 dark:text-blue-400 font-semibold text-sm mb-1">
                  <Download className="w-4 h-4" />
                  <span>File Excel mẫu chuẩn</span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed mb-3">
                  Tải file mẫu có sẵn cấu trúc cột và 5 tài liệu mẫu (đổi trả, ship COD, bảo hành, bảng size, FAQ) để điền nhanh.
                </p>
              </div>
              <button
                type="button"
                onClick={handleDownloadTemplate}
                disabled={downloadingTemplate}
                className="w-full inline-flex items-center justify-center space-x-2 py-2 px-3 bg-white dark:bg-slate-700 border border-blue-200 dark:border-slate-600 text-blue-700 dark:text-blue-300 hover:bg-blue-50 dark:hover:bg-slate-600 rounded-lg text-xs font-medium transition-colors shadow-sm disabled:opacity-50 cursor-pointer"
              >
                {downloadingTemplate ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <FileSpreadsheet className="w-3.5 h-3.5" />
                )}
                <span>Tải file mẫu (.xlsx)</span>
              </button>
            </div>

            {/* Vùng kéo thả File Upload */}
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragging(true);
              }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`md:col-span-2 border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all flex flex-col items-center justify-center ${
                isDragging
                  ? 'border-blue-500 bg-blue-50/50 scale-[1.01]'
                  : selectedFile
                  ? 'border-emerald-400 bg-emerald-50/30 dark:bg-emerald-950/20'
                  : 'border-slate-200 dark:border-slate-700 hover:border-blue-400 bg-white dark:bg-slate-800 hover:bg-slate-50/50 dark:hover:bg-slate-850'
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls,.csv"
                onChange={handleFileChange}
                className="hidden"
              />

              {analyzing ? (
                <div className="py-2 flex flex-col items-center space-y-2">
                  <RefreshCw className="w-8 h-8 text-blue-600 animate-spin" />
                  <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                    Đang phân tích cấu trúc file...
                  </p>
                  <p className="text-xs text-slate-400">Hệ thống đang kiểm tra tính hợp lệ của từng dòng</p>
                </div>
              ) : selectedFile ? (
                <div className="py-2 flex flex-col items-center space-y-2">
                  <div className="w-12 h-12 rounded-full bg-emerald-100 dark:bg-emerald-950 flex items-center justify-center text-emerald-600">
                    <FileText className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-800 dark:text-slate-100">{selectedFile.name}</p>
                    <p className="text-xs text-slate-400">
                      {(selectedFile.size / 1024).toFixed(1)} KB • Nhấn để chọn file khác
                    </p>
                  </div>
                </div>
              ) : (
                <div className="py-2 flex flex-col items-center space-y-2">
                  <div className="w-12 h-12 rounded-full bg-blue-50 dark:bg-slate-700 flex items-center justify-center text-blue-600 dark:text-blue-400">
                    <Upload className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                      Kéo thả file vào đây hoặc <span className="text-blue-600 hover:underline">Duyệt file</span>
                    </p>
                    <p className="text-xs text-slate-400 mt-1">Hỗ trợ định dạng .xlsx, .xls, .csv</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Bảng xem trước dữ liệu khi đã phân tích */}
          {previewData && (
            <div className="space-y-4">
              {/* Thống kê dòng hợp lệ / không hợp lệ */}
              <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-50 dark:bg-slate-800/80 p-3.5 rounded-xl border border-slate-200/80 dark:border-slate-700">
                <div className="flex items-center space-x-3 text-xs">
                  <span className="font-semibold text-slate-700 dark:text-slate-300">
                    Tổng số dòng: <b>{previewData.total}</b>
                  </span>
                  <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 font-medium">
                    <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                    <span>Hợp lệ: {previewData.validCount}</span>
                  </span>
                  {previewData.invalidCount > 0 && (
                    <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300 font-medium">
                      <AlertTriangle className="w-3.5 h-3.5 mr-1" />
                      <span>Không hợp lệ: {previewData.invalidCount}</span>
                    </span>
                  )}
                </div>

                {/* Chế độ xử lý trùng */}
                <div className="flex items-center space-x-3 text-xs">
                  <span className="text-slate-500 dark:text-slate-400">Trùng tiêu đề:</span>
                  <label className="inline-flex items-center space-x-1.5 cursor-pointer">
                    <input
                      type="radio"
                      name="overwrite_mode"
                      value="SKIP"
                      checked={overwriteMode === 'SKIP'}
                      onChange={() => setOverwriteMode('SKIP')}
                      className="text-blue-600 focus:ring-blue-500 text-xs"
                    />
                    <span className="text-slate-700 dark:text-slate-300">Bỏ qua</span>
                  </label>
                  <label className="inline-flex items-center space-x-1.5 cursor-pointer">
                    <input
                      type="radio"
                      name="overwrite_mode"
                      value="OVERWRITE"
                      checked={overwriteMode === 'OVERWRITE'}
                      onChange={() => setOverwriteMode('OVERWRITE')}
                      className="text-blue-600 focus:ring-blue-500 text-xs"
                    />
                    <span className="text-slate-700 dark:text-slate-300">Ghi đè nội dung</span>
                  </label>
                </div>
              </div>

              {/* Bảng danh sách hàng */}
              <div className="border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden max-h-72 overflow-y-auto">
                <table className="w-full text-left text-xs text-slate-600 dark:text-slate-300">
                  <thead className="bg-slate-100/80 dark:bg-slate-800 text-slate-700 dark:text-slate-300 uppercase text-[11px] tracking-wider sticky top-0 z-10 border-b border-slate-200 dark:border-slate-700">
                    <tr>
                      <th className="py-2.5 px-3 w-12 text-center">Dòng</th>
                      <th className="py-2.5 px-3 w-48">Tiêu đề</th>
                      <th className="py-2.5 px-3 w-28">Danh mục</th>
                      <th className="py-2.5 px-3">Nội dung trích đoạn</th>
                      <th className="py-2.5 px-3 w-36">Từ khóa</th>
                      <th className="py-2.5 px-3 w-28 text-center">Trạng thái</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800 bg-white dark:bg-slate-900">
                    {previewData.rows?.map((row, idx) => {
                      const catBadge = getCategoryBadge(row.category);
                      return (
                        <tr
                          key={idx}
                          className={
                            row.isValid
                              ? 'hover:bg-slate-50 dark:hover:bg-slate-800/50'
                              : 'bg-rose-50/40 dark:bg-rose-950/20'
                          }
                        >
                          <td className="py-2.5 px-3 text-center text-slate-400 font-mono">
                            {row.row_index}
                          </td>
                          <td className="py-2.5 px-3 font-semibold text-slate-800 dark:text-slate-200">
                            {row.title || (
                              <span className="italic text-rose-400">(Trống tiêu đề)</span>
                            )}
                          </td>
                          <td className="py-2.5 px-3">
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${catBadge.color}`}
                            >
                              {catBadge.text}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 max-w-xs truncate text-slate-600 dark:text-slate-400" title={row.content}>
                            {row.content || (
                              <span className="italic text-rose-400">(Trống nội dung)</span>
                            )}
                          </td>
                          <td className="py-2.5 px-3">
                            <div className="flex flex-wrap gap-1 max-w-[150px]">
                              {row.keywords && row.keywords.length > 0 ? (
                                row.keywords.slice(0, 2).map((kw, kidx) => (
                                  <span
                                    key={kidx}
                                    className="px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded text-[10px]"
                                  >
                                    {kw}
                                  </span>
                                ))
                              ) : (
                                <span className="text-slate-400 text-[10px]">-</span>
                              )}
                              {row.keywords && row.keywords.length > 2 && (
                                <span className="text-[10px] text-slate-400">
                                  +{row.keywords.length - 2}
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            {row.isValid ? (
                              <span className="inline-flex items-center text-emerald-600 dark:text-emerald-400 text-xs font-medium">
                                <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                                Hợp lệ
                              </span>
                            ) : (
                              <span
                                className="inline-flex items-center text-rose-600 dark:text-rose-400 text-xs font-medium cursor-help"
                                title={row.errors?.join(', ')}
                              >
                                <AlertTriangle className="w-3.5 h-3.5 mr-1" />
                                Lỗi dữ liệu
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {previewData.invalidCount > 0 && (
                <div className="flex items-start space-x-2 text-xs text-amber-800 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/30 p-3 rounded-lg border border-amber-200/60 dark:border-amber-900/40">
                  <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <p>
                    Có {previewData.invalidCount} dòng dữ liệu không hợp lệ (thiếu tiêu đề hoặc nội dung). Các dòng này sẽ tự động bị bỏ qua trong quá trình nhập.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 bg-slate-50 dark:bg-slate-800/60 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <button
            type="button"
            onClick={handleClose}
            className="px-4 py-2 text-xs font-medium text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 rounded-lg hover:bg-slate-200/50 dark:hover:bg-slate-700 transition cursor-pointer"
          >
            Hủy bỏ
          </button>

          <button
            type="button"
            onClick={handleConfirmImport}
            disabled={
              !selectedFile ||
              !previewData ||
              previewData.validCount === 0 ||
              importing ||
              analyzing
            }
            className="inline-flex items-center space-x-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-md shadow-blue-500/20 transition disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            {importing ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Đang nhập vào hệ thống...</span>
              </>
            ) : (
              <>
                <Check className="w-4 h-4" />
                <span>
                  Xác nhận nạp{' '}
                  {previewData?.validCount ? `${previewData.validCount} tài liệu` : 'vào Kho Tri Thức'}
                </span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ImportKnowledgeModal;
