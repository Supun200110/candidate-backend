import multer from 'multer';

// Use memory storage so we have file.buffer ready to stream to Supabase
const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
    // Only accept image files
    if (file.mimetype.startsWith('image/')) {
        cb(null, true);
    } else {
        cb(new Error(`Invalid file type: ${file.mimetype}. Only image files are allowed.`), false);
    }
};

const upload = multer({
    storage,
    limits: {
        fileSize: 5 * 1024 * 1024 // 5 MB per file limit
    },
    fileFilter
});

// Multer fields middleware accepting candidate image and party symbol
const multerFieldsMiddleware = upload.fields([
    { name: 'candidateImage', maxCount: 1 },
    { name: 'candidatePhoto', maxCount: 1 },
    { name: 'partySymbol', maxCount: 1 },
    { name: 'symbolImage', maxCount: 1 }
]);

// Wrapper middleware to gracefully handle Multer errors (like size limit or unexpected fields)
export const uploadCandidateImages = (req, res, next) => {
    multerFieldsMiddleware(req, res, (err) => {
        if (err instanceof multer.MulterError) {
            if (err.code === 'LIMIT_FILE_SIZE') {
                return res.status(400).json({
                    message: "File is too large. Maximum allowed size is 5MB per image."
                });
            }
            return res.status(400).json({
                message: `Upload error: ${err.message}`
            });
        } else if (err) {
            return res.status(400).json({
                message: err.message
            });
        }
        next();
    });
};

export default uploadCandidateImages;
