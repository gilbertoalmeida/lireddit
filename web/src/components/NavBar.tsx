import React from "react";
import { Box, Link, Flex, Button } from "@chakra-ui/core";
import NextLink from "next/link";
import { useMeQuery, useLogoutMutation } from "../generated/graphql";
import { isServer } from "../utils/isServer";
//NextLink uses client side routering, which is the purpose we are using instead of normal anchors

interface NavBarProps { }

export const NavBar: React.FC<NavBarProps> = ({ }) => {
  const [{ fetching: logoutFetching }, logout] = useLogoutMutation();
  const [{ data, fetching }] = useMeQuery({
    // this pause makes the query not run. The intention here is not run it if we are on server side rendering, bc having the user in the navbar is not useful for google searches. And we don't want this query happening in the server when we do ssr. It would return null anyway because it won't have a cookie in the server
    pause: isServer() // now we are actually sending the cookie on ssr too. check headers in createUrqlClient. So we could take this off if we wanted the me query to run on the server too. But not necessary.
  });

  let body = null;

  if (fetching) {
    //data is loading, body can stay null
  } else if (!data?.me) {
    body = (
      <>
        <NextLink href="/login">
          <Link color="white" mr={2}>
            login
          </Link>
        </NextLink>
        <NextLink href="/register">
          <Link color="white">register</Link>
        </NextLink>
      </>
    );
  } else {
    body = (
      <Flex>
        <Box color="white" mr={2}>
          {data.me.username}
        </Box>
        <Button
          onClick={() => {
            logout();
          }}
          isLoading={logoutFetching}
          variant="link"
          color="black"
        >
          logout
        </Button>
      </Flex>
    );
  }

  return (
    <Flex position="sticky" top={0} zIndex={1} bg="tan" p={4}>
      <Box ml={"auto"}>{body}</Box>
    </Flex>
  );
};
