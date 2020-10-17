import {
  Resolver,
  Mutation,
  Field,
  Arg,
  Ctx,
  ObjectType,
  Query
} from "type-graphql";
import { MyContext } from "../types";
import { User } from "../entities/User";
import argon2 from "argon2";
import { COOKIE_NAME, FORGET_PASSWORD_PREFIX } from "../constants";
import { UsernamePasswordInput } from "./UsernamePasswordInput";
import { validateRegister } from "../Utils/validateRegister";
import { sendEmail } from "../Utils/sendEmail";
import { v4 } from "uuid";
import { getConnection } from "typeorm";

@ObjectType()
class FieldError {
  @Field()
  field: string;
  @Field()
  message: string;
}

// used for return from the mutations
@ObjectType()
class UserResponse {
  @Field(() => [FieldError], { nullable: true })
  errors?: FieldError[]; // the question mark is for having undefined

  @Field(() => User, { nullable: true })
  user?: User;
}

@Resolver()
export class UserResolver {
  @Mutation(() => UserResponse) //returning a UserResponse to login the user after they change their password
  async changePassword(
    @Arg("token") token: string,
    @Arg("newPassword") newPassword: string,
    @Ctx() { redis, req }: MyContext
  ): Promise<UserResponse> {
    //this check is also in the validateRegister. change both together, or abstract
    if (newPassword.length <= 3) {
      return {
        errors: [
          {
            field: "newPassword",
            message: "length must be greater than 3"
          }
        ]
      };
    }

    const redisKey = FORGET_PASSWORD_PREFIX + token;
    const userId = await redis.get(redisKey);

    if (!userId) {
      return {
        errors: [
          {
            field: "token",
            message: "token expired"
          }
        ]
      };
    }

    const userIdNum = parseInt(userId); //parseint bc redis stores things as strings and our id is an int.

    const user = await User.findOne(userIdNum); //since we are searching by the primery key (id), we don't have to say where

    if (!user) {
      return {
        errors: [
          {
            field: "token",
            message: "user no longer exists"
          }
        ]
      };
    }

    await User.update(
      { id: userIdNum },
      {
        password: await argon2.hash(newPassword)
      }
    );

    await redis.del(redisKey);

    // login user after change password
    req.session.userId = user.id;

    return { user };
  }

  @Mutation(() => Boolean)
  async forgotPassword(
    @Arg("email") email: string,
    @Ctx() { redis }: MyContext
  ) {
    const user = await User.findOne({ where: { email } }); //since we are not searching by the primery key (id), we have to say where
    if (!user) {
      //the email is not in the db
      return true; //for security reasons, not doing anything, to avoid someone fishing for emails with it
    }

    //this token is to say we know who they are. v4 is a function of uuid to give us a random string
    const token = v4();

    //key is the token with a prefix to differenciate them, value is the user id, and it expires in 3 days
    await redis.set(
      FORGET_PASSWORD_PREFIX + token,
      user.id,
      "ex",
      1000 * 60 * 60 * 24 * 3
    );

    sendEmail(
      email,
      `<a href="http://localhost:3000/change-password/${token}">reset password</a>`
    );

    return true;
  }

  @Query(() => User, { nullable: true })
  me(@Ctx() { req }: MyContext) {
    if (!req.session.userId) {
      //this is set in the login. So this is a "if not logged" in check
      return null;
    }

    return User.findOne(req.session.userId);
  }

  @Mutation(() => UserResponse)
  async register(
    @Arg("options") options: UsernamePasswordInput,
    @Ctx() { req }: MyContext
  ): Promise<UserResponse> {
    const errors = validateRegister(options);
    if (errors) return { errors };

    const hashedPassword = await argon2.hash(options.password);
    let user;

    // INSERTING WITH THE QUERY BUILDER. YOU CAN COMPARE IT HOW WE INSERT A POST. it could have been made simpler by using User.create({pass here the fields}).save()
    try {
      const result = await getConnection()
        .createQueryBuilder()
        .insert()
        .into(User)
        .values({
          email: options.email,
          username: options.username,
          password: hashedPassword
        })
        .returning("*")
        .execute();

      user = result.raw[0]; //the InsertResult is an object with an element raw which is an Array, the only element is the user added (you can console log the result and register someone to see it)
    } catch (err) {
      // these are the errors that the database will throw back if the inserting fails (you can console log the err to see it)
      if (err.code === "23505") {
        //|| err.detail.includes("already exists")
        //username already exists in the database
        return {
          errors: [
            {
              field: "username",
              message: "username already taken"
            }
          ]
        };
      }
    }

    req.session.userId = user.id; // storing the id of the user in the session to save it in the cookie (keep logged in)

    return {
      user
    };
  }

  @Mutation(() => UserResponse)
  async login(
    @Arg("usernameOrEmail") usernameOrEmail: string,
    @Arg("password") password: string,
    @Ctx() { req }: MyContext
  ): Promise<UserResponse> {
    const user = await User.findOne(
      usernameOrEmail.includes("@")
        ? {
            where: { email: usernameOrEmail }
          }
        : {
            where: { username: usernameOrEmail }
          }
    );

    if (!user) {
      return {
        errors: [
          {
            field: "usernameOrEmail",
            message: "There's no user with this username or email"
          }
        ]
      };
    }
    const valid = await argon2.verify(user.password, password);

    if (!valid) {
      return {
        errors: [{ field: "password", message: "incorrect" }]
      };
    }

    req.session.userId = user.id; // storing the id of the user in the session to save it in the cookie (keep logged in)

    return {
      user
    };
  }

  @Mutation(() => Boolean)
  logout(@Ctx() { req, res }: MyContext) {
    return new Promise(resolve =>
      req.session.destroy(err => {
        //removing from redis. It's a promise, so we have to resolve it
        res.clearCookie(COOKIE_NAME); //removing the cookie
        if (err) {
          console.log(err);
          resolve(false);
          return;
        }
        resolve(true);
      })
    );
  }
}
