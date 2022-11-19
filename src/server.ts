import bodyParser from "body-parser";
import express from "express";
import jwt from "jsonwebtoken";
import cors from "cors";

import { PrismaClient } from "@prisma/client";
import { validatePassord } from "./utils/auth";
import { helloRouter } from "./routes/hello";
import { getUsersRouter } from "./routes/getUsers";
import { getBalanceRouter } from "./routes/getBalance";
import { getTransactionsRouter } from "./routes/getTransactions";
import { postCashoutRouter } from "./routes/postCashout";
import { postUserRouter } from "./routes/postUsers";

const prisma = new PrismaClient();
const secret = String(process.env.JWT_SECRET);

const port = process.env.PORT || 3333;
const app = express();
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use(cors());

app.use(helloRouter);
app.use(getUsersRouter);
app.use(getBalanceRouter);
app.use(getTransactionsRouter);
app.use(postCashoutRouter);
app.use(postUserRouter);

app.post("/users/login", async (req, res) => {
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
        return res.status(400).send({ message: "Incorrect password!" });
      }
    }
  } else {
    return res.status(400).send({ message: "User not found!" });
  }
});

app.listen(port, () => {
  console.log("Online...");
});
