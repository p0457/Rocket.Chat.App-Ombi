# Rocket.Chat.App-Ombi

Interact with your Ombi Server.

## Configuration

### Channel for New Request Notifications
Channel (or Username) to send new request notifications to. Only works for items requested within the application context, and not from the website.

## Docker
A Dockerfile and docker-compose are provided.

Build the docker image and run it to deploy to your server:
`docker build -t rocketchatapp_ombi . && docker run -it --rm -e URL=YOUR_SERVER -e USERNAME=YOUR_USERNAME -e PASSWORD=YOUR_PASSWORD rocketchatapp_ombi`

Build the docker image and run docker-compose to deploy to your server:
`docker build -t rocketchatapp_ombi . && docker-compose run --rm -e URL=YOUR_SERVER -e USERNAME=YOUR_USERNAME -e PASSWORD=YOUR_PASSWORD rocketchatapp_ombi`