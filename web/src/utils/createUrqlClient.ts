import { cacheExchange, Resolver } from "@urql/exchange-graphcache";
import {
  dedupExchange,
  Exchange,
  fetchExchange,
  stringifyVariables
} from "urql";
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

const cursorPagination = (): Resolver => {
  //it's a function that returns a resolver

  return (_parent, fieldArgs, cache, info) => {
    const { parentKey: entityKey, fieldName } = info; //using this in the posts of the index page, entityKey is Query and fieldName is posts

    const allFields = cache.inspectFields(entityKey); //gets all the Queries in the cache
    const fieldInfos = allFields.filter(info => info.fieldName === fieldName); //then filters all teh queries to only the one we are interested: posts in the example of the index page
    const size = fieldInfos.length;
    if (size === 0) {
      return undefined;
    }

    //fieldArgs is what we pass as the variables of the Query. In teh posts example it's the limit and the cursor. I can see it in index.tsx. Limit is always the same, but I am changing cursor with useState to have the createdAt of the last post, so we know from where to fetch more posts

    const fieldKey = `${fieldName}(${stringifyVariables(fieldArgs)})`;
    const isItInTheCache = cache.resolve(
      cache.resolveFieldByKey(entityKey, fieldKey) as string,
      "posts"
    ); //it will have the posts on the first run, but when we click load more it will return null, so we will use this null to set partial to true on the next line
    info.partial = !isItInTheCache; //setting partial to true when pressing load more tells thatwe have a partial return from the cache (which are the first posts) so it's going to fetch more data from the server and combine it below (push it into a single result)

    let hasMore = true;
    const results: string[] = [];
    fieldInfos.forEach(fi => {
      const key = cache.resolveFieldByKey(entityKey, fi.fieldKey) as string; //from the query, get posts on this fieldkey: e.g. posts({"limit": 10})
      const data = cache.resolve(key, "postsArray") as string[]; //from the query, get posts on this fieldkey: e.g. posts({"limit": 10})
      const _hasMore = cache.resolve(key, "hasMore"); //from the query, get posts on this fieldkey: e.g. posts({"limit": 10})
      if (!_hasMore) {
        hasMore = _hasMore as boolean;
      }
      results.push(...data);
    });

    return {
      __typename: "PaginatedPosts",
      hasMore,
      postsArray: results
    };

    /* const visited = new Set();
    let result: NullArray<string> = [];
    let prevOffset: number | null = null;

    for (let i = 0; i < size; i++) {
      const { fieldKey, arguments: args } = fieldInfos[i];
      if (args === null || !compareArgs(fieldArgs, args)) {
        continue;
      }

      const links = cache.resolveFieldByKey(entityKey, fieldKey) as string[];
      const currentOffset = args[cursorArgument];

      if (
        links === null ||
        links.length === 0 ||
        typeof currentOffset !== "number"
      ) {
        continue;
      }

      if (!prevOffset || currentOffset > prevOffset) {
        for (let j = 0; j < links.length; j++) {
          const link = links[j];
          if (visited.has(link)) continue;
          result.push(link);
          visited.add(link);
        }
      } else {
        const tempResult: NullArray<string> = [];
        for (let j = 0; j < links.length; j++) {
          const link = links[j];
          if (visited.has(link)) continue;
          tempResult.push(link);
          visited.add(link);
        }
        result = [...tempResult, ...result];
      }

      prevOffset = currentOffset;
    }

    const hasCurrentPage = cache.resolve(entityKey, fieldName, fieldArgs);
    if (hasCurrentPage) {
      return result;
    } else if (!(info as any).store.schema) {
      return undefined;
    } else {
      info.partial = true;
      return result;
    } */
  };
};

export const createUrqlClient = (ssrExchange: any) => ({
  url: "http://localhost:4000/graphql",
  fetchOptions: {
    credentials: "include" as const
  },
  exchanges: [
    dedupExchange,
    cacheExchange({
      keys: {
        PaginatedPosts: () => null
      },
      resolvers: {
        //client side resolvers, they run when the queries run and we can alter how the query result looks
        Query: {
          posts: cursorPagination()
        }
      },
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
