import { injectable } from '@aries-framework/core'
import { PolygonDID } from '@ayanworks/polygon-did-registrar'
import { PolygonModuleConfig } from '../PolygonModuleConfig'

@injectable()
export class PolygonLedgerService {
  public didRegistry: PolygonDID

  public constructor({ contractAddress, privateKey, rpcUrl }: PolygonModuleConfig) {
    this.didRegistry = new PolygonDID({
      rpcUrl,
      contractAddress,
      privateKey: privateKey.toString('hex'),
    })
  }
}
