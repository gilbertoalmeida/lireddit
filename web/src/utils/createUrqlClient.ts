import { cacheExchange } from "@urql/exchange-graphcache";
import { dedupExchange, Exchange, fetchExchange } from "urql";
import { pipe, tap } from "wonka"; //comes with Urql
import {
  LoginMutation,
  LogoutMutation,
  MeDocument,
  MeQuery,
  RegisterMutation
} from "../generated/graphql";
import { betterUpdateQuery } from "./betterUpdateQuery";
import Router from "next/router";

//So, whenever I receive an error message that conteins that string, this will happen. This is happening in the whole application, for everything that happens.
//Ex.: creating a post gives back an error "user not authenticated" if not logged in, so this will redirect them to the login page.
const errorExchange: Exchange = ({ forward }) => ops$ => {
  return pipe(
    forward(ops$),
    tap(({ error }) => {
      if (error && error.message.includes("not authenticated")) {
        Router.replace("/login");
        //replace instead of push in the Router is to replace the current route in the history instead of pushing a new entry. It's usually what you wanna do, when you wanna redirect
        //Router is capital here because we are outside React and not using the hook, but the global router
      }
    })
  );
};

export const createUrqlClient = (ssrExchange: any) => ({
  url: "http://localhost:4000/graphql",
  fetchOptions: {
    credentials: "include" as const
  },
  exchanges: [
    dedupExchange,
    cacheExchange({
      updates: {
        Mutation: {
          //These things will run whenever the mutations cited here run. With the intent of updating the cache and avoiding things as, user being kept visually not logged in by the behavior of the ui, because urql didn#t update the cache by itself.

          logout: (_result, args, cache, info) => {
            betterUpdateQuery<LogoutMutation, MeQuery>( //updating the MeQuery to show me:null, when Logout Mutation runs.
              cache,
              { query: MeDocument },
              _result,
              () => ({ me: null })
            );
          },

          login: (_result, args, cache, info) => {
            betterUpdateQuery<LoginMutation, MeQuery>( //updating the MeQuery, when LoginMutation runs, and putting the result.login.user there
              cache,
              { query: MeDocument },
              _result,
              (result, query) => {
                if (result.login.errors) {
                  return query;
                } else {
                  return {
                    me: result.login.user
                  };
                }
              }
            );
          },

          register: (_result, args, cache, info) => {
            betterUpdateQuery<RegisterMutation, MeQuery>(
              cache,
              { query: MeDocument },
              _result,
              (result, query) => {
                if (result.register.errors) {
                  return query;
                } else {
                  return {
                    me: result.register.user
                  };
                }
              }
            );
          }
        }
      }
    }),
    errorExchange,
    ssrExchange,
    fetchExchange
  ]
});
