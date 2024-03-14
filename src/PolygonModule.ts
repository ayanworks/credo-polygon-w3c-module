import type { PolygonModuleConfigOptions } from './PolygonModuleConfig'

import {
  SignatureSuiteToken,
  type DependencyManager,
  type Module,
  VERIFICATION_METHOD_TYPE_ECDSA_SECP256K1_VERIFICATION_KEY_2019,
  KeyType,
} from '@credo-ts/core'

import { PolygonApi } from './PolygonApi'
import { PolygonModuleConfig } from './PolygonModuleConfig'
import { PolygonLedgerService } from './ledger'
import { EcdsaSecp256k1Signature2019 } from './signature-suites'

export class PolygonModule implements Module {
  public readonly config: PolygonModuleConfig
  public readonly api = PolygonApi

  public constructor(options: PolygonModuleConfigOptions) {
    this.config = new PolygonModuleConfig(options)
  }

  public register(dependencyManager: DependencyManager) {
    // Warn about experimental module
    dependencyManager.registerInstance(PolygonModuleConfig, this.config)

    // Services
    dependencyManager.registerSingleton(PolygonLedgerService)

    // Api
    dependencyManager.registerContextScoped(PolygonApi)

    // Signature suites.
    dependencyManager.registerInstance(SignatureSuiteToken, {
      suiteClass: EcdsaSecp256k1Signature2019,
      proofType: 'EcdsaSecp256k1Signature2019',
      verificationMethodTypes: [VERIFICATION_METHOD_TYPE_ECDSA_SECP256K1_VERIFICATION_KEY_2019],
      keyTypes: [KeyType.K256],
    })
  }
}
