import type { PolygonModuleConfigOptions } from './PolygonModuleConfig'
import type { DependencyManager, Module } from '@aries-framework/core'

import { AgentConfig } from '@aries-framework/core'

import { PolygonModuleConfig } from './PolygonModuleConfig'
import { PolygonLedgerService } from './ledger'
import { PolygonSDK } from './sdk/PolygonSdk'

export class PolygonModule implements Module {
  public register(dependencyManager: DependencyManager) {
    // Warn about experimental module
    dependencyManager
      .resolve(AgentConfig)
      .logger.warn(
        "The '@aries-framework/polygon' module is experimental and could have unexpected breaking changes. When using this module, make sure to use strict versions for all @aries-framework packages."
      )

    // Services
    dependencyManager.registerSingleton(PolygonLedgerService)

    // SDK
    dependencyManager.registerSingleton(PolygonSDK)
  }
}
