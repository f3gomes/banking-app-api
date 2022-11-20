FROM node:16-alpine3.15

WORKDIR /usr/src/server

COPY ["package.json", "package-lock.json", "tsconfig.json", ".env", "./"]
COPY prisma ./prisma/

COPY ./src ./src

RUN npm install

RUN npx prisma generate

CMD npm run dev
