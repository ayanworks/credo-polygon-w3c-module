import { DidDocument } from '@aries-framework/core'
import { validateSpecCompliantPayload } from '../src/dids/didPolygonUtil'
import { PolygonDIDFixtures } from './fixtures'

describe('Test Polygon Did Utils', () => {
  it('should validate did spec compliant payload', () => {
    const didDoc = PolygonDIDFixtures.VALID_DID_DOCUMENT as unknown as DidDocument
    const result = validateSpecCompliantPayload(didDoc)
    expect(result).toBe(null)
  })

  it('should detect invalid did id', () => {
    const result = validateSpecCompliantPayload(
      new DidDocument({
        id: '',
      })
    )
    expect(result).toBe('id is required')
  })

  it('should detect empty verification method', () => {
    const result = validateSpecCompliantPayload(
      new DidDocument({
        id: 'did:polygon:testnet:0x4A09b8CB511cca4Ca1c5dB0475D0e07bFc96EF49',
        verificationMethod: [],
      })
    )
    expect(result).toBe('verificationMethod must be not be empty')
  })

  it('should detect invalid verification method', () => {
    const validDid = 'did:polygon:testnet:0x4A09b8CB511cca4Ca1c5dB0475D0e07bFc96EF49'
    const result = validateSpecCompliantPayload(
      new DidDocument({
        id: validDid,
        verificationMethod: [
          {
            id: validDid + '#key-1',
            publicKeyBase58: 'asca12e3as',
            type: 'JsonWebKey2020',
            controller: validDid,
          },
        ],
      })
    )
    expect(result).toBe('verificationMethod is Invalid')
  })
})
