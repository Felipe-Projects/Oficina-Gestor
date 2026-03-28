import { Feather } from "@expo/vector-icons";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Modal,
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
import { apiGet, apiPost } from "@/utils/api";

function todayDisplay() {
  const d = new Date();
  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
}

function parseDateInput(str: string): string {
  const parts = str.split("/");
  if (parts.length === 3 && parts[2].length === 4) {
    return `${parts[2]}-${parts[1].padStart(2, "0")}-${parts[0].padStart(2, "0")}`;
  }
  return str;
}

function formatCurrency(val: number) {
  return `R$ ${val.toFixed(2).replace(".", ",").replace(/\B(?=(\d{3})+(?!\d))/g, ".")}`;
}

const STATUS_OPTIONS = [
  { key: "orcamento", label: "Orçamento", color: "#2563EB" },
  { key: "em_andamento", label: "Em andamento", color: "#D97706" },
  { key: "finalizado", label: "Finalizado", color: "#059669" },
  { key: "entregue", label: "Entregue", color: "#7C3AED" },
];

type ServicoItem = { servicoId: number; nome: string; valor: number };
type PecaItem = {
  pecaId: number;
  nome: string;
  quantidade: number;
  valorUnitario: number;
};

function PickerModal({
  visible,
  title,
  data,
  onClose,
  onSelect,
  keyField,
  renderItem,
  C,
}: {
  visible: boolean;
  title: string;
  data: any[];
  onClose: () => void;
  onSelect: (item: any) => void;
  keyField: string;
  renderItem: (item: any) => React.ReactNode;
  C: typeof Colors.light;
}) {
  const [search, setSearch] = useState("");
  const filtered = search
    ? data.filter((item) =>
        JSON.stringify(item).toLowerCase().includes(search.toLowerCase())
      )
    : data;

  return (
    <Modal visible={visible} animationType="slide">
      <View style={{ flex: 1, backgroundColor: C.background }}>
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            paddingHorizontal: 16,
            paddingTop: Platform.OS === "ios" ? 56 : 16,
            paddingBottom: 12,
            backgroundColor: C.card,
            borderBottomWidth: 1,
            borderBottomColor: C.border,
            gap: 12,
          }}
        >
          <Text
            style={{
              fontSize: 17,
              fontWeight: "700",
              fontFamily: "Inter_700Bold",
              color: C.text,
              flex: 1,
            }}
          >
            {title}
          </Text>
          <Pressable onPress={onClose}>
            <Feather name="x" size={22} color={C.text} />
          </Pressable>
        </View>
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            backgroundColor: C.card,
            borderRadius: 10,
            marginHorizontal: 16,
            marginVertical: 10,
            paddingHorizontal: 10,
            borderWidth: 1,
            borderColor: C.border,
          }}
        >
          <Feather name="search" size={16} color={C.textTertiary} />
          <TextInput
            style={{
              flex: 1,
              height: 40,
              color: C.text,
              fontSize: 14,
              fontFamily: "Inter_400Regular",
              paddingLeft: 6,
            }}
            placeholder="Buscar..."
            placeholderTextColor={C.textTertiary}
            value={search}
            onChangeText={setSearch}
            autoFocus
          />
        </View>
        <FlatList
          data={filtered}
          keyExtractor={(item) => String(item[keyField])}
          renderItem={({ item }) => (
            <Pressable
              style={({ pressed }) => ({
                paddingHorizontal: 16,
                paddingVertical: 14,
                borderBottomWidth: 1,
                borderBottomColor: C.border,
                opacity: pressed ? 0.7 : 1,
              })}
              onPress={() => {
                onSelect(item);
                onClose();
              }}
            >
              {renderItem(item)}
            </Pressable>
          )}
        />
      </View>
    </Modal>
  );
}

export default function NovaOSScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const C = isDark ? Colors.dark : Colors.light;
  const router = useRouter();
  const queryClient = useQueryClient();

  const [clienteId, setClienteId] = useState<number | null>(null);
  const [clienteNome, setClienteNome] = useState("");
  const [veiculoId, setVeiculoId] = useState<number | null>(null);
  const [veiculoNome, setVeiculoNome] = useState("");
  const [responsavel, setResponsavel] = useState("");
  const [status, setStatus] = useState("orcamento");
  const [dataEntrada, setDataEntrada] = useState(todayDisplay());
  const [dataPrevisao, setDataPrevisao] = useState("");
  const [observacoes, setObservacoes] = useState("");
  const [servicos, setServicos] = useState<ServicoItem[]>([]);
  const [pecas, setPecas] = useState<PecaItem[]>([]);

  const [showClientePicker, setShowClientePicker] = useState(false);
  const [showVeiculoPicker, setShowVeiculoPicker] = useState(false);
  const [showServicoPicker, setShowServicoPicker] = useState(false);
  const [showPecaPicker, setShowPecaPicker] = useState(false);
  const [loading, setLoading] = useState(false);

  const { data: clientes } = useQuery({
    queryKey: ["/api/clientes"],
    queryFn: () => apiGet("/api/clientes"),
  });

  const { data: veiculos } = useQuery({
    queryKey: ["/api/veiculos"],
    queryFn: () => apiGet("/api/veiculos"),
    enabled: !!clienteId,
  });

  const { data: catalogServicos } = useQuery({
    queryKey: ["/api/servicos"],
    queryFn: () => apiGet("/api/servicos"),
  });

  const { data: catalogPecas } = useQuery({
    queryKey: ["/api/pecas"],
    queryFn: () => apiGet("/api/pecas"),
  });

  const veiculosDoCliente = Array.isArray(veiculos)
    ? veiculos.filter((v: any) => v.clienteId === clienteId)
    : [];

  function addServico(s: any) {
    const exists = servicos.find((x) => x.servicoId === s.id);
    if (exists) return;
    setServicos((prev) => [
      ...prev,
      { servicoId: s.id, nome: s.nome, valor: parseFloat(s.valorPadrao) || 0 },
    ]);
  }

  function removeServico(id: number) {
    setServicos((prev) => prev.filter((x) => x.servicoId !== id));
  }

  function updateServicoValor(id: number, val: string) {
    const num = parseFloat(val.replace(",", ".")) || 0;
    setServicos((prev) =>
      prev.map((x) => (x.servicoId === id ? { ...x, valor: num } : x))
    );
  }

  function addPeca(p: any) {
    const exists = pecas.find((x) => x.pecaId === p.id);
    if (exists) return;
    setPecas((prev) => [
      ...prev,
      {
        pecaId: p.id,
        nome: p.nome,
        quantidade: 1,
        valorUnitario: parseFloat(p.valorVenda) || 0,
      },
    ]);
  }

  function removePeca(id: number) {
    setPecas((prev) => prev.filter((x) => x.pecaId !== id));
  }

  function updatePecaQty(id: number, qty: string) {
    const num = parseInt(qty) || 1;
    setPecas((prev) =>
      prev.map((x) => (x.pecaId === id ? { ...x, quantidade: Math.max(1, num) } : x))
    );
  }

  const totalServicos = servicos.reduce((s, x) => s + x.valor, 0);
  const totalPecas = pecas.reduce((s, x) => s + x.valorUnitario * x.quantidade, 0);
  const total = totalServicos + totalPecas;

  async function handleSave() {
    if (!clienteId) {
      Alert.alert("Atenção", "Selecione o cliente.");
      return;
    }
    if (!veiculoId) {
      Alert.alert("Atenção", "Selecione o veículo.");
      return;
    }
    if (!responsavel.trim()) {
      Alert.alert("Atenção", "Responsável é obrigatório.");
      return;
    }
    if (!dataEntrada.trim()) {
      Alert.alert("Atenção", "Data de entrada é obrigatória.");
      return;
    }
    setLoading(true);
    try {
      await apiPost("/api/ordens", {
        clienteId,
        veiculoId,
        responsavel: responsavel.trim(),
        status,
        dataEntrada: parseDateInput(dataEntrada),
        dataPrevisao: dataPrevisao ? parseDateInput(dataPrevisao) : undefined,
        observacoes: observacoes.trim() || undefined,
        servicos: servicos.map((s) => ({ servicoId: s.servicoId, valor: s.valor })),
        pecas: pecas.map((p) => ({
          pecaId: p.pecaId,
          quantidade: p.quantidade,
          valorUnitario: p.valorUnitario,
        })),
      });
      queryClient.invalidateQueries({ queryKey: ["/api/ordens"] });
      router.back();
    } catch (e: any) {
      Alert.alert("Erro", e.message || "Não foi possível criar a OS.");
    } finally {
      setLoading(false);
    }
  }

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
    label: {
      fontSize: 13,
      fontWeight: "600",
      fontFamily: "Inter_600SemiBold",
      color: C.textSecondary,
      marginBottom: 6,
    },
    fieldWrap: { marginBottom: 16 },
    picker: {
      backgroundColor: C.background,
      borderWidth: 1,
      borderColor: C.border,
      borderRadius: 10,
      paddingHorizontal: 14,
      paddingVertical: 13,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },
    pickerText: { fontSize: 15, fontFamily: "Inter_400Regular", color: C.text, flex: 1 },
    pickerPlaceholder: {
      fontSize: 15,
      fontFamily: "Inter_400Regular",
      color: C.textTertiary,
      flex: 1,
    },
    statusRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
    statusChip: {
      paddingHorizontal: 12,
      paddingVertical: 7,
      borderRadius: 20,
      borderWidth: 1.5,
    },
    statusText: { fontSize: 12, fontWeight: "600", fontFamily: "Inter_600SemiBold" },
    row: { flexDirection: "row", gap: 12 },
    addBtn: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 6,
      paddingVertical: 10,
      borderRadius: 8,
      borderWidth: 1.5,
      borderStyle: "dashed",
      borderColor: C.primary,
      marginTop: 4,
    },
    addBtnText: {
      fontSize: 14,
      fontWeight: "600",
      fontFamily: "Inter_600SemiBold",
      color: C.primary,
    },
    itemRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      paddingVertical: 8,
      borderBottomWidth: 1,
      borderBottomColor: C.border,
    },
    itemName: { fontSize: 14, fontFamily: "Inter_500Medium", color: C.text, flex: 1 },
    itemVal: {
      fontSize: 13,
      fontFamily: "Inter_400Regular",
      color: C.primary,
    },
    qtyInput: {
      borderWidth: 1,
      borderColor: C.border,
      borderRadius: 6,
      paddingHorizontal: 8,
      paddingVertical: 4,
      width: 48,
      fontSize: 14,
      fontFamily: "Inter_400Regular",
      color: C.text,
      textAlign: "center",
    },
    totalBox: {
      backgroundColor: C.primaryLight,
      borderRadius: 10,
      padding: 14,
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: 16,
    },
    totalLabel: { fontSize: 14, fontFamily: "Inter_600SemiBold", color: C.textSecondary },
    totalValue: { fontSize: 18, fontWeight: "700", fontFamily: "Inter_700Bold", color: C.primary },
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
        {/* Cliente e Veículo */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>Cliente e Veículo</Text>

          <View style={s.fieldWrap}>
            <Text style={s.label}>
              Cliente <Text style={{ color: C.danger }}>*</Text>
            </Text>
            <Pressable
              style={({ pressed }) => [s.picker, { opacity: pressed ? 0.7 : 1 }]}
              onPress={() => setShowClientePicker(true)}
              testID="button-pick-cliente"
            >
              {clienteNome ? (
                <Text style={s.pickerText}>{clienteNome}</Text>
              ) : (
                <Text style={s.pickerPlaceholder}>Selecionar cliente...</Text>
              )}
              <Feather name="chevron-down" size={16} color={C.textTertiary} />
            </Pressable>
          </View>

          <View style={s.fieldWrap}>
            <Text style={s.label}>
              Veículo <Text style={{ color: C.danger }}>*</Text>
            </Text>
            <Pressable
              style={({ pressed }) => [
                s.picker,
                { opacity: !clienteId ? 0.5 : pressed ? 0.7 : 1 },
              ]}
              onPress={() => clienteId && setShowVeiculoPicker(true)}
              testID="button-pick-veiculo"
              disabled={!clienteId}
            >
              {veiculoNome ? (
                <Text style={s.pickerText}>{veiculoNome}</Text>
              ) : (
                <Text style={s.pickerPlaceholder}>
                  {clienteId ? "Selecionar veículo..." : "Selecione o cliente primeiro"}
                </Text>
              )}
              <Feather name="chevron-down" size={16} color={C.textTertiary} />
            </Pressable>
          </View>
        </View>

        {/* Dados da OS */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>Dados da OS</Text>

          <View style={s.fieldWrap}>
            <Text style={s.label}>
              Responsável <Text style={{ color: C.danger }}>*</Text>
            </Text>
            <TextInput
              style={inputStyle}
              value={responsavel}
              onChangeText={setResponsavel}
              placeholder="Nome do mecânico responsável"
              placeholderTextColor={C.textTertiary}
              autoCapitalize="words"
              testID="input-responsavel"
            />
          </View>

          <View style={s.fieldWrap}>
            <Text style={s.label}>Status</Text>
            <View style={s.statusRow}>
              {STATUS_OPTIONS.map((opt) => {
                const active = status === opt.key;
                return (
                  <Pressable
                    key={opt.key}
                    style={[
                      s.statusChip,
                      {
                        backgroundColor: active ? opt.color + "20" : C.background,
                        borderColor: active ? opt.color : C.border,
                      },
                    ]}
                    onPress={() => setStatus(opt.key)}
                    testID={`status-${opt.key}`}
                  >
                    <Text style={[s.statusText, { color: active ? opt.color : C.textSecondary }]}>
                      {opt.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          <View style={s.row}>
            <View style={{ flex: 1 }}>
              <View style={s.fieldWrap}>
                <Text style={s.label}>
                  Data de entrada <Text style={{ color: C.danger }}>*</Text>
                </Text>
                <TextInput
                  style={inputStyle}
                  value={dataEntrada}
                  onChangeText={setDataEntrada}
                  placeholder="DD/MM/AAAA"
                  placeholderTextColor={C.textTertiary}
                  keyboardType="numeric"
                  maxLength={10}
                  testID="input-data-entrada"
                />
              </View>
            </View>
            <View style={{ flex: 1 }}>
              <View style={s.fieldWrap}>
                <Text style={s.label}>Previsão de entrega</Text>
                <TextInput
                  style={inputStyle}
                  value={dataPrevisao}
                  onChangeText={setDataPrevisao}
                  placeholder="DD/MM/AAAA"
                  placeholderTextColor={C.textTertiary}
                  keyboardType="numeric"
                  maxLength={10}
                  testID="input-data-previsao"
                />
              </View>
            </View>
          </View>

          <View style={s.fieldWrap}>
            <Text style={s.label}>Observações</Text>
            <TextInput
              style={[inputStyle, { minHeight: 80, textAlignVertical: "top" }]}
              value={observacoes}
              onChangeText={setObservacoes}
              placeholder="Informações adicionais..."
              placeholderTextColor={C.textTertiary}
              multiline
              testID="input-observacoes"
            />
          </View>
        </View>

        {/* Serviços */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>Serviços</Text>
          {servicos.map((sv) => (
            <View key={sv.servicoId} style={s.itemRow}>
              <Text style={s.itemName}>{sv.nome}</Text>
              <TextInput
                style={[s.qtyInput, { width: 90 }]}
                value={String(sv.valor.toFixed(2).replace(".", ","))}
                onChangeText={(v) => updateServicoValor(sv.servicoId, v)}
                keyboardType="decimal-pad"
                placeholder="0,00"
                placeholderTextColor={C.textTertiary}
              />
              <Pressable
                onPress={() => removeServico(sv.servicoId)}
                hitSlop={8}
                testID={`remove-servico-${sv.servicoId}`}
              >
                <Feather name="trash-2" size={16} color={C.danger} />
              </Pressable>
            </View>
          ))}
          <Pressable
            style={({ pressed }) => [s.addBtn, { opacity: pressed ? 0.7 : 1, marginTop: servicos.length > 0 ? 12 : 4 }]}
            onPress={() => setShowServicoPicker(true)}
            testID="button-add-servico"
          >
            <Feather name="plus" size={16} color={C.primary} />
            <Text style={s.addBtnText}>Adicionar serviço</Text>
          </Pressable>
        </View>

        {/* Peças */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>Peças utilizadas</Text>
          {pecas.map((p) => (
            <View key={p.pecaId} style={s.itemRow}>
              <View style={{ flex: 1 }}>
                <Text style={s.itemName}>{p.nome}</Text>
                <Text style={{ fontSize: 11, color: C.textTertiary, fontFamily: "Inter_400Regular" }}>
                  {formatCurrency(p.valorUnitario)} / un
                </Text>
              </View>
              <TextInput
                style={s.qtyInput}
                value={String(p.quantidade)}
                onChangeText={(v) => updatePecaQty(p.pecaId, v)}
                keyboardType="numeric"
                maxLength={4}
              />
              <Text style={[s.itemVal, { minWidth: 70, textAlign: "right" }]}>
                {formatCurrency(p.valorUnitario * p.quantidade)}
              </Text>
              <Pressable
                onPress={() => removePeca(p.pecaId)}
                hitSlop={8}
                testID={`remove-peca-${p.pecaId}`}
              >
                <Feather name="trash-2" size={16} color={C.danger} />
              </Pressable>
            </View>
          ))}
          <Pressable
            style={({ pressed }) => [s.addBtn, { opacity: pressed ? 0.7 : 1, marginTop: pecas.length > 0 ? 12 : 4 }]}
            onPress={() => setShowPecaPicker(true)}
            testID="button-add-peca"
          >
            <Feather name="plus" size={16} color={C.primary} />
            <Text style={s.addBtnText}>Adicionar peça</Text>
          </Pressable>
        </View>

        {/* Total */}
        <View style={s.totalBox}>
          <Text style={s.totalLabel}>Total estimado</Text>
          <Text style={s.totalValue}>{formatCurrency(total)}</Text>
        </View>

        <Pressable
          style={({ pressed }) => [s.saveBtn, { opacity: pressed ? 0.8 : 1 }]}
          onPress={handleSave}
          disabled={loading}
          testID="button-criar-os"
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Feather name="file-plus" size={18} color="#fff" />
              <Text style={s.saveBtnText}>Criar Ordem de Serviço</Text>
            </>
          )}
        </Pressable>
      </ScrollView>

      {/* Cliente Picker Modal */}
      <PickerModal
        visible={showClientePicker}
        title="Selecionar Cliente"
        data={Array.isArray(clientes) ? clientes : []}
        onClose={() => setShowClientePicker(false)}
        onSelect={(item) => {
          setClienteId(item.id);
          setClienteNome(item.nome);
          setVeiculoId(null);
          setVeiculoNome("");
        }}
        keyField="id"
        renderItem={(item) => (
          <>
            <Text
              style={{ fontSize: 15, fontFamily: "Inter_600SemiBold", color: C.text }}
            >
              {item.nome}
            </Text>
            <Text
              style={{
                fontSize: 12,
                color: C.textSecondary,
                fontFamily: "Inter_400Regular",
                marginTop: 2,
              }}
            >
              {item.telefone}
            </Text>
          </>
        )}
        C={C}
      />

      {/* Veículo Picker Modal */}
      <PickerModal
        visible={showVeiculoPicker}
        title="Selecionar Veículo"
        data={veiculosDoCliente}
        onClose={() => setShowVeiculoPicker(false)}
        onSelect={(item) => {
          setVeiculoId(item.id);
          setVeiculoNome(`${item.marca} ${item.modelo} (${item.placa})`);
        }}
        keyField="id"
        renderItem={(item) => (
          <>
            <Text
              style={{ fontSize: 15, fontFamily: "Inter_600SemiBold", color: C.text }}
            >
              {item.marca} {item.modelo}
            </Text>
            <Text
              style={{
                fontSize: 12,
                color: C.textSecondary,
                fontFamily: "Inter_400Regular",
                marginTop: 2,
              }}
            >
              {item.placa} • {item.ano}
            </Text>
          </>
        )}
        C={C}
      />

      {/* Serviço Picker Modal */}
      <PickerModal
        visible={showServicoPicker}
        title="Adicionar Serviço"
        data={Array.isArray(catalogServicos) ? catalogServicos : []}
        onClose={() => setShowServicoPicker(false)}
        onSelect={(item) => addServico(item)}
        keyField="id"
        renderItem={(item) => (
          <>
            <Text
              style={{ fontSize: 15, fontFamily: "Inter_600SemiBold", color: C.text }}
            >
              {item.nome}
            </Text>
            <Text
              style={{
                fontSize: 12,
                color: C.textSecondary,
                fontFamily: "Inter_400Regular",
                marginTop: 2,
              }}
            >
              {formatCurrency(parseFloat(item.valorPadrao) || 0)}
              {item.descricao ? ` • ${item.descricao}` : ""}
            </Text>
          </>
        )}
        C={C}
      />

      {/* Peça Picker Modal */}
      <PickerModal
        visible={showPecaPicker}
        title="Adicionar Peça"
        data={Array.isArray(catalogPecas) ? catalogPecas : []}
        onClose={() => setShowPecaPicker(false)}
        onSelect={(item) => addPeca(item)}
        keyField="id"
        renderItem={(item) => (
          <>
            <Text
              style={{ fontSize: 15, fontFamily: "Inter_600SemiBold", color: C.text }}
            >
              {item.nome}
            </Text>
            <Text
              style={{
                fontSize: 12,
                color: C.textSecondary,
                fontFamily: "Inter_400Regular",
                marginTop: 2,
              }}
            >
              Venda: {formatCurrency(parseFloat(item.valorVenda) || 0)} •
              Estoque: {item.quantidade} un
            </Text>
          </>
        )}
        C={C}
      />
    </KeyboardAvoidingView>
  );
}
