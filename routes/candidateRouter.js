import express from "express";
import {
    saveCandidate,
    getCandidates,
    getCandidateById,
    verifyCandidate
} from "../controllers/candidateController.js";

import verifyJWT from "../middleware/auth.js";

const candidateRouter = express.Router();

// Candidate registration
candidateRouter.post('/', verifyJWT, saveCandidate);

// Election officer verification
candidateRouter.get('/', verifyJWT, getCandidates);
candidateRouter.get('/:id', verifyJWT, getCandidateById);
candidateRouter.patch('/:id/verify', verifyJWT, verifyCandidate);

export default candidateRouter;
