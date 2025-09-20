import { View, Text, TextInput, Button, Alert } from "react-native";
import { useState } from "react";
import { Stack } from "expo-router";
import { useAuth } from "@/hooks/useAuth";

export default function SignIn() {
  const { login } = useAuth?.() ?? {};
  const [email, setEmail] = useState("test@loadrush.app");
  const [password, setPassword] = useState("password");
  
  return (
    <View style={{ flex:1, justifyContent:"center", padding:16, gap:12 }}>
      <Stack.Screen options={{ title: "Sign In" }} />
      <Text style={{ fontSize:18, fontWeight:"700" }}>Welcome</Text>
      <TextInput 
        placeholder="Email" 
        value={email} 
        onChangeText={setEmail} 
        style={{ borderWidth:1, padding:10, borderRadius:8 }} 
        autoCapitalize="none" 
      />
      <TextInput 
        placeholder="Password" 
        value={password} 
        onChangeText={setPassword} 
        secureTextEntry 
        style={{ borderWidth:1, padding:10, borderRadius:8 }} 
      />
      <Button title="Sign in with Email" onPress={async () => {
        try { 
          if (login) await login(email, password); 
          else Alert.alert("Auth", "Missing email sign-in"); 
        }
        catch (e:any) { Alert.alert("Auth error", e.message); }
      }} />
      <Button title="Continue as Guest" onPress={async () => {
        try { 
          if (login) await login("guest@example.com", "password"); 
          else Alert.alert("Auth", "Missing guest sign-in"); 
        }
        catch (e:any) { Alert.alert("Auth error", e.message); }
      }} />
    </View>
  );
}