import type { AgentContext, Wallet } from '@aries-framework/core'

import { AskarWallet } from '@aries-framework/askar'
import { AriesFrameworkError, DidRepository, WalletError, injectable } from '@aries-framework/core'
import { PolygonDID } from '@ayanworks/polygon-did-registrar'
import { PolygonSchema } from '@ayanworks/polygon-schema-manager'
import { SigningKey } from 'ethers'

import { PolygonModuleConfig } from '../PolygonModuleConfig'

interface SchemaRegistryConfig {
  didRegistrarContractAddress: string
  rpcUrl: string
  fileServerToken: string
  privateKey: string
  schemaManagerContractAddress: string
  serverUrl: string
}

@injectable()
export class PolygonLedgerService {
  private rpcUrl: string | undefined
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
