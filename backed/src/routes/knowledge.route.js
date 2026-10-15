import { Router } from 'express';
import {
  getKnowledgeList,
  getKnowledgeById,
  createKnowledge,
  updateKnowledge,
  deleteKnowledge,
  previewKnowledgeFile,
  importKnowledge,
  downloadKnowledgeTemplate
} from '../controllers/knowledge.controller.js';
import { authenticate } from '../middlewares/auth.middleware.js';
import { uploadMemory } from '../middlewares/upload.middleware.js';

const router = Router();

router.use(authenticate);

// Các route tĩnh cần đặt trước /:id
router.get('/template', downloadKnowledgeTemplate);
router.post('/preview-file', uploadMemory.single('file'), previewKnowledgeFile);
router.post('/import', uploadMemory.single('file'), importKnowledge);

router.get('/', getKnowledgeList);
router.post('/', createKnowledge);
router.get('/:id', getKnowledgeById);
router.put('/:id', updateKnowledge);
router.delete('/:id', deleteKnowledge);

export default router;

