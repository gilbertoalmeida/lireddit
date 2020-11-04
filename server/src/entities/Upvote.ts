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

  /* 
  MODIFIED COPY OF THE RELATION ABOVE
  This is the way you would cascade the deletion of the votes together with the post itself. This way, in the mutation, you just have to delete the post and all the upvotes that have this post will be deleted together.
  I discuss the possible bad sides of it in the deletePost mutation

  @ManyToOne(() => Post, post => post.upvotes, {
    onDelete: "CASCADE"
  })
  post: Post; 
  */
}
