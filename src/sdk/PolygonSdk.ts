import type { ResolverRegistry } from 'did-resolver'

import { injectable } from '@aries-framework/core'
import { getResolver } from '@ayanworks/polygon-did-resolver'
import { Resolver } from 'did-resolver'

@injectable()
export class PolygonSDK {
  public resolver: Resolver

  public constructor() {
    this.resolver = new Resolver(getResolver() as ResolverRegistry)
  }

  public async resolveDid(did: string) {
    return this.resolver.resolve(did)
  }
}
