import React from "react";
import { withUrqlClient } from "next-urql";
import { Layout } from "../../components/Layout";
import { createUrqlClient } from "../../utils/createUrqlClient";
import { Box, Flex, Heading } from "@chakra-ui/core";
import { useGetPostFromUrl } from "../../utils/useGetPostFromURL";
import { EditDeletePostButtons } from "../../components/EditDeletePostButtons";
import { useMeQuery } from "../../generated/graphql";


export const Post = ({ }) => {
  const [{ data, fetching }] = useGetPostFromUrl()

  const [{ data: meData }] = useMeQuery();



  if (fetching) {
    return (
      <Layout>
        <div>loading...</div>
      </Layout>
    )
  }

  if (!data?.post) {
    return (
      <Layout>
        <Heading>Could not find post</Heading>
      </Layout>
    )
  }

  return (
    <Layout>
      <Flex>
        <Heading mb={4}>{data.post.title}</Heading>
        {meData?.me?.id === data.post.creator.id ?
          <Box ml="auto">
            <EditDeletePostButtons id={data.post.id} />
          </Box>
          : null}
      </Flex>
      {data.post.text}
    </Layout>
  )
};

export default withUrqlClient(createUrqlClient, { ssr: true })(Post);
