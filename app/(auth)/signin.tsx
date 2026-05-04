import { router } from "expo-router";
import React from "react";
import { Button, Text, View } from "react-native";

const signin = () => {
  return (
    <View>
      <Text>signin</Text>
      <Text>Don't have an account? </Text>
      <Button title="Sign up" onPress={() => router.push("/signup")} />
    </View>
  );
};

export default signin;
