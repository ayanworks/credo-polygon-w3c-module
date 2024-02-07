import type { ResolverRegistry } from 'did-resolver'

import {
  DidDocument,
  type AgentContext,
  type DidResolutionResult,
  type DidResolver,
  JsonTransformer,
} from '@aries-framework/core'
import { getResolver } from '@ayanworks/polygon-did-resolver'
import { Resolver } from 'did-resolver'

import { isValidPolygonDid } from './didPolygonUtil'

export class PolygonDidResolver implements DidResolver {
  public readonly supportedMethods = ['polygon']

  public resolver: Resolver

  public constructor() {
    this.resolver = new Resolver(getResolver() as ResolverRegistry)
  }

  public async resolve(agentContext: AgentContext, did: string): Promise<DidResolutionResult> {
    const didDocumentMetadata = {}

    if (!isValidPolygonDid(did)) {
      throw new Error('Invalid DID')
    }
    try {
      const { didDocument, didDocumentMetadata, didResolutionMetadata } = await this.resolver.resolve(did)

      if (didDocument?.verificationMethod?.length === 0) {
        agentContext.config.logger.warn(`No verification methods found for DID ${did}`)

        return {
          didDocument: JsonTransformer.fromJSON(didDocument, DidDocument),
          didDocumentMetadata: {
            linkedResources: [],
            deactivated: true,
          },
          didResolutionMetadata: {
            contentType: 'application/did+ld+json',
          },
        }
      }

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
