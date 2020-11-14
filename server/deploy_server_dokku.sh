#! /bin/bash

echo Version number: 
read VERSION
echo $VERSION

docker build -t galmeidan/lireddit:$VERSION .
docker push galmeidan/lireddit:$VERSION
ssh root@167.99.241.131 "docker pull galmeidan/lireddit:$VERSION && docker tag galmeidan/lireddit:$VERSION dokku/api:$VERSION && dokku tags:deploy api $VERSION"

# yarn build
# heroku container:login
# heroku container:push --app=infinite-brook-75476 web
# heroku container:release --app=infinite-brook-75476 web