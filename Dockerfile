FROM node:20.19.1

WORKDIR /app
COPY package.json .
COPY yarn.lock .
RUN yarn
COPY . .

EXPOSE 3000
CMD ["yarn", "start"]
