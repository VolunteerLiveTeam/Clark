#!/bin/bash

#sudo docker-compose build && sudo docker-compose up -d
sudo docker build . -f Dockerfile -t localhost/hubot_discord
