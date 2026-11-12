import type { CompressorApiType } from './index'

declare global {
  interface Window {
    compressorApi: CompressorApiType
  }
}

