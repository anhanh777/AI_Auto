import { Router } from 'express';
import {
  getChannels,
  createChannel,
  updateChannel,
  deleteChannel
} from '../controllers/channel.controller.js';
import { authenticate } from '../middlewares/auth.middleware.js';

const channelRouter = Router();

channelRouter.use(authenticate);

channelRouter.get('/', getChannels);
channelRouter.post('/', createChannel);
channelRouter.put('/:id', updateChannel);
channelRouter.delete('/:id', deleteChannel);

export default channelRouter;
