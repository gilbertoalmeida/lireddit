import { UsernamePasswordInput } from "src/resolvers/UsernamePasswordInput";

export const validateRegister = (options: UsernamePasswordInput) => {
  if (!options.email.includes("@")) {
    return [
      {
        field: "email",
        message: "has to be a valid email"
      }
    ];
  }

  if (options.username.length <= 2) {
    return [
      {
        field: "username",
        message: "length must be greater than 2"
      }
    ];
  }

  if (options.username.includes("@")) {
    return [
      {
        field: "username",
        message: "username cannot include @"
      }
    ];
  }

  //this check is also in the changePassword mutation. change both together, or abstract
  if (options.password.length <= 3) {
    return [
      {
        field: "password",
        message: "length must be greater than 3"
      }
    ];
  }

  return null;
};
