import { InputType, Field } from "type-graphql";
// instead of heaving a lot of Args in the mutation, I can have only one and pass this class
@InputType()
export class UsernamePasswordInput {
  @Field()
  email: string;
  @Field()
  username: string;
  @Field()
  password: string;
}
