import React from "react";
import {
  FormControl,
  FormLabel,
  Input,
  FormErrorMessage
} from "@chakra-ui/core";
import { useField } from "formik";

//HERE WE ARE MAKING A GENERIC INPUT FIELD TO USE ID EVERYWHERE JUST PASSING THE APPROPRIATE PROPS

//this looks fancy, but it's just saying that our input component takes the same things as a normal input component from HTML
type InputFieldProps = React.InputHTMLAttributes<HTMLInputElement> & {
  name: string;
  label: string;
};

export const InputField: React.FC<InputFieldProps> = ({
  label,
  size: _,
  ...props //I removed label and size from inside the props here, so that when we pass props to the input it doesn't complain about these two
}) => {
  const [field, { error }] = useField(props); //hook from formik
  return (
    <FormControl isInvalid={!!error}>
      <FormLabel htmlFor={field.name}>{label}</FormLabel>
      <Input
        {...field}
        {...props}
        id={field.name}
        placeholder={props.placeholder}
      />
      {error ? <FormErrorMessage>{error}</FormErrorMessage> : null}
    </FormControl>
  );
};

//error is a string and we need a boolean for isInvalid, so !! casts it to a boolean
