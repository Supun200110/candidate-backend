import express from "express";
import {
    saveCandidate,
    getCandidates,
    getCandidateById,
    verifyCandidate,
    uploadCandidateImagesHandler,
    updateCandidateImages
} from "../controllers/candidateController.js";

import verifyJWT from "../middleware/auth.js";
import uploadCandidateImages from "../middleware/upload.js";

const candidateRouter = express.Router();

// Upload candidate image and/or party symbol to Supabase
// (optionally attaches to a candidate if candidateId is provided)
candidateRouter.post('/upload', verifyJWT, uploadCandidateImages, uploadCandidateImagesHandler);

// Candidate registration (accepts multipart/form-data with files OR JSON with image URLs)
candidateRouter.post('/', verifyJWT, uploadCandidateImages, saveCandidate);

// Update images for an existing candidate by candidateId
candidateRouter.patch('/:id/images', verifyJWT, uploadCandidateImages, updateCandidateImages);

// Election officer verification & lookup
candidateRouter.get('/', verifyJWT, getCandidates);
candidateRouter.get('/:id', verifyJWT, getCandidateById);
candidateRouter.patch('/:id/verify', verifyJWT, verifyCandidate);

export default candidateRouter;
