import {
  Resolver,
  Query,
  Arg,
  Mutation,
  InputType,
  Field,
  Ctx,
  UseMiddleware,
  Int
} from "type-graphql";
import { Post } from "../entities/Post";
import { MyContext } from "../types";
import { isAuth } from "../middleware/isAuth";
import { getConnection } from "typeorm";

@InputType()
class PostInput {
  @Field()
  title: string;
  @Field()
  text: string;
}

@Resolver()
export class PostResolver {
  @Query(() => [Post])
  async posts(
    @Arg("limit", () => Int) limit: number,
    @Arg("cursor", () => String, { nullable: true }) cursor: string | null
  ): Promise<Post[]> {
    // await sleep(3000);
    // sleep function is in Utils of src
    // return Post.find(); // before we were just getting all posts, changed it to pagination and will use the query builder now
    const realLimit = Math.min(50, limit); // the realLimit is the limit passed unless it is more than 50, in this case it is capped at 50
    const qb = getConnection()
      .getRepository(Post)
      .createQueryBuilder("p") // It's just a regular SQL alias. createQueryBuilder("user") is equivalent to: createQueryBuilder().select("user").from(User, "user")
      .orderBy('"createdAt"', "DESC") //double quotes so that the internal quote is sent.
      .take(realLimit);
    if (cursor) {
      qb.where('"createdAt" < :cursor', { cursor: new Date(parseInt(cursor)) }); //cursor is the milisecons, we transform it to a int to be able to create a date from it, which is what needs to go to postgressql. What we want to do when we have a cursor is geting all posts after this date. This way we can always get a number of posts after the last one from the last pagination unit
    }

    return qb.getMany(); //this is what actually executes the sequel. So we can do all the conditions first and then return it
  }

  @Query(() => Post, { nullable: true })
  post(@Arg("id") id: number): Promise<Post | undefined> {
    return Post.findOne(id); //since we are searching by the primery key (id), we don't have to say where
  }

  @Mutation(() => Post)
  @UseMiddleware(isAuth) //checking if user is authenticated
  async createPost(
    @Arg("input") input: PostInput,
    @Ctx() { req }: MyContext
  ): Promise<Post> {
    return Post.create({
      ...input,
      creatorId: req.session.userId
      //points will be defaulted to zero
    }).save();
  }

  @Mutation(() => Post, { nullable: true })
  async updatePost(
    @Arg("id") id: number,
    @Arg("title", () => String, { nullable: true }) title: string
  ): Promise<Post | null> {
    const post = await Post.findOne(id);
    if (!post) {
      return null;
    }
    if (typeof title !== "undefined") {
      await Post.update({ id }, { title });
    }
    return post;
  }

  @Mutation(() => Boolean)
  async deletePost(@Arg("id") id: number): Promise<boolean> {
    await Post.delete(id);
    return true;
  }
}
