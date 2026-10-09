import { Router } from 'express';
import {
  getKnowledgeList,
  getKnowledgeById,
  createKnowledge,
  updateKnowledge,
  deleteKnowledge
} from '../controllers/knowledge.controller.js';
import { authenticate } from '../middlewares/auth.middleware.js';

const router = Router();

router.use(authenticate);

router.get('/', getKnowledgeList);
router.get('/:id', getKnowledgeById);
router.post('/', createKnowledge);
router.put('/:id', updateKnowledge);
router.delete('/:id', deleteKnowledge);

export default router;
