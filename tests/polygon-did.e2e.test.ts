import { agentDependencies } from '@aries-framework/node'
import { AskarModule } from '@aries-framework/askar'
import { ariesAskar } from '@hyperledger/aries-askar-nodejs'

import {
  Agent,
  ConsoleLogger,
  DidsModule,
  EncryptedMessage,
  LogLevel,
  TypedArrayEncoder,
  utils,
} from '@aries-framework/core'
import { Subject } from 'rxjs'

import { PolygonModule } from '../src/PolygonModule'
import { SubjectOutboundTransport } from './transport/SubjectOutboundTransport'
import { SubjectInboundTransport } from './transport/SubjectInboundTransport'
import { PolygonDidRegistrar, PolygonDidResolver } from '../src/dids'
import { PolygonDidCreateOptions } from '../src/dids/PolygonDidRegistrar'

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
          privateKey: TypedArrayEncoder.fromHex(''),
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

  test('create and resolve a did:polygon did', async () => {
    const createdDid = await aliceAgent.dids.create<PolygonDidCreateOptions>({
      method: 'polygon',
      options: {
        network: 'testnet',
        endpoint: 'https://example.com',
      },
      secret: {
        privateKey: TypedArrayEncoder.fromHex(''),
      },
    })
  })
})
