FROM node:7.4-alpine

ENV DEEPSTREAM_AUTH_ROLE=provider \
    DEEPSTREAM_AUTH_USERNAME=admin-service

RUN mkdir /usr/local/admin
WORKDIR /usr/local/admin
COPY . /usr/local/admin
RUN npm install
RUN npm run build

CMD [ "npm", "run", "start-prod"]
