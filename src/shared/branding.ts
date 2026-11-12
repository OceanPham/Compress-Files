export const APP_BRANDING = {
  author: 'Ngọc Huy Dev',
  organization: 'Ocean Labs',
  websiteUrl: 'https://oceanlabs.pro.vn/',
  websiteLabel: 'oceanlabs.pro.vn',
  supportPhone: '0876557737',
  zaloUrl: 'https://zalo.me/0876557737'
} as const

export type SupportLink = 'website' | 'zalo'

export type SupportActionResult = { ok: true } | { ok: false; error: string }
