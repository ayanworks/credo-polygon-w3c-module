import { InjectionSymbols, Logger, inject, injectable } from '@aries-framework/core'

import { PolygonSDK } from '../sdk/PolygonSdk'

@injectable()
export class PolygonLedgerService {
  private polygonSdk: PolygonSDK
  private logger: Logger

  public constructor(@inject(InjectionSymbols.Logger) logger: Logger, polygonSdk: PolygonSDK) {
    this.logger = logger
    this.polygonSdk = polygonSdk
  }

  public async resolve(did: string) {
    try {
      this.logger.trace(`Get did '${did}' from polygon ledger`)
      return this.polygonSdk.resolveDid(did)
    } catch (error) {
      this.logger.trace(`Error retrieving did '${did}' from polygon ledger`, {
        error,
        did,
      })
      throw error
    }
  }
}
