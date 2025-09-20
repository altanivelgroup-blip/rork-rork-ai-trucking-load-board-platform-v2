import { View, Text, TextInput, Button, Alert, StyleSheet } from "react-native";
import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Stack } from "expo-router";

export default function SignIn() {
  const { login } = useAuth();
  const [email, setEmail] = useState("test@loadrush.app");
  const [password, setPassword] = useState("password");

  const handleEmailSignIn = async () => {
    try {
      if (login) {
        await login(email, password);
      } else {
        Alert.alert("Auth", "Hook missing login function");
      }
    } catch (e: any) {
      Alert.alert("Auth error", e.message);
    }
  };

  const handleGuestSignIn = async () => {
    try {
      if (login) {
        await login("guest@example.com", "guest");
      } else {
        Alert.alert("Auth", "Hook missing login function");
      }
    } catch (e: any) {
      Alert.alert("Auth error", e.message);
    }
  };

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: "Sign In" }} />
      <Text style={styles.title}>Welcome</Text>
      
      <TextInput
        placeholder="Email"
        value={email}
        onChangeText={setEmail}
        style={styles.input}
        keyboardType="email-address"
        autoCapitalize="none"
      />
      
      <TextInput
        placeholder="Password"
        secureTextEntry
        value={password}
        onChangeText={setPassword}
        style={styles.input}
      />
      
      <Button title="Sign in with Email" onPress={handleEmailSignIn} />
      
      <View style={styles.spacer} />
      
      <Button title="Continue as Guest" onPress={handleGuestSignIn} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    gap: 12,
    justifyContent: "center",
  },
  title: {
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 20,
  },
  input: {
    borderWidth: 1,
    padding: 10,
    borderRadius: 8,
    borderColor: "#ccc",
  },
  spacer: {
    height: 20,
  },
});