import React from "react";
import { Formik, Form } from "formik";
import { InputField } from "../../../components/InputField";
import { Box, Button } from "@chakra-ui/core";
import { usePostQuery, useUpdatePostMutation } from "../../../generated/graphql";
import { withUrqlClient } from "next-urql";
import { createUrqlClient } from "../../../utils/createUrqlClient";
import { Layout } from "../../../components/Layout";
import { useIsAuth } from "../../../utils/useIsAuth";
import { useGetIntId } from "../../../utils/useGetIntId";
import { useRouter } from "next/router";

const EditPost: React.FC<{}> = ({ }) => {
  const router = useRouter()
  const intId = useGetIntId()
  const [{ data, fetching }] = usePostQuery({
    pause: intId === -1,
    variables: {
      id: intId
    }
  })

  const [, updatePost] = useUpdatePostMutation();

  useIsAuth(); //custom hook we created to redirect to login page when the user is not logged in

  if (fetching) {
    return (
      <Layout>
        <div>loading...</div>
      </Layout>
    )
  }

  if (!data?.post) {
    return (
      <Layout>
        <div>Could not find post</div>
      </Layout>
    )
  }

  return (
    <Layout variant="small">
      <Formik
        initialValues={{ title: data.post.title, text: data.post.text }}
        onSubmit={async values => {
          if (values.text && values.title) {
            await updatePost({ id: intId, ...values });
            router.back() //Better the router.push("/") in this case, bc it will take us to wherever we were when we clicked the edit button (editing can happen from inside the post page or from the index page, for example)
          }

        }}
      >
        {({ isSubmitting }) => (
          <Form>
            <InputField name="title" placeholder="title" label="Title" />
            <Box mt={4}>
              <InputField
                name="text"
                placeholder="text..."
                label="Body"
                textarea
              />
            </Box>
            <Button
              mt={4}
              type="submit"
              isLoading={isSubmitting}
              variantColor="teal"
            >
              Update post
            </Button>
          </Form>
        )}
      </Formik>
    </Layout>
  );
};

export default withUrqlClient(createUrqlClient)(EditPost);
