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

const did = 'did:polygon:testnet:0x138d2231e4362fc0e028576Fb2DF56904bd59C1b'

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
          didContractAddress: '0xcB80F37eDD2bE3570c6C9D5B0888614E04E1e49E',
          fileServerToken:
            'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJBeWFuV29ya3MiLCJpZCI6IjdmYjRmN2I3LWQ5ZWUtNDYxOC04OTE4LWZiMmIzYzY1M2EyYiJ9.x-kHeTVqX4w19ibSAspCYgIL-JFVss8yZ0CT21QVRYM',
          schemaManagerContractAddress: '0x4742d43C2dFCa5a1d4238240Afa8547Daf87Ee7a',
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
          privateKey: TypedArrayEncoder.fromHex('5a4a2c79f4bceb4976dde41897b2607e01e6b74a42bc854a7a20059cfa99a095'),
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
      expect(resolvedDIDDoc.didDocument?.context).toEqual(PolygonDIDFixtures.VALID_DID_DOCUMENT.didDocument['@context'])
      expect(resolvedDIDDoc.didDocument?.id).toBe(PolygonDIDFixtures.VALID_DID_DOCUMENT.didDocument.id)
      expect(resolvedDIDDoc.didDocument?.verificationMethod).toEqual(
        PolygonDIDFixtures.VALID_DID_DOCUMENT.didDocument.verificationMethod
      )
      expect(resolvedDIDDoc.didDocument?.authentication).toEqual(
        PolygonDIDFixtures.VALID_DID_DOCUMENT.didDocument.authentication
      )
      expect(resolvedDIDDoc.didDocument?.assertionMethod).toEqual(
        PolygonDIDFixtures.VALID_DID_DOCUMENT.didDocument.assertionMethod
      )
    })

    it("should fail with 'Invalid DID' message when invalid polygon did is passed", async () => {
      const did = 'did:polygon:testnet:0x525D4605f4EE59e1149987F59668D4f272359093'

      const result = await aliceAgent.dids.resolve(did)

      expect(result.didResolutionMetadata.error).toBe('notFound')
      expect(result.didResolutionMetadata.message).toContain('resolver_error: Unable to resolve did')
    })

    it('should fail after resolution invalid polygon did is passed', async () => {
      const did = 'did:polygon:testnet:0x525D4605f4EE59e1149987F59668D4f272359093'

      const result = await aliceAgent.dids.resolve(did)

      expect(result.didDocument).toEqual(null)
      expect(result.didResolutionMetadata.error).toEqual('notFound')
    })
  })
})
