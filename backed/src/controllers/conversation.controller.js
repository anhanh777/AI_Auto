import {
  getConversationsService,
  getMessagesService,
  sendMessageService,
  toggleBotActiveService
} from '../services/conversation.service.js';

export const getConversations = async (req, res, next) => {
  try {
    const { business_id, channel_id, search, tag } = req.query;
    const conversations = await getConversationsService({
      business_id: business_id || req.headers['x-business-id'],
      channel_id,
      search,
      tag
    });
    return res.status(200).json({
      success: true,
      data: conversations
    });
  } catch (error) {
    next(error);
  }
};

export const getMessages = async (req, res, next) => {
  try {
    const messages = await getMessagesService(req.params.id);
    return res.status(200).json({
      success: true,
      data: messages
    });
  } catch (error) {
    next(error);
  }
};

export const sendMessage = async (req, res, next) => {
  try {
    const message = await sendMessageService({
      conversation_id: req.params.id,
      sender_type: req.body.sender_type || 'STAFF',
      sender_id: req.user?._id,
      content: req.body.content,
      attachments: req.body.attachments || []
    });
    return res.status(201).json({
      success: true,
      data: message
    });
  } catch (error) {
    next(error);
  }
};

export const toggleBot = async (req, res, next) => {
  try {
    const conversation = await toggleBotActiveService(req.params.id);
    return res.status(200).json({
      success: true,
      data: conversation
    });
  } catch (error) {
    next(error);
  }
};
