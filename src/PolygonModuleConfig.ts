import { Buffer } from '@aries-framework/core'

/**
 * PolygonModuleConfigOptions defines the interface for the options of the PolygonModuleConfig class.
 */
export interface PolygonModuleConfigOptions {
  rpcUrl?: string
  didContractAddress?: string
  privateKey?: Buffer
  fileServerToken?: string
  schemaManagerContractAddress?: string
  serverUrl?: string
}

export class PolygonModuleConfig {
  public readonly rpcUrl: string | undefined
  public readonly didContractAddress: string | undefined
  public readonly privateKey: Buffer | undefined
  public readonly fileServerToken: string | undefined
  public readonly schemaManagerContractAddress: string | undefined
  public readonly serverUrl: string | undefined

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
