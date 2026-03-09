import { Document, Page, Text, View, Image, StyleSheet } from "@react-pdf/renderer";

export interface ResultPDFData {
  lab: { name: string; address: string | null; phone: string | null; logoBase64: string | null };
  patient: {
    firstName: string;
    lastName: string;
    documentType: string;
    documentNumber: string;
    dateOfBirth: string;
  };
  order: { orderNumber: string; createdAt: string; validatedAt: string };
  items: Array<{
    testName: string;
    value: string;
    unit: string | null;
    referenceRange: string | null;
    flag: string;
  }>;
  validatedByName: string;
  qrDataUrl: string;
  verificationCode: string;
}

const styles = StyleSheet.create({
  page: { padding: 40, fontFamily: "Helvetica", fontSize: 10, color: "#1a1a1a" },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 24,
    borderBottom: "1pt solid #e5e7eb",
    paddingBottom: 16,
  },
  labName: { fontSize: 16, fontFamily: "Helvetica-Bold" },
  labMeta: { fontSize: 8, color: "#6b7280", marginTop: 2 },
  sectionTitle: { fontSize: 11, fontFamily: "Helvetica-Bold", marginBottom: 8, marginTop: 16 },
  infoRow: { flexDirection: "row", marginBottom: 4 },
  infoLabel: { width: 120, color: "#6b7280" },
  table: { marginTop: 8 },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: "#f3f4f6",
    padding: "6 4",
    fontFamily: "Helvetica-Bold",
  },
  tableRow: {
    flexDirection: "row",
    padding: "5 4",
    borderBottom: "0.5pt solid #e5e7eb",
  },
  col1: { width: "35%" },
  col2: { width: "15%" },
  col3: { width: "12%" },
  col4: { width: "23%" },
  col5: { width: "15%" },
  footer: { position: "absolute", bottom: 40, left: 40, right: 40 },
  footerText: { fontSize: 8, color: "#6b7280", borderTop: "0.5pt solid #e5e7eb", paddingTop: 8 },
  qr: { width: 72, height: 72 },
  disclaimer: { fontSize: 7, color: "#9ca3af", marginTop: 8 },
  flagHigh: { color: "#dc2626" },
  flagLow: { color: "#d97706" },
  flagCritical: { color: "#7f1d1d", fontFamily: "Helvetica-Bold" },
});

const flagLabel: Record<string, string> = { normal: "N", high: "A", low: "B", critical: "C" };

export function ResultPDF({ data }: { data: ResultPDFData }) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header: lab info + QR */}
        <View style={styles.header}>
          <View>
            {data.lab.logoBase64 && (
              <Image
                src={data.lab.logoBase64}
                style={{ width: 60, height: 40, marginBottom: 6, objectFit: "contain" }}
              />
            )}
            <Text style={styles.labName}>{data.lab.name}</Text>
            {data.lab.address && <Text style={styles.labMeta}>{data.lab.address}</Text>}
            {data.lab.phone && <Text style={styles.labMeta}>Tel: {data.lab.phone}</Text>}
          </View>
          <View style={{ alignItems: "flex-end" }}>
            <Image src={data.qrDataUrl} style={styles.qr} />
            <Text style={{ fontSize: 7, color: "#6b7280", marginTop: 4 }}>
              Verificar en labflash.co
            </Text>
          </View>
        </View>

        {/* Patient info */}
        <Text style={styles.sectionTitle}>Informacion del Paciente</Text>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Nombre:</Text>
          <Text>
            {data.patient.firstName} {data.patient.lastName}
          </Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Documento:</Text>
          <Text>
            {data.patient.documentType} {data.patient.documentNumber}
          </Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Fecha de nacimiento:</Text>
          <Text>{data.patient.dateOfBirth}</Text>
        </View>

        {/* Order info */}
        <Text style={styles.sectionTitle}>Informacion de la Orden</Text>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>N de orden:</Text>
          <Text>{data.order.orderNumber}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Fecha de muestra:</Text>
          <Text>{data.order.createdAt}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Fecha de validacion:</Text>
          <Text>{data.order.validatedAt}</Text>
        </View>

        {/* Results table */}
        <Text style={styles.sectionTitle}>Resultados</Text>
        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={styles.col1}>Examen</Text>
            <Text style={styles.col2}>Resultado</Text>
            <Text style={styles.col3}>Unidad</Text>
            <Text style={styles.col4}>Rango de referencia</Text>
            <Text style={styles.col5}>Bandera</Text>
          </View>
          {data.items.map((item, i) => (
            <View key={i} style={styles.tableRow}>
              <Text style={styles.col1}>{item.testName}</Text>
              <Text style={styles.col2}>{item.value}</Text>
              <Text style={styles.col3}>{item.unit ?? "\u2014"}</Text>
              <Text style={styles.col4}>{item.referenceRange ?? "\u2014"}</Text>
              <Text
                style={[
                  styles.col5,
                  item.flag === "high"
                    ? styles.flagHigh
                    : item.flag === "low"
                      ? styles.flagLow
                      : item.flag === "critical"
                        ? styles.flagCritical
                        : {},
                ]}
              >
                {flagLabel[item.flag] ?? item.flag}
              </Text>
            </View>
          ))}
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            Validado por: {data.validatedByName} — {data.order.validatedAt}
          </Text>
          <Text style={styles.disclaimer}>
            Este documento es un resultado medico oficial emitido por {data.lab.name}. Codigo de
            verificacion: {data.verificationCode}. Puede verificar la autenticidad de este
            resultado en https://labflash.co/verify/{data.verificationCode}
          </Text>
        </View>
      </Page>
    </Document>
  );
}
