import { agentDependencies } from '@aries-framework/node'
import { AskarModule } from '@aries-framework/askar'
import { ariesAskar } from '@hyperledger/aries-askar-nodejs'

import {
  Agent,
  ConsoleLogger,
  DidsModule,
  EncryptedMessage,
  JsonTransformer,
  LogLevel,
  utils,
} from '@aries-framework/core'
import { Subject } from 'rxjs'

import { PolygonModule } from '../src/PolygonModule'
import { SubjectOutboundTransport } from './transport/SubjectOutboundTransport'
import { SubjectInboundTransport } from './transport/SubjectInboundTransport'
import { PolygonDidResolver } from '../src/dids'

const logger = new ConsoleLogger(LogLevel.info)

export type SubjectMessage = { message: EncryptedMessage; replySubject?: Subject<SubjectMessage> }

describe('Polygon Module did resolver', () => {
  let aliceAgent: Agent<{ askar: AskarModule; polygon: PolygonModule; dids: DidsModule }>
  let aliceWalletId: string
  let aliceWalletKey: string

  beforeEach(async () => {
    aliceWalletId = utils.uuid()
    aliceWalletKey = utils.uuid()

    const aliceMessages = new Subject<SubjectMessage>()

    const subjectMap = {
      'rxjs:alice': aliceMessages,
    }

    // Initialize alice
    aliceAgent = new Agent({
      config: {
        label: 'alice',
        endpoints: ['rxjs:alice'],
        walletConfig: { id: aliceWalletId, key: aliceWalletKey },
        logger,
      },
      dependencies: agentDependencies,
      modules: {
        askar: new AskarModule({ ariesAskar }),
        // Add required modules
        polygon: new PolygonModule({
          rpcUrl: 'https://rpc-mumbai.maticvigil.com/',
          contractAddress: '0x8B335A167DA81CCef19C53eE629cf2F6291F2255',
        }),
        dids: new DidsModule({
          resolvers: [new PolygonDidResolver()],
        }),
      },
    })

    aliceAgent.registerOutboundTransport(new SubjectOutboundTransport(subjectMap))
    aliceAgent.registerInboundTransport(new SubjectInboundTransport(aliceMessages))
    await aliceAgent.initialize()
  })

  afterEach(async () => {
    // Wait for messages to flush out
    await new Promise((r) => setTimeout(r, 1000))

    if (aliceAgent) {
      await aliceAgent.shutdown()

      if (aliceAgent.wallet.isInitialized && aliceAgent.wallet.isProvisioned) {
        await aliceAgent.wallet.delete()
      }
    }
  })

  test('should resolve a did:polygon did', async () => {
    const testDid = 'did:polygon:testnet:0x794b781493AeD65b9ceBD680716fec257e118993'
    const didResult = await aliceAgent.dids.resolve(testDid)

    expect(JsonTransformer.toJSON(didResult)).toMatchObject({
      didDocument: {
        '@context': 'https://w3id.org/did/v1',
        id: 'did:polygon:testnet:0x794b781493AeD65b9ceBD680716fec257e118993',
        verificationMethod: [
          {
            id: 'did:polygon:testnet:0x794b781493AeD65b9ceBD680716fec257e118993#key-1',
            type: 'EcdsaSecp256k1VerificationKey2019',
            controller: 'did:polygon:testnet:0x794b781493AeD65b9ceBD680716fec257e118993',
            publicKeyBase58:
              '7Lnm1ZnseKDkH1baAb1opREfAU4MPY7zCdUDSrWSm9NxNTQmy4neU9brFUYnEcyy7CwFKjD11ikyP9J8cf6zEaAKrEzzp',
          },
        ],
        authentication: [
          'did:polygon:testnet:0x794b781493AeD65b9ceBD680716fec257e118993',
          {
            id: 'did:polygon:testnet:0x794b781493AeD65b9ceBD680716fec257e118993#key-1',
            type: 'EcdsaSecp256k1VerificationKey2019',
            controller: 'did:polygon:testnet:0x794b781493AeD65b9ceBD680716fec257e118993',
            publicKeyBase58:
              '7Lnm1ZnseKDkH1baAb1opREfAU4MPY7zCdUDSrWSm9NxNTQmy4neU9brFUYnEcyy7CwFKjD11ikyP9J8cf6zEaAKrEzzp',
          },
        ],
        assertionMethod: [
          'did:polygon:testnet:0x794b781493AeD65b9ceBD680716fec257e118993',
          {
            id: 'did:polygon:testnet:0x794b781493AeD65b9ceBD680716fec257e118993#key-1',
            type: 'EcdsaSecp256k1VerificationKey2019',
            controller: 'did:polygon:testnet:0x794b781493AeD65b9ceBD680716fec257e118993',
            publicKeyBase58:
              '7Lnm1ZnseKDkH1baAb1opREfAU4MPY7zCdUDSrWSm9NxNTQmy4neU9brFUYnEcyy7CwFKjD11ikyP9J8cf6zEaAKrEzzp',
          },
        ],
      },
      didDocumentMetadata: {},
      didResolutionMetadata: {
        contentType: 'application/did+ld+json',
      },
    })
  })
})
