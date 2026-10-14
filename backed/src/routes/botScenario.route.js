import { Router } from 'express';
import {
  getBotScenarios,
  getBotScenarioById,
  createBotScenario,
  updateBotScenario,
  toggleBotScenario,
  deleteBotScenario,
  testMatchScenario
} from '../controllers/botScenario.controller.js';
import { authenticate } from '../middlewares/auth.middleware.js';

const router = Router();

router.use(authenticate);

router.get('/', getBotScenarios);
router.post('/', createBotScenario);
router.post('/test-match', testMatchScenario);
router.get('/:id', getBotScenarioById);
router.put('/:id', updateBotScenario);
router.patch('/:id/toggle', toggleBotScenario);
router.delete('/:id', deleteBotScenario);

export default router;
