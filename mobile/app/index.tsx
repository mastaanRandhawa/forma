import { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { router } from "expo-router";
import { isAuthed, login } from "../src/api";

export default function LoginScreen() {
  const [checking, setChecking] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    isAuthed().then((ok) => {
      if (ok) router.replace("/sync");
      else setChecking(false);
    });
  }, []);

  async function submit() {
    setBusy(true);
    setError(null);
    try {
      await login(email.trim(), password);
      router.replace("/sync");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Sign in failed");
    } finally {
      setBusy(false);
    }
  }

  if (checking)
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator color="#F06CB0" />
      </View>
    );

  return (
    <View style={styles.container}>
      <Text style={styles.title}>forma</Text>
      <Text style={styles.sub}>Sign in to sync your health data.</Text>

      <TextInput
        style={styles.input}
        placeholder="email"
        placeholderTextColor="#8A7A85"
        autoCapitalize="none"
        keyboardType="email-address"
        value={email}
        onChangeText={setEmail}
      />
      <TextInput
        style={styles.input}
        placeholder="password"
        placeholderTextColor="#8A7A85"
        secureTextEntry
        value={password}
        onChangeText={setPassword}
      />

      <Pressable style={styles.button} onPress={submit} disabled={busy}>
        <Text style={styles.buttonText}>{busy ? "…" : "Sign in"}</Text>
      </Pressable>
      {error && <Text style={styles.error}>{error}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0F0A11", padding: 24, justifyContent: "center" },
  center: { alignItems: "center" },
  title: { color: "#fff", fontSize: 28, fontWeight: "700", marginBottom: 4 },
  sub: { color: "#B8A9B3", marginBottom: 28 },
  input: {
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    backgroundColor: "rgba(255,255,255,0.04)",
    color: "#fff",
    paddingHorizontal: 14,
    marginBottom: 12,
  },
  button: { height: 48, borderRadius: 999, backgroundColor: "#D51A7A", alignItems: "center", justifyContent: "center", marginTop: 8 },
  buttonText: { color: "#fff", fontWeight: "600" },
  error: { color: "#F06CB0", marginTop: 12 },
});
