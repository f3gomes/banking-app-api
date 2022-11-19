import { Router } from "express";
import { PrismaClient } from "@prisma/client";
import { verifyJWT } from "../utils/auth";

const prisma = new PrismaClient();

export const getUsersRouter = Router();

getUsersRouter.get("/users", verifyJWT, async (req, res) => {
  const users = await prisma.users.findMany({
    select: {
      id: true,
      username: true,
      accountId: true,
    },
  });

  res.status(200).send({ users });
});
