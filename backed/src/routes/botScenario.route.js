import { Router } from 'express';
import {
  getBotScenarios,
  getBotScenarioById,
  createBotScenario,
  updateBotScenario,
  toggleBotScenario,
  deleteBotScenario,
  testMatchScenario,
  previewScenarioFile,
  importBotScenarios,
  downloadScenarioTemplate,
  exportBotScenarios
} from '../controllers/botScenario.controller.js';
import { authenticate } from '../middlewares/auth.middleware.js';
import { uploadMemory } from '../middlewares/upload.middleware.js';

const router = Router();

router.use(authenticate);

// Các route tĩnh cần đặt trước /:id
router.get('/template', downloadScenarioTemplate);
router.get('/export', exportBotScenarios);
router.post('/preview-file', uploadMemory.single('file'), previewScenarioFile);
router.post('/import', uploadMemory.single('file'), importBotScenarios);
router.post('/test-match', testMatchScenario);

router.get('/', getBotScenarios);
router.post('/', createBotScenario);
router.get('/:id', getBotScenarioById);
router.put('/:id', updateBotScenario);
router.patch('/:id/toggle', toggleBotScenario);
router.delete('/:id', deleteBotScenario);

export default router;
