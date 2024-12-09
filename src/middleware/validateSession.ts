import {RequestHandler} from "express";

export const validateSessionDate: RequestHandler = (req, res, next) => {
    const sessionDate = new Date(req.body.date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (sessionDate <= today) {
        res.status(400).json({ error: "Cannot create sessions for today or past dates" });
        return;
    }
    next();
};