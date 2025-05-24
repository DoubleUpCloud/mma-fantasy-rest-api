import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";


const JWT_SECRET = process.env.JWT_SECRET || "secret";

declare module "express-serve-static-core" {
    interface Request {
        userId?: string;
    }
}

export const authenticateJWT = async (req: Request, res: Response, next: NextFunction) => {
    const token = req.cookies.token;

    if (!token) {
        return res.status(401).json({ error: "Token missing from cookies" });
    }

    try {
        const decoded = jwt.verify(token, JWT_SECRET) as jwt.JwtPayload;

        const userId = decoded.sub;

        if (!userId) {
            return res.status(403).json({ error: "Invalid token structure - missing sub" });
        }
        req.userId=userId;
        next();
    } catch (err) {
        return res.status(403).json({ error: "Token verification failed" });
    }
};
