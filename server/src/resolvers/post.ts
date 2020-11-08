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
import { User } from "../entities/User";

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
    @Root() post: Post //this is gonna be called everytime we get a Post object
  ) {
    return post.text.slice(0, 50); //getting a snippet of 50 caracters of the text, to not have to load the whole text when I don't need it.
    //the point of this is that in posts.graphql I will ask for the textSnippet instead of the text. Bc since this query is returning a lot of values and I am not interested in showing the whole text of each one, it's better if I save on the loading.
  }

  @FieldResolver(() => User)
  creator(
    @Root() post: Post,
    @Ctx() { userLoader }: MyContext
  ) {
    return userLoader.load(post.creatorId) //the function will be called for all posts fetched. So the userLoader is going to batch the user ids and send as array in a single function call (in createUserLoader. check the context in index.)
    //by the way. It also caches the users. So if on a page we are requesting the same user more than one time, it's one going to be requested once. Which is amazing!! It gets rid of duplicate keys (ids)

    /* 
    Without using the userLoader from the contex, we could fetch each user like this. But there would be a sql for each post. The userLoader is combining all of them together in one sql
    return User.findOne(post.creatorId);
     */
  }

  @FieldResolver(() => Int, { nullable: true })
  async voteStatus(
    @Root() post: Post,
    @Ctx() { upvoteLoader, req }: MyContext
  ) {
    if (!req.session.userId) {
      return null
    }
    const upvote = await upvoteLoader.load({ postId: post.id, userId: req.session.userId })

    //if we don't find an upvote that means they haven#t voted, so it's null. Otherwise it's 1 or -1
    return upvote ? upvote.value : null
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

    const existingVote = await Upvote.findOne({ where: { postId, userId } })

    if (existingVote && existingVote.value !== realValue) {
      //they are changing their vote

      await getConnection().transaction(async tm => {
        await tm.query(`
          update upvote 
          set value = $1
          where "postId" = $2 and "userId" = $3
        `, [realValue, postId, userId]
        );

        await tm.query(`
          update post
          set points = points + $1
          where id = $2
        `, [2 * realValue, postId] //since we are changing the value of the vote we need to sum 2 or subtract 2 to give the effect of changing a vote in the number of points.
        )
      })

    } else if (!existingVote) {

      /*
    This is together in a transaction with updating points of a post. The idea being when one fails, both fail.
    await Upvote.insert({
      userId,
      postId,
      value: realValue
    }); */

      await getConnection().transaction(async tm => {
        await tm.query(`
          insert into upvote ("userId", "postId", value)
          values ($1, $2, $3)
        `, [userId, postId, realValue]
        );

        await tm.query(`
          update post
          set points = points + $1
          where id = $2
        `, [realValue, postId]
        )
      })
    }

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

    /* 
    WITH POSSIBILITY 2:

    if (req.session.userId) {
      replacements.push(req.session.userId);
    }
    
    let cursorIdx = 3
    if (cursor) {
      replacements.push(new Date(parseInt(cursor)));
      cursorIdx = replacements.length
    }
     */

    if (cursor) {
      replacements.push(new Date(parseInt(cursor)));
    }

    //All these if statements above and the and thing are confitions to satisfy the different situations that might happen when the query is calls, which influences the way the replacements are passed to the query. The user might be logged in or not, or the query might have a cursor or not.

    //In this possibility, we removed the json object builder and the inner join, and the upvote things, bc we are using the 2 field resolvers from above that everytime a post is fetched, it fetches a user as creator and the upvotes too. (similar to how we did the textSnippet)
    //For every post fetched, it is resolving the field creator and the voteStatus written above. (beginning of the resolver)
    //if you checked the logs of the server, you could see that a User query is written for every post fetched. Which is an overkill (n + 1 problem). So we will use the dataloader library to solve this. (Similar thing for the upvotes)
    const postsWithOneExtra = await getConnection().query(
      `
    select p.*
    from post p
    ${cursor ? `where p."createdAt" < $2` : ""}
    order by p."createdAt" DESC
    limit $1
    `,
      replacements //the an array of the things with $number in the query
    );


    /* 
    POSSIBILITY 2:
    //now when we call posts we are gonna load this single sql that fetches the posts and the user(creator) of the posts.
    //It creates an object called creator with the fields inside, so that it looks like the organization we want.
    // (If the query was simple, there was another way of doing it. See query post below.)
    //it also creates the voteStatus by looking in the table upvote if the current user voted in each post and attaches 1, -1 or null. This is usefull for the actions on voting that need to know if the current user already voted or not and how they voted on each post
    const postsWithOneExtra = await getConnection().query(
      `
    select p.*,  
    json_build_object(
      'id', u.id,
      'username', u.username,
      'email', u.email,
      'createdAt', u."createdAt",
      'updatedAt', u."updatedAt"
      ) creator,
    ${req.session.userId
        ? '(select value from upvote where "userId" = $2 and "postId" = p.id) "voteStatus"'
        : 'null as voteStatus'
      }
    from post p
    inner join public.user u on u.id = p."creatorId"
    ${cursor ? `where p."createdAt" < $${cursorIdx}` : ""}
    order by p."createdAt" DESC
    limit $1
    `,
      replacements //the an array of the things with $number in the query
    );
 */


    /* 
    POSSIBILITY 3:
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
  post(@Arg("id", () => Int) id: number): Promise<Post | undefined> {
    return Post.findOne(id);
    /* 
    FOR POSSIBILITY 2:
    return Post.findOne(id, { relations: ["creator"] }); //since we are searching by the primery key (id), we don't have to say where. The relations is to left join the user search for the creator of the post. The name "creator" was chosen because this is teh name of the ManyToOne relationship in our Post entity. Since it's just for one post and the sql is simple, graphql manages to do it like this. In the case of out posts query, it was more complicated, so we had to write it ourselves.
    */
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
  @UseMiddleware(isAuth)
  async updatePost(
    @Arg("id", () => Int) id: number,
    @Arg("title", { nullable: true }) title: string,
    @Arg("text", { nullable: true }) text: string,
    @Ctx() { req }: MyContext
  ): Promise<Post | null> {

    const result = await getConnection()
      .createQueryBuilder()
      .update(Post)
      .set({ title, text })
      .where('id = :id and "creatorId" = :creatorId', { id, creatorId: req.session.userId })
      .returning("*")
      .execute();

    return result.raw[0]

    /* 
    this is what we wanted to do, but the post in the end is still the old post and update also doesn't return the updated post. So we decided to change to the query builder.
    
    const post = await Post.findOne(id);
        if (!post) {
          return null;
        }
    
    await Post.update({ id, req.session.userId }, { title, text });
    
    return post
     */

  }

  @Mutation(() => Boolean)
  @UseMiddleware(isAuth) //user has to be logged in
  async deletePost(
    @Arg("id", () => Int) id: number,
    @Ctx() { req }: MyContext
  ): Promise<boolean> {
    const post = await Post.findOne(id)

    if (!post) {
      return false
    }

    if (post.creatorId !== req.session.userId) {
      //users can only delete their own posts.
      throw new Error("not authorized")
    }

    await Upvote.delete({ postId: id }) //deleting all the votes from this post. Otherwise it won't let us delete a post with votes.
    await Post.delete({ id });

    /* 
      The deletion of the posts Upvotes could also be done by cascading the delete. So here we could only write:
      await Post.delete({ id, creatorId: req.session.userId });
      This already checks if the post is from the user and deletes it. The cascading to delete its votes too happens if you specify to cascade on delete in the Upvote entity (See anotation there)
      Possible bad sides: you forget you are cascading things and delete more than you want in specific situations.
      You want to send specific errors or returns if you don't find the post or if the user doesn't have authorization.
      
    */

    return true;
  }
}
