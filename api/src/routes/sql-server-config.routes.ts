import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { authorizeAdmin } from '../middleware/authorizeAdmin';
import {
  getConnections,
  addConnection,
  testConnection,
  updateConnection,
  deleteConnection,
  getConnection
} from '../controllers/sql-server-config.controller';

const router = Router();

// ყველა მარშრუტი საჭიროებს ავტორიზაციას და ადმინ უფლებებს
router.use(authenticate);
router.use((req, res, next) => authorizeAdmin(req, res, next));

// SQL Server კავშირების მართვა
router.get('/', getConnections);                    // ყველა კავშირის მიღება
router.post('/', addConnection);                    // ახალი კავშირის დამატება
router.get('/:id', getConnection);                  // კონკრეტული კავშირის მიღება
router.put('/:id', updateConnection);               // კავშირის განახლება
router.delete('/:id', deleteConnection);            // კავშირის წაშლა
router.post('/:id/test', testConnection);           // კავშირის ტესტირება

export { router as sqlServerConfigRouter };
