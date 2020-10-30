import { withUrqlClient } from "next-urql";
import { createUrqlClient } from "../utils/createUrqlClient";
import { usePostsQuery } from "../generated/graphql";
import { Layout } from "../components/Layout";
import NextLink from "next/link";
import { Link, Stack, Box, Heading, Text, Flex, Button } from "@chakra-ui/core";
import { useState } from "react";
import { UpvoteSection } from "../components/UpvoteSection";

const Index = () => {
  const [variables, setVariables] = useState({
    limit: 15,
    cursor: null as null | string
  });
  const [{ data, fetching }] = usePostsQuery({
    variables
  });

  if (!fetching && !data) {
    return <div>no data came from the query</div>;
  }

  return (
    <Layout>
      <Flex align="center">
        <Heading>LiReddit</Heading>
        <NextLink href="create-post">
          <Link ml="auto">create post</Link>
        </NextLink>
      </Flex>

      <br />
      <div>Fala parça!</div>
      <br />
      {!data && fetching ? (
        <div>loading...</div>
      ) : (
          <Stack spacing={8}>
            {/* the ! after data declares that we know it will be defined. So that typescript doesn't give us an error. And we know for sure because of all teh checks we did in the page. If it's not fetching and it is not defined, it will return something else above */}
            {data!.posts.postsArray.map(p => (
              <Flex key={p.id} p={5} shadow="md" borderWidth="1px">
                <UpvoteSection post={p} />
                <Box>
                  <Heading fontSize="xl">{p.title}</Heading>
                  <Text>Posted by {p.creator.username}</Text>
                  <Text mt={4}>
                    {p.textSnippet
                      .trim()
                      .concat(p.textSnippet.length === 50 ? "..." : "")}
                  </Text>{" "}
                  {/* getting the testSnippet here to not have to load the entire text of each post. The splice in the number of characters is done on the server. textSnippet is part of the Post resolver  */}
                </Box>
              </Flex>
            ))}
          </Stack>
        )}
      {data?.posts.hasMore ? (
        <Flex>
          <Button
            onClick={() => {
              setVariables({
                limit: variables.limit, //keeping the same previous limit
                cursor:
                  data.posts.postsArray[data.posts.postsArray.length - 1]
                    .createdAt //getting the data of the previous last post to know from where to get the limit number of more posts
              });
            }}
            isLoading={fetching}
            m="auto"
            my={8}
          >
            Load more
          </Button>
        </Flex>
      ) : null}
    </Layout>
  );
};

//ssr is server side rendering
export default withUrqlClient(createUrqlClient, { ssr: true })(Index);
