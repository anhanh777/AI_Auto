import dotenv from 'dotenv';
dotenv.config();

export const metaConfig = {
  verifyToken: process.env.META_VERIFY_TOKEN || 'my_verify_token',
  pageAccessToken: process.env.META_PAGE_ACCESS_TOKEN || '',
  appSecret: process.env.META_APP_SECRET || '',
  graphApiUrl: 'https://graph.facebook.com/v20.0'
};
