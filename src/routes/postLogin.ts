import { Router } from "express";
import { PrismaClient } from "@prisma/client";
import { validatePassord } from "../utils/auth";
import jwt from "jsonwebtoken";

const secret = String(process.env.JWT_SECRET);

const prisma = new PrismaClient();

export const postLoginRouter = Router();

postLoginRouter.post("/users/login", async (req, res) => {
  const { username, password } = req.body;

  const matchUser = await prisma.users.findFirst({
    where: {
      username,
    },
  });

  if (matchUser) {
    const hashPassword = await prisma.users.findFirst({
      select: {
        password: true,
      },

      where: {
        username,
      },
    });

    if (hashPassword) {
      const matchPassword = await validatePassord(
        password,
        String(hashPassword.password)
      );

      if (matchPassword) {
        const token = jwt.sign({ userId: matchUser.id }, secret, {
          expiresIn: "24h",
        });
        return res.status(200).send({ auth: true, token });
      } else {
        return res.status(400).send({ error: "Incorrect password!" });
      }
    }
  } else {
    return res.status(400).send({ error: "User not found!" });
  }
});
