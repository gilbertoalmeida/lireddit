import React from "react";
import { Flex, IconButton, Text } from "@chakra-ui/core";
import { PostSnippetFragment } from "../generated/graphql";

interface UpvoteSectionProps {
  post: PostSnippetFragment;
}

export const UpvoteSection: React.FC<UpvoteSectionProps> = ({ post }) => {
  return (
    <Flex direction="column" alignItems="center" mr="4">
      <IconButton aria-label="upvote post" icon="chevron-up" variant="ghost" />
      <Text lineHeight="0.7">{post.points}</Text>
      <IconButton
        aria-label="downvote post"
        icon="chevron-down"
        variant="ghost"
      />
    </Flex>
  );
};
