import { Router } from 'express';
import {
  getChannels,
  createChannel,
  updateChannel,
  deleteChannel,
  getFacebookPages,
  connectFacebookPage,
  syncChannelCustomers
} from '../controllers/channel.controller.js';
import { authenticate } from '../middlewares/auth.middleware.js';

const channelRouter = Router();

channelRouter.use(authenticate);

channelRouter.get('/', getChannels);
channelRouter.post('/facebook/pages', getFacebookPages);
channelRouter.post('/facebook/connect', connectFacebookPage);
channelRouter.post('/', createChannel);
channelRouter.post('/:id/sync-customers', syncChannelCustomers);
channelRouter.put('/:id', updateChannel);
channelRouter.delete('/:id', deleteChannel);

export default channelRouter;
