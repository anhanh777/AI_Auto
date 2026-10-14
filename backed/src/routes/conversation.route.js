import { Router } from 'express';
import {
  getConversations,
  getMessages,
  sendMessage,
  toggleBot,
  updateConversationTags
} from '../controllers/conversation.controller.js';
import { authenticate } from '../middlewares/auth.middleware.js';

const conversationRouter = Router();

conversationRouter.use(authenticate);

conversationRouter.get('/', getConversations);
conversationRouter.get('/:id/messages', getMessages);
conversationRouter.post('/:id/messages', sendMessage);
conversationRouter.patch('/:id/toggle-bot', toggleBot);
conversationRouter.patch('/:id/tags', updateConversationTags);

export default conversationRouter;
