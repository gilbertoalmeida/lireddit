import "reflect-metadata";
import "dotenv-safe/config";
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
import { createUserLoader } from "./Utils/createUserLoader";
import { createUpvoteLoader } from "./Utils/createUpvoteLoader";

const main = async () => {
  const conn = await createConnection({
    type: "postgres",
    url: process.env.DATABASE_URL,
    logging: true,
    synchronize: !__prod__, //creates the tables automaticaly and you don't have to run a migration. We don't want it in prod, bc we want to be specific about the tables
    migrations: [path.join(__dirname, "./migrations/*")],
    entities: [Post, User, Upvote]
  });

  await conn.runMigrations();

  //deleting all posts. Before running this put synchronize to false (because probably you want to delete all of one entity because of some new collumns created. And what is crashing is synchronization)
  //await Post.delete({});

  const app = express();

  const RedisStore = connectRedis(session);
  const redis = new Redis(process.env.REDIS_URL);
  app.set("trust proxy", 1)

  app.use(
    cors({
      origin: process.env.CORS_ORIGIN,
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
        secure: __prod__, // If in prod, cookie only works in https
        domain: __prod__ ? ".cribswap.de" : undefined //just add this line with your real domain if you have problems with cookie redirects
      },
      saveUninitialized: false, // don't create a cookie for the user until we store some data on the session (login successful of login resolver)
      secret: process.env.SESSION_SECRET,
      resave: false // doesn't resave the session everytime the server is hit with a request
    })
  );

  const apolloServer = new ApolloServer({
    schema: await buildSchema({
      resolvers: [HelloResolver, PostResolver, UserResolver],
      validate: false
    }),
    context: ({ req, res }) => ({
      //context is an object available to all resolvers. Everything I pass here is available to the resolvers.
      //If I add things here, I have to update server/src/types.ts
      req,
      res,
      redis,
      userLoader: createUserLoader(), //runs on every request. So a new userLoader is created on every request. This batches and caches loading of users within a single request
      upvoteLoader: createUpvoteLoader()
    })
  });

  apolloServer.applyMiddleware({ app, cors: false }); //turning the default cors of appolo to false, we add our own

  app.listen(parseInt(process.env.PORT), () => {
    console.log("server started on localhost:4000");
  });
};

main().catch(err => {
  console.error(err);
});
