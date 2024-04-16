FROM node:18-alpine
RUN npm install -g pnpm 

WORKDIR /usr/app

ADD package.json pnpm-lock.yaml ./

RUN pnpm install

COPY . .

RUN pnpm build

CMD [ "pnpm", "start:prod" ]