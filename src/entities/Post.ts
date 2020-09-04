import { Entity, PrimaryKey, Property } from "@mikro-orm/core";

/* An entity is a database table */
@Entity()
export class Post {
  @PrimaryKey()
  id!: number;

  /* Property is a database column */
  @Property({ type: "date" })
  createdAt = new Date();

  @Property({ type: "date", onUpdate: () => new Date() })
  updatedAt = new Date();

  @Property({ type: "text" })
  title!: string;
}
