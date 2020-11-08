import DataLoader from "dataloader"
import { Upvote } from "../entities/Upvote"

//The difference between this and the one for the User is that here we need to know the ids of the user and of the post. So our keys here will be objects.
// id [{postId: 5, userId: 10}, {postId: 6, userId: 7}, {postId: 1, userId: 10}, {postId: 4, userId: 10}]
// return [{postId: 5, userId: 10, value: 1}, {postId: 5, userId: 10, value: 2}, ...]
// it might be null if there is no vote on the post
export const createUpvoteLoader = () => new DataLoader<{ postId: number, userId: number }, Upvote | null>(async keys => {
  const upvotes = await Upvote.findByIds(keys as any)
  const upvotesIdsToUpvote: Record<string, Upvote> = {}
  upvotes.forEach(upvote => {
    upvotesIdsToUpvote[`${upvote.userId}|${upvote.postId}`] = upvote
  })


  const sortedUpvotes = keys.map(key => upvotesIdsToUpvote[`${key.userId}|${key.postId}`])

  return sortedUpvotes
})
