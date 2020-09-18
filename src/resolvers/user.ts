import {
  Resolver,
  Mutation,
  InputType,
  Field,
  Arg,
  Ctx,
  ObjectType,
  Query
} from "type-graphql";
import { MyContext } from "../types";
import { User } from "../entities/User";
import argon2 from "argon2";

// instead of heaving a lot of Args in the mutation, I can have only one and pass this class
@InputType()
class UsernamePasswordInput {
  @Field()
  username: string;
  @Field()
  password: string;
}

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
    if (options.username.length <= 2) {
      return {
        errors: [
          {
            field: "username",
            message: "length must be greater than 2"
          }
        ]
      };
    }

    if (options.password.length <= 3) {
      return {
        errors: [
          {
            field: "password",
            message: "length must be greater than 3"
          }
        ]
      };
    }

    const hashedPassword = await argon2.hash(options.password);
    const user = em.create(User, {
      username: options.username,
      password: hashedPassword
    });
    try {
      await em.persistAndFlush(user);
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
    @Arg("options") options: UsernamePasswordInput,
    @Ctx() { em, req }: MyContext
  ): Promise<UserResponse> {
    const user = (await em.findOne(User, {
      username: options.username
    })) as User;
    if (!user) {
      return {
        errors: [{ field: "username", message: "This username doesn't exist" }]
      };
    }
    const valid = await argon2.verify(user.password, options.password);

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
}
