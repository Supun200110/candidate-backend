import express from "express";
import { loginUser, saveAdmin } from "../controllers/adminController.js";

const adminRouter = express.Router();

adminRouter.post("/",saveAdmin);
adminRouter.post('/login',loginUser)

export default adminRouter;