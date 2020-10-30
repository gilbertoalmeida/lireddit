import { ObjectType, Field, Int } from "type-graphql";
import {
  Entity,
  Column,
  UpdateDateColumn,
  CreateDateColumn,
  PrimaryGeneratedColumn,
  BaseEntity,
  ManyToOne,
  OneToMany
} from "typeorm";
import { User } from "./User";
import { Upvote } from "./Upvote";

@ObjectType()
@Entity()
export class Post extends BaseEntity {
  @Field()
  @PrimaryGeneratedColumn()
  id!: number;

  @Field()
  @Column()
  title!: string;

  @Field()
  @Column()
  text!: string;

  @Field()
  @Column({ type: "int", default: 0 })
  points!: number;

  @Field(() => Int, { nullable: true }) //this is just a graphql schema value, it's not a column in the database. We just want to know if it was an upvote or downvote
  voteStatus: number | null //1 or -1 or null. Either I up or downvoted or I didn't

  @Field()
  @Column()
  creatorId: number;

  @Field()
  @ManyToOne(() => User, user => user.posts)
  creator: User; //this works because the user is an object type and in the posts fetching query we are using innerJoinAndSelect to also fetch the user. so in the query I can ask to return creator {and add here all the field of the creator User that I want}

  @OneToMany(() => Upvote, upvote => upvote.post)
  upvotes: Upvote[];

  @Field(() => String)
  @CreateDateColumn()
  createdAt: Date;

  @Field(() => String)
  @UpdateDateColumn()
  updatedAt: Date;
}
