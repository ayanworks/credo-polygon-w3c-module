import type { EncryptedMessage } from '@credo-ts/core'

import { AskarModule } from '@credo-ts/askar'
import { Agent, ConsoleLogger, DidsModule, KeyType, LogLevel, TypedArrayEncoder, utils } from '@credo-ts/core'
import { agentDependencies } from '@credo-ts/node'
import { ariesAskar } from '@hyperledger/aries-askar-nodejs'
import { Subject } from 'rxjs'

import { PolygonModule } from '../src/PolygonModule'
import { PolygonDidRegistrar, PolygonDidResolver } from '../src/dids'

import { SubjectInboundTransport } from './transport/SubjectInboundTransport'
import { SubjectOutboundTransport } from './transport/SubjectOutboundTransport'

const logger = new ConsoleLogger(LogLevel.info)

export type SubjectMessage = { message: EncryptedMessage; replySubject?: Subject<SubjectMessage> }

const privateKey = TypedArrayEncoder.fromHex('5a4a2c79f4bceb4976dde41897b2607e01e6b74a42bc854a7a20059cfa99a095')

const testNetdid = 'did:polygon:testnet:0x138d2231e4362fc0e028576Fb2DF56904bd59C1b'

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const testSchema = {
  '@context': [
    {
      '@version': 1.1,
    },
    'https://www.w3.org/ns/odrl.jsonld',
    {
      ex: 'https://example.org/examples#',
      schema: 'http://schema.org/',
      rdf: 'http://www.w3.org/1999/02/22-rdf-syntax-ns#',
      '3rdPartyCorrelation': 'ex:3rdPartyCorrelation',
      AllVerifiers: 'ex:AllVerifiers',
      Archival: 'ex:Archival',
      BachelorDegree: 'ex:BachelorDegree',
      Child: 'ex:Child',
      CLCredentialDefinition2019: 'ex:CLCredentialDefinition2019',
      CLSignature2019: 'ex:CLSignature2019',
      IssuerPolicy: 'ex:IssuerPolicy',
      HolderPolicy: 'ex:HolderPolicy',
      Mother: 'ex:Mother',
      RelationshipCredential: 'ex:RelationshipCredential',
      UniversityDegreeCredential: 'ex:UniversityDegreeCredential',
      AlumniCredential: 'ex:AlumniCredential',
      DisputeCredential: 'ex:DisputeCredential',
      PrescriptionCredential: 'ex:PrescriptionCredential',
      ZkpExampleSchema2018: 'ex:ZkpExampleSchema2018',
      issuerData: 'ex:issuerData',
      attributes: 'ex:attributes',
      signature: 'ex:signature',
      signatureCorrectnessProof: 'ex:signatureCorrectnessProof',
      primaryProof: 'ex:primaryProof',
      nonRevocationProof: 'ex:nonRevocationProof',
      alumniOf: { '@id': 'schema:alumniOf', '@type': 'rdf:HTML' },
      child: { '@id': 'ex:child', '@type': '@id' },
      degree: 'ex:degree',
      degreeType: 'ex:degreeType',
      degreeSchool: 'ex:degreeSchool',
      college: 'ex:college',
      name: { '@id': 'schema:name', '@type': 'rdf:HTML' },
      givenName: 'schema:givenName',
      familyName: 'schema:familyName',
      parent: { '@id': 'ex:parent', '@type': '@id' },
      referenceId: 'ex:referenceId',
      documentPresence: 'ex:documentPresence',
      evidenceDocument: 'ex:evidenceDocument',
      spouse: 'schema:spouse',
      subjectPresence: 'ex:subjectPresence',
      verifier: { '@id': 'ex:verifier', '@type': '@id' },
      currentStatus: 'ex:currentStatus',
      statusReason: 'ex:statusReason',
      prescription: 'ex:prescription',
    },
  ],
}

describe('Polygon Module did resolver', () => {
  let faberAgent: Agent<{ askar: AskarModule; polygon: PolygonModule; dids: DidsModule }>
  let faberWalletId: string
  let faberWalletKey: string

  beforeAll(async () => {
    faberWalletId = utils.uuid()
    faberWalletKey = utils.uuid()

    const aliceMessages = new Subject<SubjectMessage>()

    const subjectMap = {
      'rxjs:alice': aliceMessages,
    }

    // const response = await PolygonDID.createKeyPair('testnet')

    // console.log('response', response)

    // Initialize alice
    faberAgent = new Agent({
      config: {
        label: 'alice',
        endpoints: ['rxjs:alice'],
        walletConfig: { id: faberWalletId, key: faberWalletKey },
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

    faberAgent.registerOutboundTransport(new SubjectOutboundTransport(subjectMap))
    faberAgent.registerInboundTransport(new SubjectInboundTransport(aliceMessages))
    await faberAgent.initialize()

    await faberAgent.dids.import({
      did: testNetdid,
      overwrite: true,
      privateKeys: [
        {
          keyType: KeyType.K256,
          privateKey,
        },
      ],
    })
  })

  afterAll(async () => {
    // Wait for messages to flush out
    await new Promise((r) => setTimeout(r, 1000))

    if (faberAgent) {
      await faberAgent.shutdown()

      if (faberAgent.wallet.isInitialized && faberAgent.wallet.isProvisioned) {
        await faberAgent.wallet.delete()
      }
    }
  })

  describe('PolygonSchema', () => {
    // it('should create a polygon keypair', async () => {
    //   const response = await PolygonDID.createKeyPair('testnet')
    //   console.log('response', response)
    // })

    // it('create a polygon did', async () => {
    //   const did = await faberAgent.dids.create<PolygonDidCreateOptions>({
    //     method: 'polygon',
    //     options: {
    //       network: 'testnet',
    //       endpoint: 'https://example.com',
    //     },
    //     secret: {
    //       privateKey,
    //     },
    //   })
    //   console.log('did', did)
    // })

    // it('should create w3c schema', async () => {
    //   const response = await faberAgent.modules.polygon.createSchema({
    //     did: testNetdid,
    //     schemaName: 'TestCollegeSchema',
    //     schema: testSchema,
    //   })
    //   console.log('Created Schema Response', response)
    // })

    // it('should resolve a schema by Id', async () => {
    //   const schemaId = 'd0781b8c-46ee-4620-8d9b-740d537513f6'
    //   const schema = await faberAgent.modules.polygon.getSchemaById(testNetdid, schemaId)
    //   console.log('Get schema By id', schema)
    // })

    it('should resolve a polygon did with metadata', async () => {
      const resolvedDIDDoc = await faberAgent.dids.resolve(testNetdid)
      faberAgent.config.logger.info('resolvedDIDDoc', resolvedDIDDoc)
    })
  })
})
