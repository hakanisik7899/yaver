/**
 * Details shown in the legal pages. Fill these in once the data controller
 * (person or company) and a contact address are settled, then set
 * `draft: false` to remove the draft banner.
 */
export const LEGAL = {
  /** Data controller: full name of the person, or the company's trade name. */
  controller: "[Ad Soyad / Şirket unvanı]",
  address: "[Açık adres]",
  /** Public contact address for KVKK requests and questions. */
  email: "[iletişim e-postası]",
  /** Date of the current version, shown on both pages. */
  updated: "22 Kasım 2026",
  draft: true,
} as const;
