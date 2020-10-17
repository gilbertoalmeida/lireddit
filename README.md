# LIREDDIT

> Reddit clone - Tutorial from Ben

### Server:

```bash

#Compiling the typescript code into javascript in dist on every save:
yarn watch

#Run the javascript inside dist on localhost:4000:
yarn dev

#Starting redis server
redis-server

#Create a new database and change it on /src/index.ts (A default user and password is there too)
createdb NAME

```

### Web:

```bash

#Run the frontend on localhost:3000:
yarn dev

#Generate types for the mutations and queries added to graphql folder
yarn gen

```
