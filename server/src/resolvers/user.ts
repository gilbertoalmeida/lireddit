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
import { EntityManager } from "@mikro-orm/postgresql";
import { COOKIE_NAME, FORGET_PASSWORD_PREFIX } from "../constants";
import { UsernamePasswordInput } from "./UsernamePasswordInput";
import { validateRegister } from "../Utils/validateRegister";
import { sendEmail } from "../Utils/sendEmail";
import { v4 } from "uuid";

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
    @Ctx() { em, redis, req }: MyContext
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

    const user = (await em.findOne(User, { id: parseInt(userId) })) as User; //parseint bc redis stores things as strings and our id is an int.

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

    user.password = await argon2.hash(newPassword);
    em.persistAndFlush(user);

    await redis.del(redisKey);

    // login user after change password
    req.session.userId = user.id;

    return { user };
  }

  @Mutation(() => Boolean)
  async forgotPassword(
    @Arg("email") email: string,
    @Ctx() { em, redis }: MyContext
  ) {
    const user = (await em.findOne(User, { email })) as User;
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
  async me(@Ctx() { req, em }: MyContext) {
    if (!req.session.userId) {
      //this is set in the login. So this is a "if not logged" in check
      return null;
    }

    const user = await em.findOne(User, { id: req.session.userId });
    return user;
  }

  @Mutation(() => UserResponse)
  async register(
    @Arg("options") options: UsernamePasswordInput,
    @Ctx() { em, req }: MyContext
  ): Promise<UserResponse> {
    const errors = validateRegister(options);
    if (errors) return { errors };

    const hashedPassword = await argon2.hash(options.password);
    let user;
    try {
      const result = await (em as EntityManager)
        .createQueryBuilder(User)
        .getKnexQuery()
        .insert({
          email: options.email,
          username: options.username,
          password: hashedPassword,
          created_at: new Date(),
          updated_at: new Date()
        })
        .returning("*");
      user = result[0];
    } catch (err) {
      // these are the errors that the database will throw back if persist and flush fails for some reason.
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
    @Ctx() { em, req }: MyContext
  ): Promise<UserResponse> {
    const user = (await em.findOne(
      User,
      usernameOrEmail.includes("@")
        ? {
            email: usernameOrEmail
          }
        : {
            username: usernameOrEmail
          }
    )) as User;
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
