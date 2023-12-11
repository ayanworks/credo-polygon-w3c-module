import { Buffer } from '@aries-framework/core'

/**
 * PolygonModuleConfigOptions defines the interface for the options of the PolygonModuleConfig class.
 */
export interface PolygonModuleConfigOptions {
  rpcUrl: string
  contractAddress: string
  privateKey: Buffer
}

export class PolygonModuleConfig {
  public readonly rpcUrl!: string
  public readonly contractAddress!: string
  public readonly privateKey!: Buffer

  public constructor(options: PolygonModuleConfigOptions) {
    this.rpcUrl = options.rpcUrl
    this.contractAddress = options.contractAddress
    this.privateKey = options.privateKey
  }
}
