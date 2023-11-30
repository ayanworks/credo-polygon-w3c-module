import type { PolygonModuleConfigOptions } from './PolygonModuleConfig'
import type { DependencyManager, Module } from '@aries-framework/core'

import { PolygonModuleConfig } from './PolygonModuleConfig'
import { PolygonLedgerService } from './ledger'

export class PolygonModule implements Module {
  public readonly config: PolygonModuleConfig

  public constructor(options: PolygonModuleConfigOptions) {
    this.config = new PolygonModuleConfig(options)
  }

  public register(dependencyManager: DependencyManager) {
    // Warn about experimental module
    dependencyManager.registerInstance(PolygonModuleConfig, this.config)

    // Services
    dependencyManager.registerSingleton(PolygonLedgerService)
  }
}
