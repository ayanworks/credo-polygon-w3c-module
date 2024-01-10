import { Buffer } from '@aries-framework/core'

/**
 * PolygonModuleConfigOptions defines the interface for the options of the PolygonModuleConfig class.
 */
export interface PolygonModuleConfigOptions {
  rpcUrl: string
  didContractAddress: string
  privateKey: Buffer
  fileServerToken: string
  schemaManagerContractAddress: string
  serverUrl: string
}

export class PolygonModuleConfig {
  public readonly rpcUrl!: string
  public readonly didContractAddress!: string
  public readonly privateKey!: Buffer
  public readonly fileServerToken!: string
  public readonly schemaManagerContractAddress!: string
  public readonly serverUrl!: string

  public constructor({
    didContractAddress,
    fileServerToken,
    privateKey,
    rpcUrl,
    schemaManagerContractAddress,
    serverUrl,
  }: PolygonModuleConfigOptions) {
    this.rpcUrl = rpcUrl
    this.didContractAddress = didContractAddress
    this.privateKey = privateKey
    this.fileServerToken = fileServerToken
    this.schemaManagerContractAddress = schemaManagerContractAddress
    this.serverUrl = serverUrl
  }
}
