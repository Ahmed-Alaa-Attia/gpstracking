import { router } from "expo-router";
import React from "react";
import { Button, Text, View } from "react-native";

const signup = () => {
  return (
    <View>
      <Text>signup</Text>
      <Text>Already have an account? </Text>
      <Button title="Sign in" onPress={() => router.push("/signin")} />
    </View>
  );
};

export default signup;
