import { numberToWords } from '@/lib/toWords';
import type { InvoiceData } from '@/types/invoice';
import notoSansLatin from '@fontsource/noto-sans/files/noto-sans-latin-400-normal.woff';
import notoSansLatinBold from '@fontsource/noto-sans/files/noto-sans-latin-700-normal.woff';
import notoSansLatinExt from '@fontsource/noto-sans/files/noto-sans-latin-ext-400-normal.woff';
import notoSansLatinExtBold from '@fontsource/noto-sans/files/noto-sans-latin-ext-700-normal.woff';
import {
  Document,
  Font,
  Page,
  Text as ReactPdfText,
  StyleSheet,
  View,
} from '@react-pdf/renderer';
import { Children, type ComponentProps, type ReactNode } from 'react';

Font.register({
  family: 'Noto Sans Latin',
  src: notoSansLatin,
  fontWeight: 400,
});
Font.register({
  family: 'Noto Sans Latin',
  src: notoSansLatinBold,
  fontWeight: 700,
});
Font.register({
  family: 'Noto Sans Latin Ext',
  src: notoSansLatinExt,
  fontWeight: 400,
});
Font.register({
  family: 'Noto Sans Latin Ext',
  src: notoSansLatinExtBold,
  fontWeight: 700,
});

const latinExtRanges = [
  [0x0100, 0x02ba],
  [0x02bd, 0x02c5],
  [0x02c7, 0x02cc],
  [0x02ce, 0x02d7],
  [0x02dd, 0x02ff],
  [0x0304, 0x0304],
  [0x0308, 0x0308],
  [0x0329, 0x0329],
  [0x1d00, 0x1dbf],
  [0x1e00, 0x1e9f],
  [0x1ef2, 0x1eff],
  [0x2020, 0x2020],
  [0x20a0, 0x20ab],
  [0x20ad, 0x20c0],
  [0x2113, 0x2113],
  [0x2c60, 0x2c7f],
  [0xa720, 0xa7ff],
] as const;

function Text({
  children: textChildren,
  style,
}: {
  children?: ReactNode;
  style?: ComponentProps<typeof Page>['style'];
}) {
  const children = Children.map(textChildren, (child) => {
    if (typeof child !== 'string') return child;

    const segments: { text: string; isLatinExt: boolean }[] = [];
    for (const character of child) {
      const codePoint = character.codePointAt(0);
      const isLatinExt =
        codePoint !== undefined &&
        latinExtRanges.some(
          ([start, end]) => codePoint >= start && codePoint <= end,
        );
      const previousSegment = segments.at(-1);

      if (previousSegment?.isLatinExt === isLatinExt) {
        previousSegment.text += character;
      } else {
        segments.push({ text: character, isLatinExt });
      }
    }

    return segments.map((segment, index) => (
      <ReactPdfText
        key={`${index}-${segment.text}`}
        style={{
          fontFamily: segment.isLatinExt
            ? 'Noto Sans Latin Ext'
            : 'Noto Sans Latin',
        }}
      >
        {segment.text}
      </ReactPdfText>
    ));
  });

  return <ReactPdfText style={style}>{children}</ReactPdfText>;
}

const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontFamily: 'Noto Sans Latin',
    fontSize: 10,
    color: '#212529',
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 24,
  },
  section: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    marginBottom: 6,
  },
  columns: {
    flexDirection: 'row',
    gap: 20,
    marginBottom: 16,
  },
  column: {
    flex: 1,
  },
  line: {
    marginBottom: 3,
  },
  tableRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderBottomWidth: 0.5,
    borderBottomColor: '#dee2e6',
    paddingVertical: 5,
  },
  tableLabel: {
    flex: 1,
  },
  tableValue: {
    width: 110,
    textAlign: 'right',
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: '#212529',
    marginTop: 4,
    paddingTop: 7,
    fontWeight: 'bold',
  },
  signatures: {
    flexDirection: 'row',
    gap: 40,
    marginTop: 48,
  },
  signature: {
    flex: 1,
    borderTopWidth: 0.75,
    borderTopColor: '#212529',
    paddingTop: 6,
  },
});

function formatCurrency(value: number): string {
  return `${value.toFixed(2).replace('.', ',')} zł`;
}

function PdfRow({
  label,
  value,
  bold = false,
}: {
  label: string;
  value: string;
  bold?: boolean;
}) {
  return (
    <View style={bold ? styles.totalRow : styles.tableRow}>
      <Text style={styles.tableLabel}>{label}</Text>
      <Text style={styles.tableValue}>{value}</Text>
    </View>
  );
}

export default function createInvoicePdfDocument(
  data: InvoiceData,
  invoiceNumber: string,
) {
  const { client, contractor, contract, remuneration, calculations } = data;

  return (
    <Document
      title={`Rachunek nr ${invoiceNumber}`}
      author='Invoice Creator'
      language='pl-PL'
    >
      <Page size='A4' style={styles.page} wrap>
        <Text style={styles.title}>RACHUNEK DO UMOWY ZLECENIA</Text>
        <Text style={[styles.line, { textAlign: 'center', marginBottom: 16 }]}>
          Numer rachunku: {invoiceNumber}
        </Text>

        <View style={styles.columns}>
          <View style={styles.column}>
            <Text style={styles.sectionTitle}>Zleceniodawca</Text>
            <Text style={styles.line}>{client.name}</Text>
            <Text style={styles.line}>{client.address}</Text>
            {client.type === 'company' && client.nip ? (
              <Text style={styles.line}>NIP: {client.nip}</Text>
            ) : null}
            {client.type === 'private' && client.pesel ? (
              <Text style={styles.line}>PESEL: {client.pesel}</Text>
            ) : null}
          </View>

          <View style={styles.column}>
            <Text style={styles.sectionTitle}>Zleceniobiorca</Text>
            <Text style={styles.line}>{contractor.name}</Text>
            <Text style={styles.line}>{contractor.address}</Text>
            <Text style={styles.line}>PESEL: {contractor.pesel}</Text>
            {contractor.nip ? (
              <Text style={styles.line}>NIP: {contractor.nip}</Text>
            ) : null}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Dane umowy</Text>
          {contract.number ? (
            <Text style={styles.line}>Numer umowy: {contract.number}</Text>
          ) : null}
          <Text style={styles.line}>Data zawarcia: {contract.date}</Text>
          <Text style={styles.line}>
            Okres rozliczeniowy: {contract.periodStart} – {contract.periodEnd}
          </Text>
          <Text style={styles.line}>
            Typ umowy:{' '}
            {contract.type === 'monthly' ? 'miesięczna' : 'godzinowa'}
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Wynagrodzenie i rozliczenie</Text>
          <PdfRow
            label='Wynagrodzenie brutto'
            value={formatCurrency(remuneration.gross)}
          />
          {remuneration.hourlyRate !== undefined &&
          remuneration.hoursWorked !== undefined ? (
            <PdfRow
              label={`Stawka godzinowa (${remuneration.hoursWorked} h)`}
              value={formatCurrency(remuneration.hourlyRate)}
            />
          ) : null}
          <PdfRow
            label='Składka emerytalna'
            value={formatCurrency(calculations.pensionContribution)}
          />
          <PdfRow
            label='Składka rentowa'
            value={formatCurrency(calculations.rentContribution)}
          />
          <PdfRow
            label='Składka chorobowa'
            value={formatCurrency(calculations.sicknessContribution)}
          />
          <PdfRow
            label='Razem składki społeczne'
            value={formatCurrency(calculations.totalSocialContributions)}
          />
          <PdfRow
            label='Podstawa składki zdrowotnej'
            value={formatCurrency(calculations.healthContributionBase)}
          />
          <PdfRow
            label='Składka zdrowotna'
            value={formatCurrency(calculations.healthContribution)}
          />
          {calculations.youngReliefIncomeApplied > 0 ? (
            <PdfRow
              label='Przychód zwolniony (ulga dla młodych)'
              value={formatCurrency(calculations.youngReliefIncomeApplied)}
            />
          ) : null}
          <PdfRow
            label='Koszty uzyskania przychodu'
            value={formatCurrency(calculations.taxDeductibleCosts)}
          />
          <PdfRow
            label='Podstawa opodatkowania'
            value={formatCurrency(calculations.taxableBase)}
          />
          {data.taxReduction ? (
            <>
              <PdfRow
                label='Zaliczka na PIT przed ulgą'
                value={formatCurrency(calculations.taxBeforeReduction)}
              />
              <PdfRow
                label='Ulga podatkowa'
                value={formatCurrency(calculations.taxReductionAmountApplied)}
              />
            </>
          ) : null}
          <PdfRow
            label='Zaliczka na PIT'
            value={formatCurrency(calculations.tax)}
          />
          <PdfRow
            label='Kwota netto do wypłaty'
            value={formatCurrency(calculations.net)}
            bold
          />
          <PdfRow label='Słownie' value={numberToWords(calculations.net)} />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Uwagi</Text>
          <Text>{data.notes || '—'}</Text>
        </View>

        <View style={styles.signatures}>
          <View style={styles.signature}>
            <Text>Podpis zleceniodawcy</Text>
          </View>
          <View style={styles.signature}>
            <Text>Podpis zleceniobiorcy</Text>
          </View>
        </View>
      </Page>
    </Document>
  );
}
