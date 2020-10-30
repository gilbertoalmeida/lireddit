import React, { useState } from "react";
import { Flex, IconButton, Text } from "@chakra-ui/core";
import { PostSnippetFragment, useVoteMutation } from "../generated/graphql";

interface UpvoteSectionProps {
  post: PostSnippetFragment;
}

export const UpvoteSection: React.FC<UpvoteSectionProps> = ({ post }) => {
  const [loadingState, setLoadingState] = useState<"upvoting-loading" | "downvoting-loading" | "not-loading">("not-loading")
  const [, vote] = useVoteMutation()
  return (
    <Flex direction="column" alignItems="center" mr="4">
      <IconButton
        onClick={async () => {
          if (post.voteStatus === 1) {
            return
          }
          setLoadingState("upvoting-loading")
          await vote({
            postId: post.id,
            value: 1
          })
          setLoadingState("not-loading")
        }}
        variantColor={post.voteStatus === 1 ? "green" : undefined}
        isLoading={loadingState === "upvoting-loading"}
        aria-label="upvote post"
        icon="chevron-up"
        variant="link"
        isRound
      />
      <Text lineHeight="1.5">{post.points}</Text>
      <IconButton
        onClick={async () => {
          if (post.voteStatus === -1) {
            return
          }
          setLoadingState("downvoting-loading")
          await vote({
            postId: post.id,
            value: -1
          })
          setLoadingState("not-loading")
        }}
        variantColor={post.voteStatus === -1 ? "red" : undefined}
        isLoading={loadingState === "downvoting-loading"}
        aria-label="downvote post"
        icon="chevron-down"
        variant="link"
        isRound
      />
    </Flex>
  );
};
