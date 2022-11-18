import express from "express";
import bodyParser from "body-parser";
import { PrismaClient } from "@prisma/client";
import cors from "cors";
import bcrypt, { hash } from "bcrypt";

const prisma = new PrismaClient();

const port = process.env.PORT || 3333;
const app = express();
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use(cors());

const createPassword = async (password: string) => {
  const saltRounds = 10;
  const hashPassword = await bcrypt.hash(password, saltRounds);

  return String(hashPassword);
};

const validatePassord = async (password: string, hashPassword: string) => {
  const isMatch = await bcrypt.compare(password, hashPassword);

  return isMatch;
};

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
        return res.status(201).send({ message: "Successfuly login!" });
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
