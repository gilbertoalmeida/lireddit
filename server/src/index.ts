import "reflect-metadata";
import "dotenv/config";
import { __prod__, COOKIE_NAME } from "./constants";
import express from "express";
import { ApolloServer } from "apollo-server-express";
import { buildSchema } from "type-graphql";
import { HelloResolver } from "./resolvers/hello";
import { PostResolver } from "./resolvers/post";
import { UserResolver } from "./resolvers/user";
import Redis from "ioredis";
import session from "express-session";
import connectRedis from "connect-redis";
import cors from "cors";
import { createConnection } from "typeorm";
import { Post } from "./entities/Post";
import { User } from "./entities/User";
import path from "path";
import { Upvote } from "./entities/Upvote";

const main = async () => {
  const conn = await createConnection({
    type: "postgres",
    database: "lireddit2",
    username: "postgres",
    password: "postgres",
    logging: true,
    synchronize: true, //creates the tables automaticaly and you don't have to run a migration
    migrations: [path.join(__dirname, "./migrations/*")],
    entities: [Post, User, Upvote]
  });

  await conn.runMigrations();

  //deleting all posts. Before running this put synchronize to false (because probably you want to delete all of one entity because of some new collumns created. And what is crashing is synchronization)
  //await Post.delete({});

  const app = express();

  const RedisStore = connectRedis(session);
  const redis = new Redis();

  app.use(
    cors({
      origin: "http://localhost:3000",
      credentials: true
    })
  );

  //this order is important. The session middleware will run before the apollo one (which needs the first one)
  app.use(
    session({
      name: COOKIE_NAME, // the name of our cookie
      store: new RedisStore({
        client: redis,
        disableTouch: true // this would reset the time limit (of something that is stored in redis) with every touch (action) of the user. We are disabling to make less requests for now. Also, I guess he wants to use the approach that he will actively remove the session when he wants. So all this with ttl and touch is useless.
      }),
      cookie: {
        maxAge: 1000 * 60 * 60 * 24 * 365 * 10, // 10 years in miliseconds
        httpOnly: true, // in the javascript code in the frontend, you cannot access the cookie. (for security reasons)
        sameSite: "lax", // protecting csrf (Cross-site request forgery)
        secure: __prod__ // If in prod, cookie only works in https
      },
      saveUninitialized: false, // don't create a cookie for the user until we store some data on the session (login successful of login resolver)
      secret: process.env.SESSION_SECRET as string, //create environmental variable for this secret
      resave: false // doesn't resave the session everytime the server is hit with a request
    })
  );

  const apolloServer = new ApolloServer({
    schema: await buildSchema({
      resolvers: [HelloResolver, PostResolver, UserResolver]
      // validate: false
    }),
    context: ({ req, res }) => ({
      //context is an object available to all resolvers. Everything I pass here is available to the resolvers.
      //If I add things here, I have to update server/src/types.ts
      req,
      res,
      redis
    })
  });

  apolloServer.applyMiddleware({ app, cors: false }); //turning the default cors of appolo to false, we add our own

  app.listen(4000, () => {
    console.log("server started on localhost:4000");
  });
};

main().catch(err => {
  console.error(err);
});
