import type { EncryptedMessage } from '@aries-framework/core'

import { AskarModule } from '@aries-framework/askar'
import {
  Agent,
  ConsoleLogger,
  DidDocument,
  DidsModule,
  JsonTransformer,
  KeyType,
  LogLevel,
  TypedArrayEncoder,
  utils,
} from '@aries-framework/core'
import { agentDependencies } from '@aries-framework/node'
import { ariesAskar } from '@hyperledger/aries-askar-nodejs'
import { Subject } from 'rxjs'

import { PolygonModule } from '../src/PolygonModule'
import { PolygonDidRegistrar, PolygonDidResolver } from '../src/dids'

import { PolygonDIDFixtures } from './fixtures'
import { SubjectInboundTransport } from './transport/SubjectInboundTransport'
import { SubjectOutboundTransport } from './transport/SubjectOutboundTransport'

const logger = new ConsoleLogger(LogLevel.info)

export type SubjectMessage = { message: EncryptedMessage; replySubject?: Subject<SubjectMessage> }

const did = 'did:polygon:testnet:0x50e775B5c3050e8B2Cfa404C3dE95ab97E43e771'

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
          rpcUrl: 'https://rpc-mumbai.maticvigil.com/',
          didContractAddress: '0x12513116875BB3E4F098Ce74624739Ee51bAf023',
          fileServerToken:
            'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJBeWFuV29ya3MiLCJpZCI6IjdmYjRmN2I3LWQ5ZWUtNDYxOC04OTE4LWZiMmIzYzY1M2EyYiJ9.x-kHeTVqX4w19ibSAspCYgIL-JFVss8yZ0CT21QVRYM',
          schemaManagerContractAddress: '0x67e8223D80aEcb337FE8D90dD41845A0DA31B4b0',
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

    it('should update the DID doc when new DIDDoc is passed', async () => {
      const didDocument = JsonTransformer.fromJSON(PolygonDIDFixtures.VALID_DID_DOCUMENT, DidDocument)

      const response = await aliceAgent.dids.update({
        did,
        didDocument,
        secret: {
          privateKey: TypedArrayEncoder.fromHex('393a414a50885766089b0d33ddc22276e141a71a6a1dded4f224e67a0a43cc99'),
        },
      })

      expect(response).toEqual({
        didDocumentMetadata: {},
        didRegistrationMetadata: {},
        didState: {
          state: 'finished',
          did: didDocument.id,
          didDocument,
        },
      })
    })
  })
})
