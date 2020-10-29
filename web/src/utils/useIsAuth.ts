import { useRouter } from "next/router";
import { useEffect } from "react";
import { useMeQuery } from "../generated/graphql";

export const useIsAuth = () => {
  const [{ data }] = useMeQuery();
  const router = useRouter();

  useEffect(() => {
    //if the user is not logged in
    if (data && !data.me) {
      router.replace("/login?next=" + router.pathname); //it sends the page that the user was before as a query parameter "next" to be read by the login page
    }
  }, [data, router]);
};
