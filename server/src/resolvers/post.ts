import {
  Resolver,
  Query,
  Arg,
  Mutation,
  InputType,
  Field,
  Ctx,
  UseMiddleware,
  Int,
  FieldResolver,
  Root,
  ObjectType
} from "type-graphql";
import { Post } from "../entities/Post";
import { MyContext } from "../types";
import { isAuth } from "../middleware/isAuth";
import { getConnection } from "typeorm";
import { Upvote } from "../entities/Upvote";

@InputType()
class PostInput {
  @Field()
  title: string;
  @Field()
  text: string;
}

@ObjectType()
class PaginatedPosts {
  @Field(() => [Post])
  postsArray: Post[];
  @Field()
  hasMore: boolean;
}

@Resolver(Post)
export class PostResolver {
  @FieldResolver(() => String)
  textSnippet(
    @Root() root: Post //this is gonna be called everytime we get a Post object
  ) {
    return root.text.slice(0, 50); //getting a snippet of 50 caracters of the text, to not have to load the whole text when I don't need it.
    //the point of this is that in posts.graphql I will ask for the textSnippet instead of the text. Bc since this query is returning a lot of values and I am not interested in showing the whole text of each one, it's better if I save on the loading.
  }

  @Mutation(() => Boolean)
  @UseMiddleware(isAuth)
  async vote(
    @Arg("postId", () => Int) postId: number,
    @Arg("value", () => Int) value: number,
    @Ctx() { req }: MyContext
  ): Promise<boolean> {
    //avoiding giving more that an up or down vote
    const realValue = value > 0 ? 1 : -1;

    const { userId } = req.session;

    /*
    This is together in a transaction with updating points of a post. The idea being when one fails, both fail.
    await Upvote.insert({
      userId,
      postId,
      value: realValue
    }); */

    await getConnection().query(
      `
      START TRANSACTION;

      insert into upvote ("userId", "postId", value)
      values (${userId}, ${postId}, ${realValue});

      update post
      set points = points + ${realValue}
      where id = ${postId};

      COMMIT;
      `
    );

    return true;
  }

  @Query(() => PaginatedPosts)
  async posts(
    @Arg("limit", () => Int) limit: number,
    @Arg("cursor", () => String, { nullable: true }) cursor: string | null
  ): Promise<PaginatedPosts> {
    // await sleep(3000);
    // sleep function is in Utils of src
    // return Post.find(); // before we were just getting all posts, changed it to pagination and will use the query builder now
    const realLimit = Math.min(50, limit); // the realLimit is the limit passed unless it is more than 50, in this case it is capped at 50.
    const realLimitPlusOne = realLimit + 1; // Fetching 1 more than we need to know if there are more after what we need, to change the Loadmore UI

    const replacements: any[] = [realLimitPlusOne];

    if (cursor) {
      replacements.push(new Date(parseInt(cursor)));
    }

    //now when we call posts we are gonna load this single sql that fetches the posts and the user(creator) of the posts.
    const postsWithOneExtra = await getConnection().query(
      `
    select p.*,  
    json_build_object(
      'id', u.id,
      'username', u.username,
      'email', u.email,
      'createdAt', u."createdAt",
      'updatedAt', u."updatedAt"
      ) creator
    from post p
    inner join public.user u on u.id = p."creatorId"
    ${cursor ? `where p."createdAt" < $2` : ""}
    order by p."createdAt" DESC
    limit $1
    `,
      replacements //the an array of the things with $number in the query
    );

    /* 
Previous used query with the query builder. It was changed for writing sql directly above. Bc a user needed to be fetched for each post as the creator too (with the inner join)


    const qb = getConnection()
      .getRepository(Post)
      .createQueryBuilder("p") // It's just a regular SQL alias. createQueryBuilder("user") is equivalent to: createQueryBuilder().select("user").from(User, "user")
      .orderBy('"createdAt"', "DESC") //double quotes so that the internal quote is sent (camelCase needs it).
      .take(realLimitPlusOne);
    if (cursor) {
      qb.where('"createdAt" < :cursor', {
        cursor: new Date(parseInt(cursor))
      }); //cursor is the milisecons, we transform it to a int to be able to create a date from it, which is what needs to go to postgressql. What we want to do when we have a cursor is geting all posts after this date. This way we can always get a number of posts after the last one from the last pagination unit
    }

    const postsWithOneExtra = await qb.getMany(); //this is what actually executes the sequel.
    
 */

    const posts = postsWithOneExtra.slice(0, realLimit); //slice returns from index 0 until the one before realLimit. So we are removing the extra one we added just to see if there are more

    return {
      postsArray: posts,
      hasMore: postsWithOneExtra.length === realLimitPlusOne
    };
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
