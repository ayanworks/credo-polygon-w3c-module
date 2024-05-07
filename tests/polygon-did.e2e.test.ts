import type { EncryptedMessage } from '@credo-ts/core'

import { AskarModule } from '@credo-ts/askar'
import { Agent, ConsoleLogger, DidsModule, KeyType, LogLevel, TypedArrayEncoder, utils } from '@credo-ts/core'
import { agentDependencies } from '@credo-ts/node'
import { ariesAskar } from '@hyperledger/aries-askar-nodejs'
import { Subject } from 'rxjs'

import { PolygonModule } from '../src/PolygonModule'
import { PolygonDidRegistrar, PolygonDidResolver } from '../src/dids'

import { PolygonDIDFixtures } from './fixtures'
import { SubjectInboundTransport } from './transport/SubjectInboundTransport'
import { SubjectOutboundTransport } from './transport/SubjectOutboundTransport'

const logger = new ConsoleLogger(LogLevel.info)

export type SubjectMessage = { message: EncryptedMessage; replySubject?: Subject<SubjectMessage> }

const did = 'did:polygon:testnet:0x186f462430f90fee2b58609Dcf0539F08c400A72'

describe('Polygon Module did resolver', () => {
  let aliceAgent: Agent<{ askar: AskarModule; polygon: PolygonModule; dids: DidsModule }>
  let aliceWalletId: string
  let aliceWalletKey: string

  beforeAll(async () => {
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
          rpcUrl: 'https://rpc-amoy.polygon.technology',
          didContractAddress: '0xC1c392DC1073a86821B4ae37f1F0faCDcFFf45bF',
          fileServerToken:
            'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJBeWFuV29ya3MiLCJpZCI6IjdmYjRmN2I3LWQ5ZWUtNDYxOC04OTE4LWZiMmIzYzY1M2EyYiJ9.x-kHeTVqX4w19ibSAspCYgIL-JFVss8yZ0CT21QVRYM',
          schemaManagerContractAddress: '0x289c7Bd4C7d38cC54bff370d6f9f01b74Df51b11',
          serverUrl: 'https://51e1-103-97-166-226.ngrok-free.app',
        }),
        dids: new DidsModule({
          resolvers: [new PolygonDidResolver()],
          registrars: [new PolygonDidRegistrar()],
        }),
      },
    })

    aliceAgent.registerOutboundTransport(new SubjectOutboundTransport(subjectMap))
    aliceAgent.registerInboundTransport(new SubjectInboundTransport(aliceMessages))
    await aliceAgent.initialize()

    await aliceAgent.dids.import({
      did,
      overwrite: true,
      privateKeys: [
        {
          keyType: KeyType.K256,
          privateKey: TypedArrayEncoder.fromHex('393a414a50885766089b0d33ddc22276e141a71a6a1dded4f224e67a0a43cc99'),
        },
      ],
    })
  })

  afterAll(async () => {
    // Wait for messages to flush out
    await new Promise((r) => setTimeout(r, 1000))

    if (aliceAgent) {
      await aliceAgent.shutdown()

      if (aliceAgent.wallet.isInitialized && aliceAgent.wallet.isProvisioned) {
        await aliceAgent.wallet.delete()
      }
    }
  })

  // it('create and resolve a did:polygon did', async () => {
  //   const createdDid = await aliceAgent.dids.create<PolygonDidCreateOptions>({
  //     method: 'polygon',
  //     options: {
  //       network: 'testnet',
  //       endpoint: 'https://example.com',
  //     },
  //     secret: {
  //       privateKey: TypedArrayEncoder.fromHex('89d6e6df0272c4262533f951d0550ecd9f444ec2e13479952e4cc6982febfed6'),
  //     },
  //   })

  //   console.log('createdDid', createdDid)
  // })

  describe('PolygonDidResolver', () => {
    it('should resolve a polygon did when valid did is passed', async () => {
      const resolvedDIDDoc = await aliceAgent.dids.resolve(did)

      expect(resolvedDIDDoc.didDocument?.context).toEqual(PolygonDIDFixtures.VALID_DID_DOCUMENT['@context'])
      expect(resolvedDIDDoc.didDocument?.id).toBe(PolygonDIDFixtures.VALID_DID_DOCUMENT.id)
      expect(resolvedDIDDoc.didDocument?.verificationMethod).toEqual(
        PolygonDIDFixtures.VALID_DID_DOCUMENT.verificationMethod
      )
      expect(resolvedDIDDoc.didDocument?.authentication).toEqual(PolygonDIDFixtures.VALID_DID_DOCUMENT.authentication)
      expect(resolvedDIDDoc.didDocument?.assertionMethod).toEqual(PolygonDIDFixtures.VALID_DID_DOCUMENT.assertionMethod)
    })

    it(`should fail with 'Invalid DID' message when invalid polygon did is passed`, async () => {
      const did = 'did:polygon:testnet:0x4A09b8CB511cca4Ca1e07bFc96EF44'

      expect(async () => await aliceAgent.dids.resolve(did)).rejects.toThrowError('Invalid DID')
    })

    it('should fail after resolution invalid polygon did is passed', async () => {
      const did = 'did:polygon:testnet:0x4A09b8CB511cca4Ca1c54B0475D0e07bFc96EF44'

      const result = await aliceAgent.dids.resolve(did)

      expect(result.didDocument).toEqual(null)
      expect(result.didResolutionMetadata.error).toEqual('notFound')
    })
  })
})
