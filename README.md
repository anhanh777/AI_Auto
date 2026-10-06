# AI_Auto - Hệ Thống Tự Động Hóa Tư Vấn Bán Hàng Online Ứng Dụng AI

Đồ án tốt nghiệp ngành Công nghệ Thông tin - Trường Đại học Công nghệ Giao thông Vận tải (UTT).

## 📌 Giới thiệu dự án
Hệ thống tự động hóa tư vấn bán hàng online tích hợp trí tuệ nhân tạo (Generative AI - Google Gemini 1.5) đa kênh (Facebook Fanpage Messenger, Web Livechat), hỗ trợ tra cứu sản phẩm thông minh (RAG), tự động trích xuất thông tin đơn hàng từ hội thoại (Chat-to-Order) và hỗ trợ nhân viên tư vấn tiếp quản (Takeover).

## 🛠 Công nghệ sử dụng
- **Backend (`backed/`)**: Node.js, Express.js (JavaScript ES Modules), MongoDB (Mongoose ODM), Google Gemini 1.5 API, Socket.IO, JWT, Bcrypt.
- **Frontend (`frontend/`)**: React.js 18, Vite, Tailwind CSS, Lucide Icons, React Router DOM v6, Axios, Socket.io-client.

## 🚀 Hướng dẫn cài đặt và chạy hệ thống

### 1. Khởi chạy Backend
```bash
cd backed
npm install
npm run dev
```
Backend sẽ khởi chạy tại: `http://localhost:5000`

### 2. Khởi chạy Frontend
```bash
cd frontend
npm install
npm run dev
```
Frontend sẽ khởi chạy tại: `http://localhost:5173`
