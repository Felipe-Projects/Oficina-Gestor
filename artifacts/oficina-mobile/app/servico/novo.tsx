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
  hint,
  children,
  C,
}: {
  label: string;
  required?: boolean;
  hint?: string;
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
      {hint && (
        <Text style={{ fontSize: 11, color: C.textTertiary, fontFamily: "Inter_400Regular", marginTop: 4 }}>
          {hint}
        </Text>
      )}
    </View>
  );
}

export default function NovoServicoScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const C = isDark ? Colors.dark : Colors.light;
  const router = useRouter();
  const queryClient = useQueryClient();

  const [nome, setNome] = useState("");
  const [descricao, setDescricao] = useState("");
  const [valorPadrao, setValorPadrao] = useState("");
  const [duracaoDias, setDuracaoDias] = useState("");
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
      Alert.alert("Atenção", "Nome do serviço é obrigatório.");
      return;
    }
    const valor = parseFloat(valorPadrao.replace(",", "."));
    if (isNaN(valor) || valor < 0) {
      Alert.alert("Atenção", "Valor padrão inválido.");
      return;
    }
    setLoading(true);
    try {
      await apiPost("/api/servicos", {
        nome: nome.trim(),
        descricao: descricao.trim() || undefined,
        valorPadrao: valor,
        duracaoDias: duracaoDias ? parseInt(duracaoDias) : undefined,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/servicos"] });
      router.back();
    } catch (e: any) {
      Alert.alert("Erro", e.message || "Não foi possível salvar o serviço.");
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
    row: { flexDirection: "row" as const, gap: 12 },
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
    saveBtnText: { fontSize: 16, fontWeight: "700", fontFamily: "Inter_700Bold", color: "#fff" },
  });

  return (
    <KeyboardAvoidingView
      style={s.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView style={s.scroll} keyboardShouldPersistTaps="handled">
        <View style={s.section}>
          <Text style={s.sectionTitle}>Dados do Serviço</Text>
          <FormField label="Nome do serviço" required C={C}>
            <TextInput
              style={inputStyle}
              value={nome}
              onChangeText={setNome}
              placeholder="Ex: Troca de óleo"
              placeholderTextColor={C.textTertiary}
              autoCapitalize="sentences"
              testID="input-nome"
            />
          </FormField>
          <FormField label="Descrição" C={C}>
            <TextInput
              style={[inputStyle, { minHeight: 80, textAlignVertical: "top" }]}
              value={descricao}
              onChangeText={setDescricao}
              placeholder="Detalhes do serviço..."
              placeholderTextColor={C.textTertiary}
              multiline
              testID="input-descricao"
            />
          </FormField>
        </View>

        <View style={s.section}>
          <Text style={s.sectionTitle}>Valores e Prazo</Text>
          <View style={s.row}>
            <View style={{ flex: 1 }}>
              <FormField label="Valor padrão" required hint="R$" C={C}>
                <TextInput
                  style={inputStyle}
                  value={valorPadrao}
                  onChangeText={setValorPadrao}
                  placeholder="0,00"
                  placeholderTextColor={C.textTertiary}
                  keyboardType="decimal-pad"
                  testID="input-valor-padrao"
                />
              </FormField>
            </View>
            <View style={{ flex: 1 }}>
              <FormField label="Duração estimada" hint="dias para próxima revisão" C={C}>
                <TextInput
                  style={inputStyle}
                  value={duracaoDias}
                  onChangeText={setDuracaoDias}
                  placeholder="180"
                  placeholderTextColor={C.textTertiary}
                  keyboardType="numeric"
                  testID="input-duracao-dias"
                />
              </FormField>
            </View>
          </View>
        </View>

        <Pressable
          style={({ pressed }) => [s.saveBtn, { opacity: pressed ? 0.8 : 1 }]}
          onPress={handleSave}
          disabled={loading}
          testID="button-salvar-servico"
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Feather name="settings" size={18} color="#fff" />
              <Text style={s.saveBtnText}>Salvar Serviço</Text>
            </>
          )}
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
