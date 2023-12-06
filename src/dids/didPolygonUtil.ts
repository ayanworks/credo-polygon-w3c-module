import {
  DidCreateResult,
  AgentContext,
  AriesFrameworkError,
  getKeyFromVerificationMethod,
  VERIFICATION_METHOD_TYPE_ED25519_VERIFICATION_KEY_2018,
  VERIFICATION_METHOD_TYPE_JSON_WEB_KEY_2020,
  VERIFICATION_METHOD_TYPE_ED25519_VERIFICATION_KEY_2020,
  DidDocument,
} from '@aries-framework/core'
import { PolygonDidResolver } from './PolygonDidResolver'
import { computeAddress } from 'ethers'

export const polygonDidRegex = new RegExp(/^did:polygon(:testnet)?:0x[0-9a-fA-F]{40}$/)

export const isValidPolygonDid = (did: string) => polygonDidRegex.test(did)

export function buildDid(method: string, network: string, publicKey: string): string {
  const address = computeAddress('0x' + publicKey)

  return `did:${method}:${network}:${address}`
}

export function failedResult(reason: string): DidCreateResult {
  return {
    didDocumentMetadata: {},
    didRegistrationMetadata: {},
    didState: {
      state: 'failed',
      reason: reason,
    },
  }
}

export function validateSpecCompliantPayload(didDocument: DidDocument): string | null {
  // id is required, validated on both compile and runtime
  if (!didDocument.id && !didDocument.id.startsWith('did:')) return 'id is required'

  // verificationMethod is required
  if (!didDocument.verificationMethod) return 'verificationMethod is required'

  // verificationMethod must be an array
  if (!Array.isArray(didDocument.verificationMethod)) return 'verificationMethod must be an array'

  // verificationMethod must be not be empty
  if (!didDocument.verificationMethod.length) return 'verificationMethod must be not be empty'

  // verificationMethod types must be supported
  const isValidVerificationMethod = didDocument.verificationMethod.every((vm) => {
    switch (vm.type) {
      // case VERIFICATION_METHOD_TYPE_ECDSA_SECP256K1_VERIFICATION_KEY_2019:
      case VERIFICATION_METHOD_TYPE_ED25519_VERIFICATION_KEY_2020:
        return vm.publicKeyMultibase != null
      case VERIFICATION_METHOD_TYPE_JSON_WEB_KEY_2020:
        return vm.publicKeyJwk != null
      case VERIFICATION_METHOD_TYPE_ED25519_VERIFICATION_KEY_2018:
        return vm.publicKeyBase58 != null
      default:
        return false
    }
  })

  if (!isValidVerificationMethod) return 'verificationMethod publicKey is Invalid'

  const isValidService = didDocument.service
    ? didDocument?.service?.every((s) => {
        return s?.serviceEndpoint && s?.id && s?.type
      })
    : true

  if (!isValidService) return 'Service is Invalid'

  return null
}

export async function verificationKeyForDid(agentContext: AgentContext, did: string) {
  const resolver = agentContext.dependencyManager.resolve(PolygonDidResolver)

  const { didDocument, didDocumentMetadata, didResolutionMetadata } = await resolver.resolve(agentContext, did)

  if (didResolutionMetadata.error)
    throw new AriesFrameworkError(`${didResolutionMetadata.error}: ${didResolutionMetadata.message}`)
  if (didDocumentMetadata.deactivated) throw new AriesFrameworkError('DID has been deactivated')
  if (!didDocument) throw new AriesFrameworkError('DID not found')

  // did:indy dids MUST have a verificationMethod with #verkey
  const verificationMethod = didDocument.dereferenceKey(`${did}#KEY-1`)
  const key = getKeyFromVerificationMethod(verificationMethod)

  return key
}
