import { MiddlewareFn } from "type-graphql";
import { MyContext } from "src/types";

export const isAuth: MiddlewareFn<MyContext> = ({ context }, next) => {
  if (!context.req.session.userId) {
    throw new Error("user not authenticated"); //if I change this message, I have to change the check of the error message in the errorExchange of /web/src/utils/createUrqlClient.ts
  }

  return next();
};
