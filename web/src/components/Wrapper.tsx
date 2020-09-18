import React from "react";
import { Box } from "@chakra-ui/core";

interface WrapperProps {
  variant?: "small" | "regular"; //taking this prop to control the x size of the form. ? is to make it optional. I am defining a default below.
}

export const Wrapper: React.FC<WrapperProps> = ({
  //distructuring the props and getting the children (the elements inside the wrapper in the pages) and the variant
  children,
  variant = "regular" //default variant is regular (if not specified)
}) => {
  return (
    <Box
      mt={8}
      mx="auto"
      maxW={variant === "regular" ? "800px" : "400px"}
      w="100%"
    >
      {children}
    </Box>
  );
};

//mt is margin top
//mx is margin on the x axis
//maxW is max Width
//w is width
