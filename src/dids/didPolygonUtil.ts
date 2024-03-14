import type { DidCreateResult, DidDocument, Key } from '@credo-ts/core'

import {
  CredoError,
  DidDocumentBuilder,
  DidDocumentService,
  VERIFICATION_METHOD_TYPE_ECDSA_SECP256K1_VERIFICATION_KEY_2019,
  getEcdsaSecp256k1VerificationKey2019,
} from '@credo-ts/core'
import { computeAddress } from 'ethers'

import { SECURITY_CONTEXT_SECP256k1_URL } from '../signature-suites/EcdsaSecp256k1Signature2019'

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

export function getSecp256k1DidDoc(did: string, key: Key, serviceEndpoint?: string): DidDocument {
  const verificationMethod = getEcdsaSecp256k1VerificationKey2019({
    id: `${did}#key-1`,
    key,
    controller: did,
  })

  const didDocumentBuilder = new DidDocumentBuilder(did)
  didDocumentBuilder.addContext(SECURITY_CONTEXT_SECP256k1_URL).addVerificationMethod(verificationMethod)

  if (serviceEndpoint) {
    const service = new DidDocumentService({
      id: `${did}#linked-domain`,
      serviceEndpoint,
      type: 'LinkedDomains',
    })

    didDocumentBuilder.addService(service)
  }

  if (!key.supportsEncrypting && !key.supportsSigning) {
    throw new CredoError('Key must support at least signing or encrypting')
  }

  if (key.supportsSigning) {
    didDocumentBuilder
      .addAuthentication(verificationMethod.id)
      .addAssertionMethod(verificationMethod.id)
      .addCapabilityDelegation(verificationMethod.id)
      .addCapabilityInvocation(verificationMethod.id)
  }

  if (key.supportsEncrypting) {
    didDocumentBuilder.addKeyAgreement(verificationMethod.id)
  }

  return didDocumentBuilder.build()
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
