import jwt from "jsonwebtoken";
import dotenv from "dotenv";
dotenv.config();

export default function verifyJWT(req, res, next) {
    const header = req.header("Authorization");

    if (!header) {
        return res.status(401).json({ message: "Access denied. No token provided." });
    }

    const token = header.replace("Bearer ", "");

    jwt.verify(token, process.env.JWT_KEY, (err, decoded) => {
        if (err) {
            return res.status(403).json({ message: "Invalid token." });
        }

        req.user = decoded;
        next();
    });
}