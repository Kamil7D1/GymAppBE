import { Router } from 'express';
import { requireAuth, requireTrainerRole } from '../middleware/auth';
import { createTemplate, getTrainerTemplates, useTemplateForClient } from '../controllers/workoutTemplateController';

const templateRouter = Router();
templateRouter.use(requireAuth);
templateRouter.use(requireTrainerRole);

templateRouter.post('/', createTemplate);
templateRouter.get('/', getTrainerTemplates);
templateRouter.post('/use', useTemplateForClient);

export { templateRouter };