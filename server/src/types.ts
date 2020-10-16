import { EntityManager, IDatabaseDriver, Connection } from "@mikro-orm/core";
import { Request, Response } from "express";
import { Redis } from "ioredis";

export type MyContext = {
  em: EntityManager<any> & EntityManager<IDatabaseDriver<Connection>>;
  req: Request & { session: Express.Session }; //the original type had an exclamation mark next to session which was making that the type for it was also possibly undefined. It was annoying to deal with this in the code, so we removed it
  res: Response;
  redis: Redis;
};
