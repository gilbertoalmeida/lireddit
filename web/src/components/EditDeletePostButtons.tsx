import { Box, IconButton, Link } from '@chakra-ui/core';
import React from 'react'
import NextLink from "next/link";
import { useDeletePostMutation } from '../generated/graphql';


interface EditDeletePostButtonsProps {
  id: number
}

export const EditDeletePostButtons: React.FC<EditDeletePostButtonsProps> = ({ id }) => {
  const [, deletePost] = useDeletePostMutation()

  return (
    <Box>
      <NextLink href='/post/edit/[id]' as={`/post/edit/${id}`}>
        <IconButton as={Link} mr={2} aria-label="Edit Post" icon="edit" />
      </NextLink>

      <IconButton aria-label="Delete Post" icon="delete" onClick={() => {
        deletePost({ id })
      }} />
    </Box>
  );
}