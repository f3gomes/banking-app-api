import { Router } from "express";
import { PrismaClient } from "@prisma/client";
import { verifyJWT } from "../utils/auth";
import jwt from "jsonwebtoken";

const prisma = new PrismaClient();

export const getBalanceRouter = Router();

getBalanceRouter.get("/balance", verifyJWT, async (req, res) => {
  const token = req.headers["authorization"];

  const userData = jwt.decode(token as string);

  const id = userData?.userId;

  const user = await prisma.users.findUnique({
    where: {
      id,
    },
  });

  if (!user) {
    res.status(401).send({ error: "User not auth!" });
  } else {
    const balance = await prisma.accounts.findUnique({
      select: {
        balance: true,
      },

      where: {
        id: user.accountId,
      },
    });

    res.status(200).send({ balance });
  }
});
