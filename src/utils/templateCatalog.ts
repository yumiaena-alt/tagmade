/**
 * Template catalog: the thumbnails a user browses in the studio's left panel.
 *
 * Every template is plain document data, so the same definition renders the SVG
 * thumbnail, the interactive canvas, and (later) the PDF. Adding a template is a
 * data edit, not a new renderer.
 */
import type { DocElement, FlatDocument, LabelDocument, TextAlign } from './documentModel';
import { toPagedDocument } from './documentModel';

export const TEMPLATE_CATEGORIES = [
  'care-label',
  'hang-tag',
  'import-label',
  'kc-mark',
  'logistics-seal',
  'custom',
] as const;

export type TemplateCategory = typeof TEMPLATE_CATEGORIES[number];

export type Template = {
  readonly id: string;
  readonly category: TemplateCategory;
  /** Short name shown under the thumbnail. */
  readonly nameKey: string;
  readonly document: LabelDocument;
};

type TextInit = {
  id: string;
  labelKey: DocElement['labelKey'];
  x: number;
  y: number;
  width: number;
  size: number;
  text: string;
  bold?: boolean;
  align?: TextAlign;
  muted?: boolean;
};

function text(init: TextInit): DocElement {
  return {
    type: 'text',
    id: init.id,
    labelKey: init.labelKey,
    x: init.x,
    y: init.y,
    width: init.width,
    fontSize: init.size,
    text: init.text,
    bold: init.bold,
    align: init.align,
    muted: init.muted,
  };
}

/** Label rows for the customs declaration templates. */
function row(
  id: string,
  labelKey: DocElement['labelKey'],
  y: number,
  caption: string,
  content: string,
  pageWidth: number,
): readonly DocElement[] {
  return [
    text({
      id: `${id}-caption`,
      labelKey: 'field_text',
      x: 4,
      y,
      width: 17,
      size: 2.1,
      text: caption,
      muted: true,
    }),
    text({
      id,
      labelKey,
      x: 21,
      y,
      width: pageWidth - 25,
      size: 2.1,
      text: content,
    }),
  ];
}

const CARE_LABEL_STANDARD: FlatDocument = {
  templateId: 'care-label-standard',
  widthMm: 30,
  heightMm: 70,
  elements: [
    text({ id: 'brand', labelKey: 'field_brand', x: 2.5, y: 3, width: 25, size: 3.2, text: 'BVRI', bold: true }),
    text({ id: 'meta', labelKey: 'field_size', x: 2.5, y: 7.4, width: 25, size: 1.6, text: 'SIZE S   MADE IN KOREA', muted: true }),
    text({ id: 'composition-caption', labelKey: 'field_text', x: 2.5, y: 12, width: 25, size: 1.5, text: '혼용률', muted: true }),
    {
      type: 'careSymbols',
      id: 'care',
      labelKey: 'field_care_symbols',
      x: 2.5,
      y: 26,
      composition: '면 80% 폴리 20%',
      glyphWidth: 4.3,
      gap: 0.7,
    },
    {
      type: 'barcode',
      id: 'sku',
      labelKey: 'field_barcode',
      x: 2.5,
      y: 38,
      value: 'BVRI-2026-TS-S',
      width: 24,
      height: 8,
      showValue: true,
    },
    text({ id: 'notes', labelKey: 'field_caution', x: 2.5, y: 52, width: 25, size: 1.5, text: '· 단독 세탁 권장\n· 비틀어 짜지 마세요', muted: true }),
  ],
};

const CARE_LABEL_WIDE: FlatDocument = {
  templateId: 'care-label-wide',
  widthMm: 45,
  heightMm: 35,
  elements: [
    text({ id: 'brand', labelKey: 'field_brand', x: 3, y: 3, width: 39, size: 3.6, text: 'BVRI', bold: true, align: 'center' }),
    { type: 'divider', id: 'rule', labelKey: 'field_divider', x: 3, y: 8.5, width: 39 },
    text({ id: 'composition-caption', labelKey: 'field_text', x: 3, y: 10.5, width: 39, size: 1.6, text: '면 80% 폴리에스터 20%', align: 'center' }),
    {
      type: 'careSymbols',
      id: 'care',
      labelKey: 'field_care_symbols',
      x: 6.5,
      y: 15,
      composition: '면 80% 폴리 20%',
      glyphWidth: 6,
      gap: 1,
    },
    text({ id: 'notes', labelKey: 'field_caution', x: 3, y: 27, width: 39, size: 1.4, text: '· 단독 세탁 권장', muted: true, align: 'center' }),
  ],
};

const HANG_TAG_CLASSIC: FlatDocument = {
  templateId: 'hang-tag-classic',
  widthMm: 50,
  heightMm: 90,
  elements: [
    { type: 'hole', id: 'punch', labelKey: 'field_punch_hole', x: 23, y: 5, radius: 2 },
    text({ id: 'brand', labelKey: 'field_brand', x: 5, y: 16, width: 40, size: 5, text: 'BVRI', bold: true }),
    text({ id: 'product', labelKey: 'field_product_name', x: 5, y: 24, width: 40, size: 2.8, text: '오버사이즈 코튼 티셔츠', muted: true }),
    text({ id: 'price', labelKey: 'field_price', x: 5, y: 31, width: 40, size: 4, text: '39,000원', bold: true }),
    { type: 'divider', id: 'rule', labelKey: 'field_divider', x: 5, y: 39, width: 40 },
    text({ id: 'policy', labelKey: 'field_exchange_policy', x: 5, y: 42, width: 40, size: 2.2, text: '교환·환불은 택 제거 전 14일 내 가능합니다.', muted: true }),
    { type: 'qr', id: 'qr', labelKey: 'field_qr', x: 15, y: 60, url: 'https://bvri.example/ts-s', size: 20 },
  ],
};

const HANG_TAG_MINIMAL: FlatDocument = {
  templateId: 'hang-tag-minimal',
  widthMm: 40,
  heightMm: 70,
  elements: [
    { type: 'hole', id: 'punch', labelKey: 'field_punch_hole', x: 18, y: 4, radius: 1.8 },
    text({ id: 'brand', labelKey: 'field_brand', x: 4, y: 14, width: 32, size: 4.2, text: 'BVRI', bold: true, align: 'center' }),
    text({ id: 'price', labelKey: 'field_price', x: 4, y: 22, width: 32, size: 3.2, text: '39,000', align: 'center' }),
    { type: 'qr', id: 'qr', labelKey: 'field_qr', x: 11, y: 32, url: 'https://bvri.example', size: 18 },
    text({ id: 'sku-text', labelKey: 'field_sku', x: 4, y: 54, width: 32, size: 1.8, text: 'BVRI-2026-TS-S', align: 'center', muted: true }),
  ],
};

const IMPORT_LABEL_FULL: FlatDocument = {
  templateId: 'import-label-full',
  widthMm: 70,
  heightMm: 50,
  elements: [
    { type: 'rect', id: 'frame', labelKey: 'field_shape', x: 2, y: 2, width: 66, height: 46, locked: true },
    ...row('product', 'field_product_name', 5, '제품명', '오버사이즈 코튼 티셔츠', 70),
    ...row('importer', 'field_importer', 10.2, '수입자', '(주)브리 · 서울시 강남구', 70),
    ...row('manufacturer', 'field_manufacturer', 15.4, '제조사', 'BVRI FACTORY', 70),
    ...row('origin', 'field_country_of_origin', 20.6, '제조국', '베트남', 70),
    ...row('material', 'field_material', 25.8, '소재', '면 80% 폴리에스터 20%', 70),
    ...row('size', 'field_size', 31, '치수', '가슴단면 55cm / 총장 70cm', 70),
    ...row('made-on', 'field_manufactured_on', 36.2, '제조연월', '2026.03', 70),
    ...row('caution', 'field_caution', 41.4, '취급주의', '첫 세탁 시 단독 세탁', 70),
  ],
};

const IMPORT_LABEL_COMPACT: FlatDocument = {
  templateId: 'import-label-compact',
  widthMm: 55,
  heightMm: 35,
  elements: [
    { type: 'rect', id: 'frame', labelKey: 'field_shape', x: 2, y: 2, width: 51, height: 31, locked: true },
    ...row('product', 'field_product_name', 5, '제품명', '코튼 티셔츠', 55),
    ...row('importer', 'field_importer', 10.2, '수입자', '(주)브리', 55),
    ...row('origin', 'field_country_of_origin', 15.4, '제조국', '베트남', 55),
    ...row('material', 'field_material', 20.6, '소재', '면 100%', 55),
    ...row('made-on', 'field_manufactured_on', 25.8, '제조연월', '2026.03', 55),
  ],
};

const KC_MARK_MICRO: FlatDocument = {
  templateId: 'kc-mark-micro',
  widthMm: 25,
  heightMm: 15,
  elements: [
    { type: 'rect', id: 'kc', labelKey: 'field_shape', x: 2, y: 3, width: 8, height: 8, dashed: true, radius: 1 },
    text({ id: 'kc-text', labelKey: 'field_text', x: 2, y: 5.4, width: 8, size: 3.4, text: 'KC', bold: true, align: 'center' }),
    text({ id: 'cert', labelKey: 'field_certification_number', x: 11.5, y: 3.2, width: 12, size: 1.9, text: 'KC-2026-A0417', bold: true }),
    text({ id: 'product', labelKey: 'field_product_name', x: 11.5, y: 6.2, width: 12, size: 1.6, text: '코튼 티셔츠', muted: true }),
    text({ id: 'origin', labelKey: 'field_country_of_origin', x: 11.5, y: 8.8, width: 12, size: 1.4, text: 'BVRI · 베트남', muted: true }),
  ],
};

const KC_MARK_STACKED: FlatDocument = {
  templateId: 'kc-mark-stacked',
  widthMm: 20,
  heightMm: 24,
  elements: [
    { type: 'rect', id: 'kc', labelKey: 'field_shape', x: 5.5, y: 2, width: 9, height: 9, dashed: true, radius: 1 },
    text({ id: 'kc-text', labelKey: 'field_text', x: 5.5, y: 4.6, width: 9, size: 3.8, text: 'KC', bold: true, align: 'center' }),
    text({ id: 'cert', labelKey: 'field_certification_number', x: 2, y: 13, width: 16, size: 1.8, text: 'KC-2026-A0417', bold: true, align: 'center' }),
    text({ id: 'product', labelKey: 'field_product_name', x: 2, y: 16.5, width: 16, size: 1.5, text: '코튼 티셔츠', align: 'center', muted: true }),
    text({ id: 'origin', labelKey: 'field_country_of_origin', x: 2, y: 19.5, width: 16, size: 1.4, text: '베트남', align: 'center', muted: true }),
  ],
};

const LOGISTICS_SEAL_POLYBAG: FlatDocument = {
  templateId: 'logistics-seal-polybag',
  widthMm: 60,
  heightMm: 30,
  elements: [
    {
      type: 'barcode',
      id: 'sku',
      labelKey: 'field_barcode',
      x: 3,
      y: 4,
      value: 'BVRI-BOX-0042',
      width: 32,
      height: 11,
      showValue: true,
    },
    { type: 'divider', id: 'rule', labelKey: 'field_divider', x: 38, y: 4, width: 0.4 },
    text({ id: 'product', labelKey: 'field_product_name', x: 41, y: 5, width: 16, size: 2.2, text: '코튼 티셔츠', bold: true }),
    text({ id: 'qty', labelKey: 'field_quantity', x: 41, y: 13, width: 16, size: 2, text: '30 EA', muted: true }),
    text({ id: 'box', labelKey: 'field_box_number', x: 41, y: 18, width: 16, size: 2, text: 'BOX 1/4', muted: true }),
  ],
};

const LOGISTICS_SEAL_CARTON: FlatDocument = {
  templateId: 'logistics-seal-carton',
  widthMm: 100,
  heightMm: 60,
  elements: [
    { type: 'rect', id: 'frame', labelKey: 'field_shape', x: 3, y: 3, width: 94, height: 54, locked: true },
    text({ id: 'product', labelKey: 'field_product_name', x: 6, y: 6, width: 88, size: 4.5, text: '오버사이즈 코튼 티셔츠', bold: true }),
    { type: 'divider', id: 'rule', labelKey: 'field_divider', x: 6, y: 14, width: 88 },
    {
      type: 'barcode',
      id: 'sku',
      labelKey: 'field_barcode',
      x: 6,
      y: 18,
      value: 'BVRI-BOX-0042',
      width: 55,
      height: 18,
      showValue: true,
    },
    text({ id: 'qty', labelKey: 'field_quantity', x: 66, y: 20, width: 28, size: 3.4, text: '30 EA' }),
    text({ id: 'box', labelKey: 'field_box_number', x: 66, y: 28, width: 28, size: 3.4, text: 'BOX 1 / 4' }),
    text({ id: 'origin', labelKey: 'field_country_of_origin', x: 6, y: 45, width: 88, size: 2.6, text: 'MADE IN VIETNAM', muted: true }),
  ],
};

const CARE_LABEL_MINI: FlatDocument = {
  templateId: 'care-label-mini',
  widthMm: 20,
  heightMm: 50,
  elements: [
    text({ id: 'brand', labelKey: 'field_brand', x: 2, y: 2.5, width: 16, size: 2.6, text: 'BVRI', bold: true, align: 'center' }),
    text({ id: 'composition', labelKey: 'field_material', x: 2, y: 7, width: 16, size: 1.5, text: '면 100%', align: 'center' }),
    {
      type: 'careSymbols',
      id: 'care',
      labelKey: 'field_care_symbols',
      x: 1.5,
      y: 12,
      composition: '면 100%',
      glyphWidth: 3.1,
      gap: 0.4,
    },
    {
      type: 'barcode',
      id: 'sku',
      labelKey: 'field_barcode',
      x: 2,
      y: 20,
      value: 'BVRI-M-001',
      width: 16,
      height: 7,
      showValue: true,
    },
    text({ id: 'origin', labelKey: 'field_country_of_origin', x: 2, y: 32, width: 16, size: 1.4, text: 'MADE IN KOREA', align: 'center', muted: true }),
  ],
};

const HANG_TAG_SQUARE: FlatDocument = {
  templateId: 'hang-tag-square',
  widthMm: 60,
  heightMm: 60,
  elements: [
    { type: 'hole', id: 'punch', labelKey: 'field_punch_hole', x: 28, y: 4, radius: 2 },
    text({ id: 'brand', labelKey: 'field_brand', x: 5, y: 14, width: 50, size: 6, text: 'BVRI', bold: true, align: 'center' }),
    { type: 'divider', id: 'rule', labelKey: 'field_divider', x: 12, y: 24, width: 36 },
    text({ id: 'product', labelKey: 'field_product_name', x: 5, y: 27, width: 50, size: 2.6, text: '오버사이지 코튼 티셔츠', align: 'center', muted: true }),
    text({ id: 'price', labelKey: 'field_price', x: 5, y: 33, width: 50, size: 4.4, text: '39,000원', bold: true, align: 'center' }),
    { type: 'qr', id: 'qr', labelKey: 'field_qr', x: 22, y: 40, url: 'https://bvri.example', size: 16 },
  ],
};

/**
 * Landscape hang tag: the punch hole moves to the left edge so the tag hangs
 * sideways, which leaves a wide column for the copy and room for the QR beside
 * it rather than under it.
 */
const HANG_TAG_WIDE: FlatDocument = {
  templateId: 'hang-tag-wide',
  widthMm: 90,
  heightMm: 50,
  elements: [
    { type: 'hole', id: 'punch', labelKey: 'field_punch_hole', x: 4, y: 23, radius: 2 },
    text({ id: 'brand', labelKey: 'field_brand', x: 12, y: 8, width: 44, size: 6, text: 'BVRI', bold: true }),
    text({ id: 'product', labelKey: 'field_product_name', x: 12, y: 17, width: 44, size: 2.6, text: '오버사이즈 코튼 티셔츠', muted: true }),
    text({ id: 'price', labelKey: 'field_price', x: 12, y: 23, width: 44, size: 4.4, text: '39,000원', bold: true }),
    { type: 'divider', id: 'rule', labelKey: 'field_divider', x: 12, y: 32, width: 44 },
    text({ id: 'policy', labelKey: 'field_exchange_policy', x: 12, y: 34.5, width: 44, size: 2, text: '교환·환불은 택 제거 전 14일 내 가능합니다.', muted: true }),
    { type: 'qr', id: 'qr', labelKey: 'field_qr', x: 62, y: 13, url: 'https://bvri.example/ts-s', size: 24 },
  ],
};

const IMPORT_LABEL_PORTRAIT: FlatDocument = {
  templateId: 'import-label-portrait',
  widthMm: 40,
  heightMm: 70,
  elements: [
    { type: 'rect', id: 'frame', labelKey: 'field_shape', x: 2, y: 2, width: 36, height: 66, locked: true },
    text({ id: 'heading', labelKey: 'field_text', x: 4, y: 4, width: 32, size: 2, text: '수입함 한글표시사항', bold: true }),
    { type: 'divider', id: 'rule', labelKey: 'field_divider', x: 4, y: 8, width: 32 },
    ...row('product', 'field_product_name', 11, '제품명', '코튼 티셔츠', 40),
    ...row('importer', 'field_importer', 18, '수입자', '(주)부리', 40),
    ...row('origin', 'field_country_of_origin', 25, '제조국', '베트남', 40),
    ...row('material', 'field_material', 32, '소재', '면 100%', 40),
    ...row('made-on', 'field_manufactured_on', 39, '제조연월', '2026.03', 40),
    text({ id: 'caution', labelKey: 'field_caution', x: 4, y: 48, width: 32, size: 1.6, text: '· 첫 세탁 시 단독 세탁', muted: true }),
  ],
};

const KC_MARK_WIDE: FlatDocument = {
  templateId: 'kc-mark-wide',
  widthMm: 35,
  heightMm: 12,
  elements: [
    { type: 'rect', id: 'kc', labelKey: 'field_shape', x: 1.5, y: 2, width: 8, height: 8, dashed: true, radius: 1 },
    text({ id: 'kc-text', labelKey: 'field_text', x: 1.5, y: 4.2, width: 8, size: 3.2, text: 'KC', bold: true, align: 'center' }),
    text({ id: 'cert', labelKey: 'field_certification_number', x: 11, y: 2.4, width: 22, size: 1.9, text: 'KC-2026-A0417', bold: true }),
    text({ id: 'product', labelKey: 'field_product_name', x: 11, y: 5.4, width: 22, size: 1.5, text: '코튼 티셔츠', muted: true }),
    text({ id: 'origin', labelKey: 'field_country_of_origin', x: 11, y: 7.8, width: 22, size: 1.4, text: 'BVRI · 베트남', muted: true }),
  ],
};

const LOGISTICS_SEAL_SMALL: FlatDocument = {
  templateId: 'logistics-seal-small',
  widthMm: 40,
  heightMm: 20,
  elements: [
    {
      type: 'barcode',
      id: 'sku',
      labelKey: 'field_barcode',
      x: 2.5,
      y: 2.5,
      value: 'BVRI-BOX-0042',
      width: 35,
      height: 9,
      showValue: true,
    },
    text({ id: 'qty', labelKey: 'field_quantity', x: 2.5, y: 15, width: 16, size: 1.8, text: '30 EA', muted: true }),
    text({ id: 'box', labelKey: 'field_box_number', x: 21, y: 15, width: 16, size: 1.8, text: 'BOX 1/4', align: 'right', muted: true }),
  ],
};

const CUSTOM_CARD: FlatDocument = {
  templateId: 'custom-card',
  widthMm: 90,
  heightMm: 50,
  elements: [],
};

const CUSTOM_BLANK: FlatDocument = {
  templateId: 'custom-blank',
  widthMm: 50,
  heightMm: 50,
  elements: [],
};

/**
 * A template as authored here: one page, elements inline.
 *
 * Templates are written flat because that is how they read — a list of what is
 * on the label. `TEMPLATES` pages them on the way out, so the rest of the app
 * only ever sees the paged shape.
 */
type TemplateInit = Omit<Template, 'document'> & {
  readonly document: FlatDocument;
};

const TEMPLATE_INITS: readonly TemplateInit[] = [
  { id: 'care-label-standard', category: 'care-label', nameKey: 'tpl_care_standard', document: CARE_LABEL_STANDARD },
  { id: 'care-label-wide', category: 'care-label', nameKey: 'tpl_care_wide', document: CARE_LABEL_WIDE },
  { id: 'care-label-mini', category: 'care-label', nameKey: 'tpl_care_mini', document: CARE_LABEL_MINI },
  { id: 'hang-tag-classic', category: 'hang-tag', nameKey: 'tpl_hang_classic', document: HANG_TAG_CLASSIC },
  { id: 'hang-tag-minimal', category: 'hang-tag', nameKey: 'tpl_hang_minimal', document: HANG_TAG_MINIMAL },
  { id: 'hang-tag-square', category: 'hang-tag', nameKey: 'tpl_hang_square', document: HANG_TAG_SQUARE },
  { id: 'hang-tag-wide', category: 'hang-tag', nameKey: 'tpl_hang_wide', document: HANG_TAG_WIDE },
  { id: 'import-label-full', category: 'import-label', nameKey: 'tpl_import_full', document: IMPORT_LABEL_FULL },
  { id: 'import-label-compact', category: 'import-label', nameKey: 'tpl_import_compact', document: IMPORT_LABEL_COMPACT },
  { id: 'import-label-portrait', category: 'import-label', nameKey: 'tpl_import_portrait', document: IMPORT_LABEL_PORTRAIT },
  { id: 'kc-mark-micro', category: 'kc-mark', nameKey: 'tpl_kc_micro', document: KC_MARK_MICRO },
  { id: 'kc-mark-stacked', category: 'kc-mark', nameKey: 'tpl_kc_stacked', document: KC_MARK_STACKED },
  { id: 'kc-mark-wide', category: 'kc-mark', nameKey: 'tpl_kc_wide', document: KC_MARK_WIDE },
  { id: 'logistics-seal-polybag', category: 'logistics-seal', nameKey: 'tpl_logistics_polybag', document: LOGISTICS_SEAL_POLYBAG },
  { id: 'logistics-seal-carton', category: 'logistics-seal', nameKey: 'tpl_logistics_carton', document: LOGISTICS_SEAL_CARTON },
  { id: 'logistics-seal-small', category: 'logistics-seal', nameKey: 'tpl_logistics_small', document: LOGISTICS_SEAL_SMALL },
  { id: 'custom-blank', category: 'custom', nameKey: 'tpl_custom_blank', document: CUSTOM_BLANK },
  { id: 'custom-card', category: 'custom', nameKey: 'tpl_custom_card', document: CUSTOM_CARD },
];

const TEMPLATES: readonly Template[] = TEMPLATE_INITS.map(template => ({
  ...template,
  document: toPagedDocument(template.document),
}));

export const DEFAULT_TEMPLATE_ID = 'care-label-standard';

export function findTemplate(id: string): Template | undefined {
  return TEMPLATES.find(template => template.id === id);
}

export function templatesByCategory(
  category: TemplateCategory,
): readonly Template[] {
  return TEMPLATES.filter(template => template.category === category);
}
