import express from 'express';
import bodyParser from 'body-parser';
import mongoose from 'mongoose';
import 'dotenv/config';
import cors from 'cors';
import dns from 'node:dns';

import adminRouter from './routes/adminRouter.js';
import candidateRouter from './routes/candidateRouter.js';

const app = express();

app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Use Cloudflare DNS for MongoDB SRV resolution
dns.setServers(['1.1.1.1']);

mongoose.connect(process.env.MONGO_URL)
    .then(() => {
        console.log("Connected to MongoDB");
    })
    .catch((err) => {
        console.error("MongoDB Connection failed:", err);
    });

app.use("/api/admin", adminRouter);
app.use("/api/candidate", candidateRouter);

app.listen(3000, () => {
    console.log("Server is running on port 3000");
});