/**
 * Facebook JavaScript SDK Loader & Helper
 * Hỗ trợ xác thực Meta OAuth 2.0 và quản lý kết nối Fanpage
 */

let fbInitPromise = null;

export const initFacebookSdk = (appId) => {
  if (fbInitPromise) return fbInitPromise;

  fbInitPromise = new Promise((resolve, reject) => {
    if (window.FB) {
      if (appId) {
        window.FB.init({
          appId,
          cookie: true,
          xfbml: true,
          version: 'v21.0'
        });
      }
      return resolve(window.FB);
    }

    window.fbAsyncInit = function () {
      window.FB.init({
        appId: appId || '1234567890', // Sẽ được cập nhật khi người dùng cung cấp
        cookie: true,
        xfbml: true,
        version: 'v21.0'
      });
      resolve(window.FB);
    };

    // Load SDK script
    const existingScript = document.getElementById('facebook-jssdk');
    if (existingScript) {
      return resolve(window.FB);
    }

    const script = document.createElement('script');
    script.id = 'facebook-jssdk';
    script.src = 'https://connect.facebook.net/vi_VN/sdk.js';
    script.async = true;
    script.defer = true;
    script.onerror = () => reject(new Error('Không thể tải Facebook JavaScript SDK'));
    document.body.appendChild(script);
  });

  return fbInitPromise;
};

/**
 * Mở cửa sổ Facebook Login để xin quyền quản lý Fanpage
 */
export const loginWithFacebook = async (appId, scopes = 'pages_show_list,pages_messaging,pages_manage_metadata,pages_read_engagement') => {
  if (!appId) {
    throw new Error('Vui lòng cung cấp Facebook App ID để thực hiện đăng nhập');
  }

  // Khởi tạo SDK nếu chưa có
  await initFacebookSdk(appId);

  // Đảm bảo window.FB được cấu hình lại với đúng appId mới nhất
  if (window.FB) {
    window.FB.init({
      appId,
      cookie: true,
      xfbml: true,
      version: 'v21.0'
    });
  }

  return new Promise((resolve, reject) => {
    if (!window.FB) {
      return reject(new Error('Facebook SDK chưa sẵn sàng. Vui lòng thử lại.'));
    }

    window.FB.login(
      (response) => {
        if (response.authResponse) {
          resolve({
            success: true,
            accessToken: response.authResponse.accessToken,
            userID: response.authResponse.userID,
            grantedScopes: response.authResponse.grantedScopes
          });
        } else {
          // Người dùng hủy hoặc đóng popup
          reject(new Error(response.status === 'not_authorized' ? 'Tài khoản chưa cấp quyền truy cập' : 'Đăng nhập Facebook bị hủy bỏ'));
        }
      },
      {
        scope: scopes,
        return_scopes: true
      }
    );
  });
};
