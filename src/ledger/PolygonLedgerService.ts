import type { AgentContext, DidDocument, Wallet } from '@aries-framework/core'

import { AskarWallet } from '@aries-framework/askar'
import {
  AriesFrameworkError,
  DidDocumentBuilder,
  DidRepository,
  WalletError,
  injectable,
  utils,
} from '@aries-framework/core'
import { PolygonDID } from '@ayanworks/polygon-did-registrar'
import { parseDid } from '@ayanworks/polygon-did-registrar/build/utils/did'
import { PolygonSchema } from '@ayanworks/polygon-schema-manager'
import { SigningKey } from 'ethers'

import { PolygonModuleConfig } from '../PolygonModuleConfig'
import { generateSecp256k1KeyPair, getSecp256k1DidDocWithPublicKey } from '../utils'

interface SchemaRegistryConfig {
  didRegistrarContractAddress: string
  rpcUrl: string
  fileServerToken: string
  privateKey: string
  schemaManagerContractAddress: string
  serverUrl: string
}

export type CreateDidOperationOptions = {
  operation: DidOperation.Create
  serviceEndpoint?: string
}

export type UpdateDidOperationOptions = {
  operation: DidOperation.Update
  didDocument: DidDocument
  did: string
}

export type DeactivateDidOperationOptions = {
  operation: DidOperation.Deactivate
  did: string
}

export type AddResourceDidOperationOptions = {
  operation: DidOperation.AddResource
  resourceId: string
  resource: object
  did: string
}

export enum DidOperation {
  Create = 'createDID',
  Update = 'updateDIDDoc',
  Deactivate = 'deactivate',
  AddResource = 'addResource',
}

export type DidOperationOptions =
  | CreateDidOperationOptions
  | UpdateDidOperationOptions
  | DeactivateDidOperationOptions
  | AddResourceDidOperationOptions

export type SchemaOperationOptions = CreateSchemaOperationOptions

export type CreateSchemaOperationOptions = {
  operation: SchemaOperation.CreateSchema
  did: string
}

export enum SchemaOperation {
  CreateSchema = 'createSchema',
}

@injectable()
export class PolygonLedgerService {
  public rpcUrl: string | undefined
  private didContractAddress: string | undefined
  private schemaManagerContractAddress: string | undefined
  private fileServerToken: string | undefined
  private fileServerUrl: string | undefined

  public constructor({
    didContractAddress,
    rpcUrl,
    fileServerToken,
    schemaManagerContractAddress,
    serverUrl,
  }: PolygonModuleConfig) {
    this.rpcUrl = rpcUrl
    this.didContractAddress = didContractAddress
    this.schemaManagerContractAddress = schemaManagerContractAddress
    this.fileServerToken = fileServerToken
    this.fileServerUrl = serverUrl
  }

  public async createSchema(
    agentContext: AgentContext,
    { did, schemaName, schema }: { did: string; schemaName: string; schema: object }
  ) {
    const publicKeyBase58 = await this.getPublicKeyFromDid(agentContext, did)

    if (!publicKeyBase58) {
      throw new AriesFrameworkError('Public Key not found in wallet')
    }

    const signingKey = await this.getSigningKey(agentContext.wallet, publicKeyBase58)

    const schemaRegistry = this.createSchemaRegistryInstance(signingKey)

    agentContext.config.logger.info(`Creating schema on ledger: ${did}`)

    const response = await schemaRegistry.createSchema(did, schemaName, schema)
    if (!response) {
      agentContext.config.logger.error(`Schema creation failed for did: ${did} and schema: ${schema}`)
      throw new AriesFrameworkError(`Schema creation failed for did: ${did} and schema: ${schema}`)
    }
    agentContext.config.logger.info(`Published schema on ledger: ${did}`)
    return response
  }

  public async getSchemaByDidAndSchemaId(agentContext: AgentContext, did: string, schemaId: string) {
    agentContext.config.logger.info(`Getting schema from ledger: ${did} and schemaId: ${schemaId}`)

    const publicKeyBase58 = await this.getPublicKeyFromDid(agentContext, did)

    if (!publicKeyBase58) {
      throw new AriesFrameworkError('Public Key not found in wallet')
    }

    const signingKey = await this.getSigningKey(agentContext.wallet, publicKeyBase58)

    const schemaRegistry = this.createSchemaRegistryInstance(signingKey)

    const response = await schemaRegistry.getSchemaById(did, schemaId)

    if (!response) {
      agentContext.config.logger.error(`Schema not found for did: ${did} and schemaId: ${schemaId} Error: ${response}`)
      throw new AriesFrameworkError(`Schema not found for did: ${did} and schemaId: ${schemaId}`)
    }
    agentContext.config.logger.info(`Got schema from ledger: ${did} and schemaId: ${schemaId}`)
    return response
  }

  public async estimateFeeForDidOperation(agentContext: AgentContext, options: DidOperationOptions) {
    const keyPair = await generateSecp256k1KeyPair()

    const didRegistry = this.createDidRegistryInstance(new SigningKey(keyPair.privateKey))

    const { operation } = options

    if (operation === DidOperation.Create) {
      agentContext.config.logger.info(`Getting estimated fee for operation: ${operation} `)
      const did = `did:polygon:testnet${keyPair.address}`
      const didDoc = getSecp256k1DidDocWithPublicKey(did, keyPair.publicKeyBase58, options?.serviceEndpoint)

      const response = await didRegistry.estimateTxFee(DidOperation.Create, [keyPair.address, JSON.stringify(didDoc)])
      return response
    }

    if (operation === DidOperation.Update) {
      agentContext.config.logger.info(`Getting estimated fee for operation: ${operation} `)
      const parsedDid = parseDid(options.did)

      const response = await didRegistry.estimateTxFee(
        DidOperation.Update,
        [parsedDid.didAddress, JSON.stringify(options.didDocument)],
        parsedDid.didAddress
      )
      return response
    }

    if (operation === DidOperation.Deactivate) {
      agentContext.config.logger.info(`Getting estimated fee for operation: ${operation} `)
      const parsedDid = parseDid(options.did)
      const deactivatedDidDocument = new DidDocumentBuilder(options.did)
        .addContext('https://www.w3.org/ns/did/v1')
        .build()
      const response = await didRegistry.estimateTxFee(
        DidOperation.Update,
        [parsedDid.didAddress, JSON.stringify(deactivatedDidDocument)],
        parsedDid.didAddress
      )
      return response
    }

    if (operation === DidOperation.AddResource) {
      agentContext.config.logger.info(`Getting estimated fee for operation: ${operation} `)
      const parsedDid = parseDid(options.did)
      const response = await didRegistry.estimateTxFee(
        DidOperation.AddResource,
        [parsedDid.didAddress, options.resourceId, JSON.stringify(options.resource)],
        parsedDid.didAddress
      )
      return response
    }
  }

  public async estimateFeeForSchemaOperation(agentContext: AgentContext, options: SchemaOperationOptions) {
    const keyPair = await generateSecp256k1KeyPair()

    const schemaRegistry = this.createSchemaRegistryInstance(new SigningKey(keyPair.privateKey))

    const { operation } = options

    const testResourceBody = {
      resourceURI:
        'did:polygon:testnet:0x13cd23928Ae515b86592C630f56C138aE4c7B79a/resources/398cee0a-efac-4643-9f4c-74c48c72a14b',
      resourceCollectionId: '55dbc8bf-fba3-4117-855c-1e0dc1d3bb47',
      resourceId: '398cee0a-efac-4643-9f4c-74c48c72a14b',
      resourceName: 'Eventbrite1 Logo',
      resourceType: 'W3C-schema',
      mediaType: 'image/svg+xml',
      created: '2022-11-17T08:10:36Z',
      checksum: 'a95380f460e63ad939541a57aecbfd795fcd37c6d78ee86c885340e33a91b559',
      previousVersionId: null,
      nextVersionId: null,
    }

    if (operation === SchemaOperation.CreateSchema) {
      agentContext.config.logger.info(`Getting estimated fee for operation: ${operation} `)
      const schemaEstimatedFee = await schemaRegistry.estimateTxFee(SchemaOperation.CreateSchema, [
        keyPair.address,
        utils.uuid(),
        JSON.stringify(testResourceBody),
      ])

      const resourceEstimatedFee = await this.estimateFeeForDidOperation(agentContext, {
        operation: DidOperation.AddResource,
        resourceId: utils.uuid(),
        resource: testResourceBody,
        did: options.did,
      })

      let feeParameters = {}

      if (schemaEstimatedFee && resourceEstimatedFee) {
        feeParameters = {
          estimatedTotalTxFee: Number(schemaEstimatedFee.transactionFee) + Number(resourceEstimatedFee.transactionFee),
          estimatedSchemaTxFee: schemaEstimatedFee,
          estimatedResourceTxFee: resourceEstimatedFee,
        }
      }

      return feeParameters
    }
  }

  public createDidRegistryInstance(signingKey: SigningKey) {
    if (!this.rpcUrl || !this.didContractAddress) {
      throw new AriesFrameworkError('Ledger config not found')
    }

    return new PolygonDID({
      rpcUrl: this.rpcUrl,
      contractAddress: this.didContractAddress,
      signingKey,
    })
  }

  private createSchemaRegistryInstance(signingKey: SigningKey) {
    if (
      !this.rpcUrl ||
      !this.schemaManagerContractAddress ||
      !this.fileServerToken ||
      !this.fileServerUrl ||
      !this.didContractAddress
    ) {
      throw new AriesFrameworkError('Polygon schema module config not found')
    }

    return new PolygonSchema({
      rpcUrl: this.rpcUrl,
      didRegistrarContractAddress: this.didContractAddress,
      schemaManagerContractAddress: this.schemaManagerContractAddress,
      fileServerToken: this.fileServerToken,
      serverUrl: this.fileServerUrl,
      signingKey,
    })
  }

  private async getSigningKey(wallet: Wallet, publicKeyBase58: string): Promise<SigningKey> {
    if (!(wallet instanceof AskarWallet)) {
      throw new AriesFrameworkError('Incorrect wallet type: Polygon Module currently only supports Askar wallet')
    }

    const keyEntry = await wallet.session.fetchKey({ name: publicKeyBase58 })

    if (!keyEntry) {
      throw new WalletError('Key not found in wallet')
    }

    const signingKey = new SigningKey(keyEntry.key.secretBytes)

    keyEntry.key.handle.free()

    return signingKey
  }

  private async getPublicKeyFromDid(agentContext: AgentContext, did: string) {
    const didRepository = agentContext.dependencyManager.resolve(DidRepository)

    const didRecord = await didRepository.findCreatedDid(agentContext, did)
    if (!didRecord) {
      throw new AriesFrameworkError('DidRecord not found')
    }

    if (!didRecord.didDocument?.verificationMethod) {
      throw new AriesFrameworkError('VerificationMethod not found cannot get public key')
    }

    const publicKeyBase58 = didRecord.didDocument.verificationMethod[0].publicKeyBase58

    return publicKeyBase58
  }

  public updateModuleConfig({
    didRegistrarContractAddress,
    fileServerToken,
    rpcUrl,
    schemaManagerContractAddress,
    serverUrl,
  }: SchemaRegistryConfig) {
    this.rpcUrl = rpcUrl
    this.didContractAddress = didRegistrarContractAddress
    this.schemaManagerContractAddress = schemaManagerContractAddress
    this.fileServerToken = fileServerToken
    this.fileServerUrl = serverUrl
  }
}
