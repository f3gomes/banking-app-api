import { Router } from "express";
import { PrismaClient } from "@prisma/client";
import { verifyJWT } from "../utils/auth";
import jwt from "jsonwebtoken";

const prisma = new PrismaClient();

export const postCashoutRouter = Router();

postCashoutRouter.post("/cashout", verifyJWT, async (req, res) => {
  const token = req.headers["authorization"];
  const { userCashIn, amount } = req.body;

  const userData: any = jwt.decode(token as string);
  const id = userData?.userId;

  const userAuth = await prisma.users.findUnique({
    where: {
      id,
    },
  });

  const findUserid = await prisma.users.findFirst({
    select: {
      id: true,
    },

    where: {
      username: userCashIn,
    },
  });

  if (findUserid?.id === id) {
    return res.status(400).send({ error: "Transaction not allowed!" });
  } else {
    const accountIdCashIn = await prisma.users.findFirst({
      select: {
        accountId: true,
      },

      where: {
        username: userCashIn,
      },
    });

    if (!findUserid) {
      return res.status(400).send({ error: "User not auth!" });
    } else {
      const balance = await prisma.accounts.findUnique({
        select: {
          balance: true,
        },

        where: {
          id: userAuth?.accountId,
        },
      });

      if (balance!.balance < amount) {
        return res.status(400).send({ error: "Insuficient funds!" });
      } else {
        await prisma.accounts.update({
          data: {
            balance: balance!.balance - amount,
          },
          where: {
            id: userAuth?.accountId,
          },
        });

        await prisma.accounts.update({
          data: {
            balance: balance?.balance + amount,
          },
          where: {
            id: accountIdCashIn?.accountId,
          },
        });

        await prisma.transactions.create({
          data: {
            value: String(amount),
            creditedAccountId: String(accountIdCashIn?.accountId),
            debitedAccountId: String(userAuth?.accountId),
          },
        });

        return res.status(200).send({ message: "Transfer successfuly done!" });
      }
    }
  }
});
