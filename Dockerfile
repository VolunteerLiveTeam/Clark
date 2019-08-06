FROM node

ENV BOTDIR /opt/hubot

COPY . ${BOTDIR}
WORKDIR ${BOTDIR}
RUN npm install

CMD bin/hubot -a slack
