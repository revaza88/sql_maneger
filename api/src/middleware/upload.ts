import multer from 'multer';
import * as path from 'path';
import * as fs from 'fs';

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Configure multer storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    // Generate unique filename with timestamp
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const extension = path.extname(file.originalname);
    const nameWithoutExt = path.basename(file.originalname, extension);
    
    const uniqueFilename = `${nameWithoutExt}_${timestamp}${extension}`;
    cb(null, uniqueFilename);
  }
});

// File filter to only allow .bak files
const fileFilter = (req: any, file: any, cb: any) => {
  if (file.originalname.toLowerCase().endsWith('.bak')) {
    cb(null, true);
  } else {
    cb(new Error('Only .bak files are allowed'), false);
  }
};

// Configure multer
export const uploadBackupFile = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 1024 * 1024 * 1024 * 5 // 5GB limit for backup files
  }
});
