import express from "express";

export const helloRouter = express.Router();

helloRouter.get("/", (req, res) => {
  return res.status(200).send({ message: "Hello API!" });
});
