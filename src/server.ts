import bodyParser from "body-parser";
import express from "express";
import jwt from "jsonwebtoken";
import cors from "cors";

import { PrismaClient } from "@prisma/client";
import { createPassword, validatePassord } from "./utils/auth";
import { helloRouter } from "./routes/hello";
import { getUsersRouter } from "./routes/getUsers";
import { getBalanceRouter } from "./routes/getBalance";
import { getTransactionsRouter } from "./routes/getTransactions";
import { postCashoutRouter } from "./routes/postCashout";

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

app.post("/users/new", async (req, res) => {
  const { username, password } = req.body;

  const newAccount = await prisma.accounts.create({
    data: {
      balance: 100.0,
    },
  });

  const alreadyExists = await prisma.users.findFirst({
    where: {
      username,
    },
  });

  if (username.length < 3) {
    return res
      .status(400)
      .send({ message: "Username field must have at least 3 characters!" });
  }

  if (password.length < 8) {
    return res
      .status(400)
      .send({ message: "Password field must have at least 8 characters!" });
  }

  if (alreadyExists) {
    return res.status(403).send({ message: "User already exists!" });
  } else {
    const pass = await createPassword(password);

    const newUser = await prisma.users.create({
      data: {
        username,
        password: pass,
        accountId: newAccount.id,
      },
    });

    return res.status(201).send({ message: "User successfuly created!" });
  }
});

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
