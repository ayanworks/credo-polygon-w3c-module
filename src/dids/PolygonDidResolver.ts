import {
  DidDocument,
  type AgentContext,
  type DidResolutionResult,
  type DidResolver,
  JsonTransformer,
} from '@aries-framework/core'

import { PolygonLedgerService } from '../ledger'

import { isValidPolygonDid } from './didPolygonUtil'

export class PolygonDidResolver implements DidResolver {
  public readonly supportedMethods = ['polygon']

  public async resolve(agentContext: AgentContext, did: string): Promise<DidResolutionResult> {
    const didDocumentMetadata = {}

    if (!isValidPolygonDid(did)) {
      throw new Error('Invalid DID')
    }
    try {
      return this.resolveDidDoc(agentContext, did)
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

  private async resolveDidDoc(agentContext: AgentContext, did: string): Promise<DidResolutionResult> {
    const polygonLedgerService = agentContext.dependencyManager.resolve(PolygonLedgerService)

    const { didDocument, didDocumentMetadata, didResolutionMetadata } = await polygonLedgerService.resolve(did)

    return {
      didDocument: JsonTransformer.fromJSON(didDocument, DidDocument),
      didDocumentMetadata,
      didResolutionMetadata,
    }
  }
}
