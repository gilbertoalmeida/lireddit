#! /bin/bash
yarn build
heroku container:login
heroku container:push --app=infinite-brook-75476 web
heroku container:release --app=infinite-brook-75476 web