import { Request, Response, NextFunction } from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

const secret = String(process.env.JWT_SECRET);

export const createPassword = async (password: string) => {
  const saltRounds = 10;
  const hashPassword = await bcrypt.hash(password, saltRounds);

  return String(hashPassword);
};

export const validatePassord = async (
  password: string,
  hashPassword: string
) => {
  const isMatch = await bcrypt.compare(password, hashPassword);

  return isMatch;
};

export const verifyJWT = (req: Request, res: Response, next: NextFunction) => {
  const token = req.headers["authorization"];
  jwt.verify(String(token), secret, (err) => {
    if (err) {
      return res.status(401).end();
    } else {
      next();
    }
  });
};
