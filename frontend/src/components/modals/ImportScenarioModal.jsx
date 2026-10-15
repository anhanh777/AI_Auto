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
  Check
} from 'lucide-react';
import { botScenarioService } from '../../services/botScenario.service.js';
import { useToast } from '../../contexts/ToastContext.jsx';

const ImportScenarioModal = ({
  isOpen,
  onClose,
  businessId,
  channelId = null,
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
      const resData = await botScenarioService.downloadTemplate();
      const blob = resData instanceof Blob ? resData : new Blob([resData?.data || resData], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'Kich_Ban_Mau_AI_Sales.xlsx');
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      showToast('success', 'Đã tải file Excel mẫu về máy');
    } catch (err) {
      console.error(err);
      showToast('error', 'Không thể tải file mẫu: ' + (err.response?.data?.message || err.message));
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

      const res = await botScenarioService.previewScenarioFile(formData);
      setPreviewData(res.data?.data || res.data);
      showToast('success', 'Phân tích file thành công! Bạn có thể xem trước bên dưới.');
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
      if (channelId) formData.append('channel_id', channelId);
      formData.append('overwrite_mode', overwriteMode);

      const res = await botScenarioService.importScenarios(formData);
      const result = res.data?.data || res.data;

      const successMsg = `Nhập thành công ${result.successCount || 0} kịch bản mới${
        result.updatedCount ? `, cập nhật ${result.updatedCount} kịch bản cũ` : ''
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
        'Nhập kịch bản thất bại: ' + (err.response?.data?.message || err.message)
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

  const triggerTypeLabels = {
    KEYWORD_CONTAINS: { text: 'Chứa từ khóa', color: 'bg-blue-100 text-blue-700' },
    KEYWORD_EXACT: { text: 'Khớp chính xác', color: 'bg-purple-100 text-purple-700' },
    FIRST_MESSAGE: { text: 'Tin nhắn đầu', color: 'bg-emerald-100 text-emerald-700' },
    HANDOVER_KEYWORD: { text: 'Chuyển NV', color: 'bg-amber-100 text-amber-700' }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gradient-to-r from-blue-50/60 to-indigo-50/60">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-md shadow-blue-500/20">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900">Nhập kịch bản từ file Excel / CSV</h2>
              <p className="text-xs text-gray-500">
                Thêm hàng loạt kịch bản trả lời tự động chỉ với 1 file, không chứa ảnh
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-white/80 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          {/* Vùng tải file mẫu & Dropzone */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Hộp tải file mẫu */}
            <div className="md:col-span-1 border border-dashed border-gray-200 rounded-xl p-4 bg-gray-50/60 flex flex-col justify-between">
              <div>
                <div className="flex items-center space-x-2 text-blue-700 font-semibold text-sm mb-1">
                  <Download className="w-4 h-4" />
                  <span>File Excel mẫu chuẩn</span>
                </div>
                <p className="text-xs text-gray-500 leading-relaxed mb-3">
                  Tải file mẫu có sẵn cấu trúc cột và 3 kịch bản mẫu để điền thông tin nhanh chóng.
                </p>
              </div>
              <button
                type="button"
                onClick={handleDownloadTemplate}
                disabled={downloadingTemplate}
                className="w-full inline-flex items-center justify-center space-x-2 py-2 px-3 bg-white border border-blue-200 text-blue-700 hover:bg-blue-50 rounded-lg text-xs font-medium transition-colors shadow-sm disabled:opacity-50"
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
                  ? 'border-emerald-400 bg-emerald-50/30'
                  : 'border-gray-200 hover:border-blue-400 bg-white hover:bg-gray-50/50'
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
                  <p className="text-sm font-medium text-gray-700">Đang đọc và phân tích dữ liệu...</p>
                </div>
              ) : selectedFile ? (
                <div className="flex flex-col items-center space-y-2">
                  <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center">
                    <CheckCircle2 className="w-6 h-6" />
                  </div>
                  <div className="text-sm font-semibold text-gray-900">{selectedFile.name}</div>
                  <div className="text-xs text-gray-500">
                    {(selectedFile.size / 1024).toFixed(1)} KB • Bấm để chọn file khác
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center space-y-2">
                  <div className="w-12 h-12 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center">
                    <Upload className="w-6 h-6" />
                  </div>
                  <div className="text-sm font-semibold text-gray-800">
                    Kéo thả file vào đây hoặc <span className="text-blue-600 underline">chọn từ máy tính</span>
                  </div>
                  <p className="text-xs text-gray-400">Hỗ trợ các file định dạng: .xlsx, .xls, .csv</p>
                </div>
              )}
            </div>
          </div>

          {/* Bảng xem trước dữ liệu (Preview Table) */}
          {previewData && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <h3 className="text-sm font-bold text-gray-800">Bảng xem trước dữ liệu</h3>
                  <div className="flex items-center space-x-1.5 text-xs">
                    <span className="px-2 py-0.5 rounded-full bg-gray-100 text-gray-700 font-medium">
                      Tổng: {previewData.total}
                    </span>
                    <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-medium flex items-center space-x-1">
                      <Check className="w-3 h-3" />
                      <span>Hợp lệ: {previewData.validCount}</span>
                    </span>
                    {previewData.invalidCount > 0 && (
                      <span className="px-2 py-0.5 rounded-full bg-red-100 text-red-800 font-medium flex items-center space-x-1">
                        <AlertCircle className="w-3 h-3" />
                        <span>Lỗi: {previewData.invalidCount}</span>
                      </span>
                    )}
                  </div>
                </div>

                {/* Tùy chọn xử lý trùng lặp */}
                <div className="flex items-center space-x-4 text-xs text-gray-600">
                  <span className="font-medium text-gray-700">Khi trùng tên kịch bản:</span>
                  <label className="inline-flex items-center space-x-1 cursor-pointer">
                    <input
                      type="radio"
                      name="overwriteMode"
                      value="SKIP"
                      checked={overwriteMode === 'SKIP'}
                      onChange={() => setOverwriteMode('SKIP')}
                      className="text-blue-600 focus:ring-blue-500"
                    />
                    <span>Bỏ qua</span>
                  </label>
                  <label className="inline-flex items-center space-x-1 cursor-pointer">
                    <input
                      type="radio"
                      name="overwriteMode"
                      value="OVERWRITE"
                      checked={overwriteMode === 'OVERWRITE'}
                      onChange={() => setOverwriteMode('OVERWRITE')}
                      className="text-blue-600 focus:ring-blue-500"
                    />
                    <span>Ghi đè nội dung mới</span>
                  </label>
                </div>
              </div>

              {/* Bảng nội dung */}
              <div className="border border-gray-200 rounded-xl overflow-hidden max-h-60 overflow-y-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-gray-50 text-gray-600 uppercase font-semibold text-[11px] sticky top-0 z-10 border-b border-gray-200">
                    <tr>
                      <th className="px-3 py-2">Dòng</th>
                      <th className="px-3 py-2">Trạng thái</th>
                      <th className="px-3 py-2">Tên kịch bản</th>
                      <th className="px-3 py-2">Loại kích hoạt</th>
                      <th className="px-3 py-2">Từ khóa</th>
                      <th className="px-3 py-2">Nội dung phản hồi</th>
                      <th className="px-3 py-2 text-center">Ưu tiên</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {previewData.rows?.map((row, idx) => (
                      <tr
                        key={idx}
                        className={row.isValid ? 'hover:bg-gray-50/60' : 'bg-red-50/40 hover:bg-red-50/70'}
                      >
                        <td className="px-3 py-2.5 font-mono text-gray-500">{row.row_index}</td>
                        <td className="px-3 py-2.5 whitespace-nowrap">
                          {row.isValid ? (
                            <span className="inline-flex items-center text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded text-[11px] font-medium border border-emerald-200">
                              Hợp lệ
                            </span>
                          ) : (
                            <span
                              title={row.errors?.join(', ')}
                              className="inline-flex items-center text-red-700 bg-red-50 px-2 py-0.5 rounded text-[11px] font-medium border border-red-200 cursor-help"
                            >
                              {row.errors?.[0] || 'Lỗi dữ liệu'}
                            </span>
                          )}
                        </td>
                        <td className="px-3 py-2.5 font-semibold text-gray-900 whitespace-nowrap">
                          {row.scenario_name || <span className="text-red-400 italic">Trống</span>}
                        </td>
                        <td className="px-3 py-2.5 whitespace-nowrap">
                          <span
                            className={`px-2 py-0.5 rounded text-[11px] font-medium ${
                              triggerTypeLabels[row.trigger_type]?.color || 'bg-gray-100 text-gray-700'
                            }`}
                          >
                            {triggerTypeLabels[row.trigger_type]?.text || row.trigger_type}
                          </span>
                        </td>
                        <td className="px-3 py-2.5 max-w-xs truncate text-gray-600" title={row.keywords?.join(', ')}>
                          {row.keywords?.length > 0 ? (
                            row.keywords.join(', ')
                          ) : (
                            <span className="text-gray-400 italic">Không có</span>
                          )}
                        </td>
                        <td
                          className="px-3 py-2.5 max-w-sm truncate text-gray-700 font-mono text-[11px]"
                          title={row.response_content}
                        >
                          {row.response_content || <span className="text-gray-400 italic">Trống</span>}
                        </td>
                        <td className="px-3 py-2.5 text-center font-mono text-gray-600">{row.priority}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 border-t border-gray-100 bg-gray-50/60 flex items-center justify-between">
          <div className="text-xs text-gray-500 flex items-center space-x-1">
            <HelpCircle className="w-3.5 h-3.5 text-gray-400" />
            <span>Chỉ những dòng hợp lệ mới được lưu vào CSDL</span>
          </div>

          <div className="flex items-center space-x-3">
            <button
              type="button"
              onClick={handleClose}
              disabled={importing}
              className="px-4 py-2 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              Hủy bỏ
            </button>
            <button
              type="button"
              onClick={handleConfirmImport}
              disabled={!previewData || previewData.validCount === 0 || importing}
              className="inline-flex items-center space-x-2 px-5 py-2 text-xs font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors shadow-md shadow-blue-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {importing ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Đang nhập dữ liệu...</span>
                </>
              ) : (
                <>
                  <Upload className="w-3.5 h-3.5" />
                  <span>
                    Xác nhận nhập {previewData ? `(${previewData.validCount} kịch bản)` : ''}
                  </span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ImportScenarioModal;
