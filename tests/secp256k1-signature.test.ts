import type { AgentContext } from '@credo-ts/core'

import { AskarWallet } from '@credo-ts/askar'
import { AskarModuleConfig } from '@credo-ts/askar/build/AskarModuleConfig'
import {
  ClaimFormat,
  W3cJsonLdVerifiablePresentation,
  KeyType,
  JsonTransformer,
  SigningProviderRegistry,
  W3cCredential,
  CredentialIssuancePurpose,
  vcLibraries,
  W3cPresentation,
  TypedArrayEncoder,
  W3cJsonLdVerifiableCredential,
  VERIFICATION_METHOD_TYPE_ECDSA_SECP256K1_VERIFICATION_KEY_2019,
  SignatureSuiteRegistry,
  InjectionSymbols,
  ConsoleLogger,
  LogLevel,
  DidsModuleConfig,
  CredoError,
  CacheModuleConfig,
  InMemoryLruCache,
} from '@credo-ts/core'
import { W3cCredentialsModuleConfig } from '@credo-ts/core/build/modules/vc/W3cCredentialsModuleConfig'
import { W3cJsonLdCredentialService } from '@credo-ts/core/build/modules/vc/data-integrity/W3cJsonLdCredentialService'
import { LinkedDataProof } from '@credo-ts/core/build/modules/vc/data-integrity/models/LinkedDataProof'
import { agentDependencies } from '@credo-ts/node'
import { ariesAskar } from '@hyperledger/aries-askar-nodejs'
import { registerAriesAskar } from '@hyperledger/aries-askar-shared'

import { PolygonDidRegistrar, PolygonDidResolver } from '../src/dids'
import { buildDid } from '../src/dids/didPolygonUtil'
import { EcdsaSecp256k1Signature2019 } from '../src/signature-suites'

import { EcdsaSecp256k1Signature2019Fixtures } from './fixtures'
import { getAgentConfig, getAgentContext } from './utils'

export const askarModuleConfig = new AskarModuleConfig({ ariesAskar })
registerAriesAskar({ askar: askarModuleConfig.ariesAskar })

const { jsonldSignatures } = vcLibraries
const { purposes } = jsonldSignatures

const signatureSuiteRegistry = new SignatureSuiteRegistry([
  {
    suiteClass: EcdsaSecp256k1Signature2019,
    proofType: 'EcdsaSecp256k1Signature2019',
    verificationMethodTypes: [VERIFICATION_METHOD_TYPE_ECDSA_SECP256K1_VERIFICATION_KEY_2019],
    keyTypes: [KeyType.K256],
  },
])

describe('Secp256k1 W3cCredentialService', () => {
  let wallet: AskarWallet
  let agentContext: AgentContext
  let w3cJsonLdCredentialService: W3cJsonLdCredentialService
  const privateKey = TypedArrayEncoder.fromHex('5a4a2c79f4bceb4976dde41897b2607e01e6b74a42bc854a7a20059cfa99a095')

  beforeAll(async () => {
    const agentConfig = getAgentConfig('EcdsaSecp256k1e2eTest')

    wallet = new AskarWallet(agentConfig.logger, new agentDependencies.FileSystem(), new SigningProviderRegistry([]))
    await wallet.createAndOpen(agentConfig.walletConfig)
    agentContext = getAgentContext({
      agentConfig,
      wallet,
      registerInstances: [
        [InjectionSymbols.Logger, new ConsoleLogger(LogLevel.info)],
        [
          DidsModuleConfig,
          new DidsModuleConfig({
            resolvers: [new PolygonDidResolver()],
            registrars: [new PolygonDidRegistrar()],
          }),
        ],
        [
          CacheModuleConfig,
          new CacheModuleConfig({
            cache: new InMemoryLruCache({ limit: 50 }),
          }),
        ],
      ],
    })
    w3cJsonLdCredentialService = new W3cJsonLdCredentialService(
      signatureSuiteRegistry,
      new W3cCredentialsModuleConfig()
    )
  })

  afterAll(async () => {
    await wallet.delete()
  })

  describe('Utility methods', () => {
    describe('getKeyTypesByProofType', () => {
      it('should return the correct key types for EcdsaSecp256k1Signature2019 proof type', async () => {
        const keyTypes = w3cJsonLdCredentialService.getKeyTypesByProofType('EcdsaSecp256k1Signature2019')
        expect(keyTypes).toEqual([KeyType.K256])
      })
    })

    describe('getVerificationMethodTypesByProofType', () => {
      it('should return the correct key types for EcdsaSecp256k1Signature2019 proof type', async () => {
        const verificationMethodTypes =
          w3cJsonLdCredentialService.getVerificationMethodTypesByProofType('EcdsaSecp256k1Signature2019')
        expect(verificationMethodTypes).toEqual([VERIFICATION_METHOD_TYPE_ECDSA_SECP256K1_VERIFICATION_KEY_2019])
      })
    })
  })

  describe('EcdsaSecp256k1Signature2019', () => {
    let issuerDid: string
    let verificationMethod: string

    beforeAll(async () => {
      const key = await wallet.createKey({ keyType: KeyType.K256, privateKey })

      const publicKeyHex = key.publicKey.toString('hex')

      issuerDid = buildDid('polygon', 'testnet', publicKeyHex)
      verificationMethod = `${issuerDid}#key-1`
    })

    describe('signCredential', () => {
      it('should return a successfully signed credential secp256k1', async () => {
        const credentialJson = EcdsaSecp256k1Signature2019Fixtures.TEST_LD_DOCUMENT
        credentialJson.issuer = issuerDid

        const credential = JsonTransformer.fromJSON(credentialJson, W3cCredential)

        const vc = await w3cJsonLdCredentialService.signCredential(agentContext, {
          format: ClaimFormat.LdpVc,
          credential,
          proofType: 'EcdsaSecp256k1Signature2019',
          verificationMethod: verificationMethod,
        })

        expect(vc).toBeInstanceOf(W3cJsonLdVerifiableCredential)
        expect(vc.issuer).toEqual(issuerDid)
        expect(Array.isArray(vc.proof)).toBe(false)
        expect(vc.proof).toBeInstanceOf(LinkedDataProof)

        vc.proof = vc.proof as LinkedDataProof
        expect(vc.proof.verificationMethod).toEqual(verificationMethod)
      })

      it('should throw because of verificationMethod does not belong to this wallet', async () => {
        const credentialJson = EcdsaSecp256k1Signature2019Fixtures.TEST_LD_DOCUMENT
        credentialJson.issuer = issuerDid

        const credential = JsonTransformer.fromJSON(credentialJson, W3cCredential)

        expect(async () => {
          await w3cJsonLdCredentialService.signCredential(agentContext, {
            format: ClaimFormat.LdpVc,
            credential,
            proofType: 'EcdsaSecp256k1Signature2019',
            verificationMethod: 'did:polygon:testnet:0x4A09b8CB511cca4Ca1c5dB0475D0e07bFc96EF47#key-1',
          })
        }).rejects.toThrowError(CredoError)
      })
    })

    describe('verifyCredential', () => {
      it('should verify the credential successfully', async () => {
        const result = await w3cJsonLdCredentialService.verifyCredential(agentContext, {
          credential: JsonTransformer.fromJSON(
            EcdsaSecp256k1Signature2019Fixtures.TEST_LD_DOCUMENT_SIGNED,
            W3cJsonLdVerifiableCredential
          ),
          proofPurpose: new purposes.AssertionProofPurpose(),
        })

        expect(result.isValid).toEqual(true)
      })

      it('should fail because of invalid signature', async () => {
        const vc = JsonTransformer.fromJSON(
          EcdsaSecp256k1Signature2019Fixtures.TEST_LD_DOCUMENT_BAD_SIGNED,
          W3cJsonLdVerifiableCredential
        )
        const result = await w3cJsonLdCredentialService.verifyCredential(agentContext, { credential: vc })

        expect(result).toEqual({
          isValid: false,
          error: expect.any(Error),
          validations: {
            vcJs: {
              error: expect.any(Error),
              isValid: false,
              results: expect.any(Array),
            },
          },
        })
      })
    })

    describe('signPresentation', () => {
      it('should successfully create a presentation from single verifiable credential', async () => {
        const presentation = JsonTransformer.fromJSON(
          EcdsaSecp256k1Signature2019Fixtures.TEST_VP_DOCUMENT,
          W3cPresentation
        )

        const purpose = new CredentialIssuancePurpose({
          controller: {
            id: verificationMethod,
          },
          date: new Date().toISOString(),
        })

        const verifiablePresentation = await w3cJsonLdCredentialService.signPresentation(agentContext, {
          format: ClaimFormat.LdpVp,
          presentation: presentation,
          proofPurpose: purpose,
          proofType: 'EcdsaSecp256k1Signature2019',
          challenge: '7bf32d0b-39d4-41f3-96b6-45de52988e4c',
          domain: 'issuer.example.com',
          verificationMethod: verificationMethod,
        })

        expect(verifiablePresentation).toBeInstanceOf(W3cJsonLdVerifiablePresentation)
      })
    })

    describe('verifyPresentation', () => {
      it('should successfully verify a presentation containing a single verifiable credential', async () => {
        const vp = JsonTransformer.fromJSON(
          EcdsaSecp256k1Signature2019Fixtures.TEST_VP_DOCUMENT_SIGNED,
          W3cJsonLdVerifiablePresentation
        )

        const result = await w3cJsonLdCredentialService.verifyPresentation(agentContext, {
          presentation: vp,
          challenge: '7bf32d0b-39d4-41f3-96b6-45de52988e4c',
        })

        expect(result).toEqual({
          isValid: true,
          error: undefined,
          validations: {
            vcJs: {
              isValid: true,
              presentationResult: expect.any(Object),
              credentialResults: expect.any(Array),
            },
          },
        })
      })

      it('should fail when presentation signature is not valid', async () => {
        const vp = JsonTransformer.fromJSON(
          {
            ...EcdsaSecp256k1Signature2019Fixtures.TEST_VP_DOCUMENT_SIGNED,
            proof: {
              ...EcdsaSecp256k1Signature2019Fixtures.TEST_VP_DOCUMENT_SIGNED.proof,
              jws: EcdsaSecp256k1Signature2019Fixtures.TEST_VP_DOCUMENT_SIGNED.proof.jws + 'a',
            },
          },
          W3cJsonLdVerifiablePresentation
        )

        const result = await w3cJsonLdCredentialService.verifyPresentation(agentContext, {
          presentation: vp,
          challenge: '7bf32d0b-39d4-41f3-96b6-45de52988e4c',
        })

        expect(result).toEqual({
          isValid: false,
          error: expect.any(Error),
          validations: {
            vcJs: {
              isValid: false,
              credentialResults: expect.any(Array),
              presentationResult: expect.any(Object),
              error: expect.any(Error),
            },
          },
        })
      })
    })
  })
})
