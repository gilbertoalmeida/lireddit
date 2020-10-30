import { Entity, Column, BaseEntity, ManyToOne, PrimaryColumn } from "typeorm";
import { User } from "./User";
import { Post } from "./Post";

//many to many relationship between users and posts
// user -> join table (upvote) <- posts

@Entity()
export class Upvote extends BaseEntity {
  @Column({ type: "int" })
  value: number;

  @PrimaryColumn()
  userId: number;

  @ManyToOne(() => User, user => user.upvotes)
  user: User; //this works because the user is an object type and in the posts fetching query we are using innerJoinAndSelect to also fetch the user. so in the query I can ask to return creator {and add here all the field of the creator User that I want}

  @PrimaryColumn()
  postId: number;

  @ManyToOne(() => Post, post => post.upvotes)
  post: Post;
}
