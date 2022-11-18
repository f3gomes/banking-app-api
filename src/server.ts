import express from "express";
import bodyParser from "body-parser";
import { PrismaClient } from "@prisma/client";
import cors from "cors";
import jwt from "jsonwebtoken";
import { createPassword, validatePassord, verifyJWT } from "./utils/auth";

const prisma = new PrismaClient();
const secret = String(process.env.JWT_SECRET);

const port = process.env.PORT || 3333;
const app = express();
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use(cors());

app.get("/", (req, res) => {
  res.status(200).send({ message: "Hello NG Cash!" });
});

app.get("/users", verifyJWT, async (req, res) => {
  const users = await prisma.users.findMany({
    select: {
      id: true,
      username: true,
      accountId: true,
    },
  });

  res.status(200).send({ users });
});

app.get("/balance", verifyJWT, async (req, res) => {
  const token = req.headers["authorization"];

  const userData = jwt.decode(token as string);

  const id = userData?.userId;

  const user = await prisma.users.findUnique({
    where: {
      id,
    },
  });

  if (!user) {
    res.status(400).send({ message: "User not found!" });
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

app.get("/transactions", verifyJWT, async (req, res) => {
  const token = req.headers["authorization"];

  const userData = jwt.decode(token as string);
  const id = userData?.userId;

  const user = await prisma.users.findUnique({
    where: {
      id,
    },
  });

  if (!user) {
    return res.status(400).send({ message: "User not found!" });
  } else {
    const debitedAccount = await prisma.transactions.findFirst({
      select: {
        debitedAccountId: true,
      },

      where: {
        debitedAccountId: user.accountId,
      },
    });

    const creditedAccount = await prisma.transactions.findFirst({
      select: {
        creditedAccountId: true,
      },

      where: {
        creditedAccountId: user.accountId,
      },
    });

    if (debitedAccount || creditedAccount) {
      const transaction = await prisma.transactions.findFirst({
        where: {
          OR: [
            { creditedAccountId: creditedAccount?.creditedAccountId },
            { debitedAccountId: debitedAccount?.debitedAccountId },
          ],
        },
      });

      return res.status(200).send({ transaction });
    } else {
      return res.status(400).send({ error: "No transactions found!" });
    }
  }
});

app.post("/cashout", verifyJWT, async (req, res) => {
  const token = req.headers["authorization"];
  const { userCashIn, amount } = req.body;

  const userData = jwt.decode(token as string);
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
      return res.status(400).send({ error: "User not found!" });
    } else {
      const balance = await prisma.accounts.findUnique({
        select: {
          balance: true,
        },

        where: {
          id: userAuth.accountId,
        },
      });

      if (balance?.balance < amount) {
        return res.status(400).send({ error: "Insuficient funds!" });
      } else {
        await prisma.accounts.update({
          data: {
            balance: balance?.balance - amount,
          },
          where: {
            id: userAuth.accountId,
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
