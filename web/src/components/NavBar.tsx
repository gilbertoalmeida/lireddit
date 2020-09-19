import React from "react";
import { Box, Link, Flex, Button } from "@chakra-ui/core";
import NextLink from "next/link";
import { useMeQuery } from "../generated/graphql";
//NextLink uses client side routering, which is the purpose we are using instead of normal anchors

interface NavBarProps {}

export const NavBar: React.FC<NavBarProps> = ({}) => {
  const [{ data, fetching }] = useMeQuery();
  let body = null;

  if (fetching) {
    console.log("fetching");
    //data is loading, body can stay null
  } else if (data && !data.me) {
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
  } else if (data && data.me) {
    body = (
      <Flex>
        <Box color="white" mr={2}>
          {data.me.username}
        </Box>
        <Button variant="link" color="black">
          logout
        </Button>
      </Flex>
    );
  }

  return (
    <Flex bg="tan" p={4}>
      <Box ml={"auto"}>{body}</Box>
    </Flex>
  );
};
