import DataLoader from "dataloader"
import { User } from "../entities/User"

//we are gonna pass user ids as the keys, and they are returning the users. All in a single sql, which is the advantage we are looking for
// id [1, 78, 8, 9]
// return [{id: 1, username: 'tim'}, {{id: 78, username: 'john'}, {}, {}]
//One huge advantage is that it will get rid of duplicate keys (ids), as it caches the users. So it only fetches a user once, even if they are the creator of multiple posts
export const createUserLoader = () => new DataLoader<number, User>(async userIds => {
  const users = await User.findByIds(userIds as number[])
  const userIdToUser: Record<number, User> = {}
  users.forEach(u => {
    userIdToUser[u.id] = u
  })

  //reordering like the userId is ordered
  const sortedUsers = userIds.map(userId => userIdToUser[userId])

  // console.log("userIds: ", userIds)
  // console.log("map: ", userIdToUser)
  // console.log("sortedUsers: ", sortedUsers)

  return sortedUsers
})
