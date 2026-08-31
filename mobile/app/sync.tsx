import { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Switch, Text, View } from "react-native";
import { router } from "expo-router";
import { logout } from "../src/api";
import { runSync, type SyncResult } from "../src/health";
import { isBackgroundSyncRegistered, registerBackgroundSync, unregisterBackgroundSync } from "../src/background";

export default function SyncScreen() {
  const [bg, setBg] = useState(false);
  const [busy, setBusy] = useState(false);
  const [last, setLast] = useState<SyncResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [lastAt, setLastAt] = useState<Date | null>(null);

  useEffect(() => {
    isBackgroundSyncRegistered().then(setBg);
    void doSync();
  }, []);

  async function doSync() {
    setBusy(true);
    setError(null);
    try {
      const r = await runSync();
      setLast(r);
      setLastAt(new Date());
    } catch (e) {
      setError(e instanceof Error ? e.message : "sync failed");
    } finally {
      setBusy(false);
    }
  }

  async function toggleBg(next: boolean) {
    setBg(next);
    if (next) {
      const ok = await registerBackgroundSync();
      if (!ok) {
        setBg(false);
        setError("Background refresh is disabled for Forma in system settings.");
      }
    } else {
      await unregisterBackgroundSync();
    }
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 24 }}>
      <Text style={styles.h1}>Health sync</Text>
      <Text style={styles.p}>
        Forma reads sleep, HRV, resting heart rate and steps from{" "}
        {require("react-native").Platform.OS === "ios" ? "Apple Health" : "Health Connect"} and sends the daily
        values to your account. Raw data never leaves your phone in full — only normalized daily numbers.
      </Text>

      <View style={styles.card}>
        <View style={styles.row}>
          <Text style={styles.rowLabel}>Background sync (every few hours)</Text>
          <Switch value={bg} onValueChange={toggleBg} trackColor={{ true: "#D51A7A" }} />
        </View>
      </View>

      <Pressable style={styles.button} onPress={doSync} disabled={busy}>
        {busy ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Sync now</Text>}
      </Pressable>

      {last && (
        <Text style={styles.status}>
          Last sync {lastAt?.toLocaleTimeString()} — {last.ingested} new, {last.deduped} already had.
        </Text>
      )}
      {error && <Text style={styles.error}>{error}</Text>}

      <Pressable
        style={styles.signOut}
        onPress={async () => {
          await unregisterBackgroundSync();
          await logout();
          router.replace("/");
        }}
      >
        <Text style={styles.signOutText}>Sign out</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0F0A11" },
  h1: { color: "#fff", fontSize: 22, fontWeight: "700", marginBottom: 8 },
  p: { color: "#B8A9B3", lineHeight: 20, marginBottom: 20 },
  card: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    backgroundColor: "rgba(255,255,255,0.03)",
    padding: 16,
    marginBottom: 16,
  },
  row: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  rowLabel: { color: "#fff", flex: 1, paddingRight: 12 },
  button: { height: 48, borderRadius: 999, backgroundColor: "#D51A7A", alignItems: "center", justifyContent: "center" },
  buttonText: { color: "#fff", fontWeight: "600" },
  status: { color: "#8FE3B0", marginTop: 14 },
  error: { color: "#F06CB0", marginTop: 14 },
  signOut: { marginTop: 40, alignItems: "center" },
  signOutText: { color: "#8A7A85" },
});
