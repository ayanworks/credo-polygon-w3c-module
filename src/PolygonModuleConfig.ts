/**
 * PolygonModuleConfigOptions defines the interface for the options of the PolygonModuleConfig class.
 */
export interface PolygonModuleConfigOptions {
  networks: NetworkConfig[]
}

export interface NetworkConfig {
  rpcUrl?: string
  network: string
}

export class PolygonModuleConfig {
  private options: PolygonModuleConfigOptions

  public constructor(options: PolygonModuleConfigOptions) {
    this.options = options
  }

  /** See {@link PolygonModuleConfigOptions.networks} */
  public get networks() {
    return this.options.networks
  }
}
