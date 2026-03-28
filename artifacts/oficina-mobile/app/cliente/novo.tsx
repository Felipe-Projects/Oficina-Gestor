import { Feather } from "@expo/vector-icons";
import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  useColorScheme,
} from "react-native";
import { Colors } from "@/constants/colors";
import { apiPost } from "@/utils/api";

function FormField({
  label,
  required,
  children,
  C,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
  C: typeof Colors.light;
}) {
  return (
    <View style={{ marginBottom: 16 }}>
      <Text
        style={{
          fontSize: 13,
          fontWeight: "600",
          fontFamily: "Inter_600SemiBold",
          color: C.textSecondary,
          marginBottom: 6,
        }}
      >
        {label}
        {required && <Text style={{ color: C.danger }}> *</Text>}
      </Text>
      {children}
    </View>
  );
}

export default function NovoClienteScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const C = isDark ? Colors.dark : Colors.light;
  const router = useRouter();
  const queryClient = useQueryClient();

  const [nome, setNome] = useState("");
  const [telefone, setTelefone] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [email, setEmail] = useState("");
  const [observacoes, setObservacoes] = useState("");
  const [loading, setLoading] = useState(false);

  const inputStyle = {
    backgroundColor: C.card,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    fontFamily: "Inter_400Regular",
    color: C.text,
  };

  async function handleSave() {
    if (!nome.trim()) {
      Alert.alert("Atenção", "Nome é obrigatório.");
      return;
    }
    if (!telefone.trim()) {
      Alert.alert("Atenção", "Telefone é obrigatório.");
      return;
    }
    setLoading(true);
    try {
      await apiPost("/api/clientes", {
        nome: nome.trim(),
        telefone: telefone.trim(),
        whatsapp: whatsapp.trim() || undefined,
        email: email.trim() || undefined,
        observacoes: observacoes.trim() || undefined,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/clientes"] });
      router.back();
    } catch (e: any) {
      Alert.alert("Erro", e.message || "Não foi possível salvar o cliente.");
    } finally {
      setLoading(false);
    }
  }

  const s = StyleSheet.create({
    container: { flex: 1, backgroundColor: C.background },
    scroll: { padding: 16 },
    section: {
      backgroundColor: C.card,
      borderRadius: 12,
      padding: 16,
      marginBottom: 16,
      borderWidth: 1,
      borderColor: C.border,
    },
    sectionTitle: {
      fontSize: 13,
      fontWeight: "700",
      fontFamily: "Inter_700Bold",
      color: C.textTertiary,
      textTransform: "uppercase",
      letterSpacing: 0.5,
      marginBottom: 14,
    },
    saveBtn: {
      backgroundColor: C.primary,
      borderRadius: 12,
      padding: 16,
      alignItems: "center",
      flexDirection: "row",
      justifyContent: "center",
      gap: 8,
      marginBottom: 40,
    },
    saveBtnText: {
      fontSize: 16,
      fontWeight: "700",
      fontFamily: "Inter_700Bold",
      color: "#fff",
    },
  });

  return (
    <KeyboardAvoidingView
      style={s.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView style={s.scroll} keyboardShouldPersistTaps="handled">
        <View style={s.section}>
          <Text style={s.sectionTitle}>Dados Pessoais</Text>
          <FormField label="Nome completo" required C={C}>
            <TextInput
              style={inputStyle}
              value={nome}
              onChangeText={setNome}
              placeholder="Ex: João da Silva"
              placeholderTextColor={C.textTertiary}
              autoCapitalize="words"
              testID="input-nome"
            />
          </FormField>
          <FormField label="Telefone" required C={C}>
            <TextInput
              style={inputStyle}
              value={telefone}
              onChangeText={setTelefone}
              placeholder="(11) 99999-9999"
              placeholderTextColor={C.textTertiary}
              keyboardType="phone-pad"
              testID="input-telefone"
            />
          </FormField>
          <FormField label="WhatsApp" C={C}>
            <TextInput
              style={inputStyle}
              value={whatsapp}
              onChangeText={setWhatsapp}
              placeholder="(11) 99999-9999 (opcional)"
              placeholderTextColor={C.textTertiary}
              keyboardType="phone-pad"
              testID="input-whatsapp"
            />
          </FormField>
          <FormField label="E-mail" C={C}>
            <TextInput
              style={inputStyle}
              value={email}
              onChangeText={setEmail}
              placeholder="email@exemplo.com (opcional)"
              placeholderTextColor={C.textTertiary}
              keyboardType="email-address"
              autoCapitalize="none"
              testID="input-email"
            />
          </FormField>
          <FormField label="Observações" C={C}>
            <TextInput
              style={[inputStyle, { minHeight: 80, textAlignVertical: "top" }]}
              value={observacoes}
              onChangeText={setObservacoes}
              placeholder="Informações adicionais..."
              placeholderTextColor={C.textTertiary}
              multiline
              testID="input-observacoes"
            />
          </FormField>
        </View>

        <Pressable
          style={({ pressed }) => [s.saveBtn, { opacity: pressed ? 0.8 : 1 }]}
          onPress={handleSave}
          disabled={loading}
          testID="button-salvar-cliente"
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Feather name="user-plus" size={18} color="#fff" />
              <Text style={s.saveBtnText}>Salvar Cliente</Text>
            </>
          )}
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
