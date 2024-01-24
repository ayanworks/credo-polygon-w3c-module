import type { DidCreateResult, DidDocument } from '@aries-framework/core'

import { VERIFICATION_METHOD_TYPE_ECDSA_SECP256K1_VERIFICATION_KEY_2019 } from '@aries-framework/core'
import { computeAddress } from 'ethers'

export const polygonDidRegex = new RegExp(/^did:polygon(:testnet)?:0x[0-9a-fA-F]{40}$/)

export const isValidPolygonDid = (did: string) => polygonDidRegex.test(did)

export function buildDid(method: string, network: string, publicKey: string): string {
  const address = computeAddress('0x' + publicKey)

  if (network === 'mainnet') {
    return `did:${method}:${address}`
  }

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
  if (!didDocument.id && !didDocument.id.startsWith('did:polygon:')) return 'id is required'

  // verificationMethod is required
  if (!didDocument.verificationMethod) return 'verificationMethod is required'

  // verificationMethod must be an array
  if (!Array.isArray(didDocument.verificationMethod)) return 'verificationMethod must be an array'

  // verificationMethod must be not be empty
  if (!didDocument.verificationMethod.length) return 'verificationMethod must be not be empty'

  // verificationMethod types must be supported
  const isValidVerificationMethod = didDocument.verificationMethod.every((vm) => {
    switch (vm.type) {
      case VERIFICATION_METHOD_TYPE_ECDSA_SECP256K1_VERIFICATION_KEY_2019:
        return vm?.publicKeyBase58 && vm?.controller && vm?.id
      default:
        return false
    }
  })

  if (!isValidVerificationMethod) return 'verificationMethod is Invalid'

  if (didDocument.service) {
    const isValidService = didDocument.service
      ? didDocument?.service?.every((s) => {
          return s?.serviceEndpoint && s?.id && s?.type
        })
      : true

    if (!isValidService) return 'Service is Invalid'
  }

  return null
}
