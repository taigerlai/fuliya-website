const multer = require('multer');
const sharp = require('sharp');
const path = require('path');
const fs = require('fs');
const { UPLOAD_DIR, MAX_FILE_SIZE } = require('../config');

// Ensure upload dir exists
const uploadPath = path.resolve(__dirname, '..', UPLOAD_DIR);
if (!fs.existsSync(uploadPath)) {
  fs.mkdirSync(uploadPath, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadPath),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const name = Date.now() + '-' + Math.random().toString(36).slice(2, 8) + ext;
    cb(null, name);
  }
});

const fileFilter = (req, file, cb) => {
  const allowed = ['.jpg', '.jpeg', '.png', '.webp', '.gif'];
  const ext = path.extname(file.originalname).toLowerCase();
  if (allowed.includes(ext)) {
    cb(null, true);
  } else {
    cb(new Error('仅支持 jpg/png/webp/gif 格式'));
  }
};

const upload = multer({ storage, fileFilter, limits: { fileSize: MAX_FILE_SIZE } });

// Upload single
const uploadSingle = upload.single('file');

// Upload multiple
const uploadArray = upload.array('files', 10);

// Process image: convert to webp
async function toWebp(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  if (ext === '.webp' || ext === '.gif') return;
  const webpPath = filePath.replace(ext, '.webp');
  await sharp(filePath).webp({ quality: 80 }).toFile(webpPath);
  // Remove original if webp created
  if (fs.existsSync(webpPath)) {
    fs.unlinkSync(filePath);
  }
}

module.exports = { upload, uploadSingle, uploadArray, toWebp };
