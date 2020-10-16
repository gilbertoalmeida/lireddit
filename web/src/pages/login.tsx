import React from "react";
import { Formik, Form } from "formik";
import { Box, Button } from "@chakra-ui/core";
import { Wrapper } from "../components/Wrapper";
import { InputField } from "../components/InputField";
import { useLoginMutation } from "../generated/graphql";
import { toErrorMap } from "../utils/toErrorMap";
import { useRouter } from "next/router";
import { withUrqlClient } from "next-urql";
import { createUrqlClient } from "../utils/createUrqlClient";

// interface loginProps {}

const Login: React.FC<{}> = ({}) => {
  const [, login] = useLoginMutation(); //the name login inside the [] is the name we are choosing to call this mutation inside the onSubmit
  const router = useRouter();
  return (
    <Wrapper variant="small">
      <Formik
        initialValues={{ username: "", password: "" }}
        onSubmit={async (values, { setErrors }) => {
          const response = await login({ options: values }); //we pass this options object, different than the register, because we did the types for generations differently. Check graphql documents where I put the mutations for gen of types
          if (response.data && response.data.login.errors) {
            console.log("oi");
            setErrors(toErrorMap(response.data.login.errors));
          } else if (response.data && response.data.login.user) {
            router.push("/");
          } else {
            // I created this error for the case that response.data is undefined, which I don't thing will happen, but if it does I want the user to see something, even if it's a general message like server error
            setErrors(
              toErrorMap([{ field: "username", message: "server error" }])
            );
          }
        }}
      >
        {({ isSubmitting }) => (
          <Form>
            <InputField
              name="username"
              placeholder="username"
              label="Username"
            />
            <Box mt={4}>
              <InputField
                name="password"
                placeholder="password"
                label="Password"
                type="password"
              />
            </Box>
            <Button
              mt={4}
              type="submit"
              isLoading={isSubmitting}
              variantColor="teal"
            >
              login
            </Button>
          </Form>
        )}
      </Formik>
    </Wrapper>
  );
};

//server side rendering is off here
export default withUrqlClient(createUrqlClient)(Login);
