import type { DidResolutionOptions, AgentContext, DidResolutionResult, DidResolver } from '@credo-ts/core'
import type { ParsedDID, ResolverRegistry } from 'did-resolver'

import { getResolver } from '@ayanworks/polygon-did-resolver'
import { DidDocument, JsonTransformer } from '@credo-ts/core'
import { Resolver } from 'did-resolver'

import { isValidPolygonDid } from './didPolygonUtil'

export class PolygonDidResolver implements DidResolver {
  public readonly allowsCaching = true

  public readonly supportedMethods = ['polygon']

  public resolver: Resolver

  public constructor() {
    this.resolver = new Resolver(getResolver() as ResolverRegistry)
  }
  public async resolve(
    agentContext: AgentContext,
    did: string,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    parsed: ParsedDID,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    didResolutionOptions: DidResolutionOptions
  ): Promise<DidResolutionResult> {
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
