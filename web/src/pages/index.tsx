import { withUrqlClient } from "next-urql";
import { createUrqlClient } from "../utils/createUrqlClient";
import { usePostsQuery } from "../generated/graphql";
import { Layout } from "../components/Layout";
import NextLink from "next/link";
import { Link, Stack, Box, Heading, Text, Flex, Button } from "@chakra-ui/core";

const Index = () => {
  const [{ data, fetching }] = usePostsQuery({
    variables: {
      limit: 10
    }
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
          {data!.posts.map(p => (
            <Box key={p.id} p={5} shadow="md" borderWidth="1px">
              <Heading fontSize="xl">{p.title}</Heading>
              <Text mt={4}>{p.textSnippet.trim() + "..."}</Text>{" "}
              {/* getting the testSnippet here to not have to load the entire text of each post. The splice in the number of characters is done on the server. textSnippet is part of the Post resolver  */}
            </Box>
          ))}
        </Stack>
      )}
      {data ? (
        <Flex>
          <Button m="auto" my={8}>
            Load more
          </Button>
        </Flex>
      ) : null}
    </Layout>
  );
};

//ssr is server side rendering
export default withUrqlClient(createUrqlClient, { ssr: true })(Index);
