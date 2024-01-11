import {
  DidDocument,
  type AgentContext,
  type DidResolutionResult,
  type DidResolver,
  JsonTransformer,
} from '@aries-framework/core'

import { isValidPolygonDid } from './didPolygonUtil'
import { Resolver, ResolverRegistry } from 'did-resolver'

import { getResolver } from '@ayanworks/polygon-did-resolver'
import { PolygonLedgerService } from '../ledger'

export class PolygonDidResolver implements DidResolver {
  public readonly supportedMethods = ['polygon']

  public resolver: Resolver

  constructor() {
    this.resolver = new Resolver(getResolver() as ResolverRegistry)
  }

  public async resolve(agentContext: AgentContext, did: string): Promise<DidResolutionResult> {
    const didDocumentMetadata = {}

    if (!isValidPolygonDid(did)) {
      throw new Error('Invalid DID')
    }
    try {
      const { didDocument, didDocumentMetadata, didResolutionMetadata } = await this.resolver.resolve(did)

      return {
        didDocument: JsonTransformer.fromJSON(didDocument, DidDocument),
        didDocumentMetadata,
        didResolutionMetadata,
      }
    } catch (error) {
      return {
        didDocument: null,
        didDocumentMetadata,
        didResolutionMetadata: {
          error: 'notFound',
          message: `resolver_error: Unable to resolve did '${did}': ${error}`,
        },
      }
    }
  }
}
