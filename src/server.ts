import express from "express";
import bodyParser from "body-parser";
import { PrismaClient } from "@prisma/client";
import cors from "cors";

const prisma = new PrismaClient();

const port = process.env.PORT || 3333;
const app = express();
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use(cors());

app.get("/", (req, res) => {
  res.status(200).send({ message: "Hello NG Cash!" });
});

app.get("/users", async (req, res) => {
  const users = await prisma.users.findMany({
    select: {
      id: true,
      username: true,
      accountId: true,
    },
  });

  res.status(200).send({ users });
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

  if (password.length < 8) {
    return res
      .status(400)
      .send({ message: "Password field must have at least 8 characters!" });
  }

  if (alreadyExists) {
    return res.status(403).send({ message: "User already exists!" });
  } else {
    const newUser = await prisma.users.create({
      data: {
        username,
        password,
        accountId: newAccount.id,
      },
    });

    return res.status(201).send({ message: "User successfuly created!" });
  }
});

app.listen(port, () => {
  console.log("Online...");
});
