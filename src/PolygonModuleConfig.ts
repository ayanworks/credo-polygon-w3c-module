/**
 * PolygonModuleConfigOptions defines the interface for the options of the PolygonModuleConfig class.
 */
export interface PolygonModuleConfigOptions {
  rpcUrl: string
  contractAddress: string
}

export class PolygonModuleConfig {
  public readonly rpcUrl!: string
  public readonly contractAddress!: string

  public constructor(options: PolygonModuleConfigOptions) {
    this.rpcUrl = options.rpcUrl
    this.contractAddress = options.contractAddress
  }
}
