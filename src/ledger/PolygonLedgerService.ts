import type { AgentContext } from '@aries-framework/core'

import { AriesFrameworkError, injectable } from '@aries-framework/core'
import { PolygonDID } from '@ayanworks/polygon-did-registrar'
import { PolygonSchema } from '@ayanworks/polygon-schema-manager'

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
  private schemaRegistry: PolygonSchema | undefined
  private rpcUrl: string | undefined
  private contractAddress: string | undefined

  public constructor({
    didContractAddress,
    privateKey,
    rpcUrl,
    fileServerToken,
    schemaManagerContractAddress,
    serverUrl,
  }: PolygonModuleConfig) {
    this.rpcUrl = rpcUrl
    this.contractAddress = didContractAddress

    if (schemaManagerContractAddress && privateKey && rpcUrl && fileServerToken && serverUrl && didContractAddress) {
      this.schemaRegistry = new PolygonSchema({
        didRegistrarContractAddress: didContractAddress,
        rpcUrl,
        fileServerToken,
        privateKey: privateKey.toString('hex'),
        schemaManagerContractAddress,
        serverUrl,
      })
    }
  }

  public async createSchema(
    agentContext: AgentContext,
    { did, schemaName, schema }: { did: string; schemaName: string; schema: object }
  ) {
    agentContext.config.logger.info(`Creating schema on ledger: ${did}`)

    if (!this.schemaRegistry) {
      agentContext.config.logger.error(`Schema registry not found`)
      throw new AriesFrameworkError(`Schema registry not configured. Please check your configuration`)
    }

    const response = await this.schemaRegistry.createSchema(did, schemaName, schema)
    if (!response) {
      agentContext.config.logger.error(`Schema creation failed for did: ${did} and schema: ${schema}`)
      throw new AriesFrameworkError(`Schema creation failed for did: ${did} and schema: ${schema}`)
    }
    agentContext.config.logger.info(`Published schema on ledger: ${did}`)
    return response
  }

  public async getSchemaByDidAndSchemaId(agentContext: AgentContext, did: string, schemaId: string) {
    agentContext.config.logger.info(`Getting schema from ledger: ${did} and schemaId: ${schemaId}`)

    if (!this.schemaRegistry) {
      agentContext.config.logger.error(`Schema registry config not found`)
      throw new AriesFrameworkError(`Schema registry not configured. Please check your configuration`)
    }

    const response = await this.schemaRegistry.getSchemaById(did, schemaId)

    if (!response) {
      agentContext.config.logger.error(`Schema not found for did: ${did} and schemaId: ${schemaId} Error: ${response}`)
      throw new AriesFrameworkError(`Schema not found for did: ${did} and schemaId: ${schemaId}`)
    }
    agentContext.config.logger.info(`Got schema from ledger: ${did} and schemaId: ${schemaId}`)
    return response
  }

  public createDidRegistryInstance(privateKey: string) {
    if (!this.rpcUrl || !this.contractAddress) {
      throw new AriesFrameworkError('Ledger config not found')
    }

    return new PolygonDID({
      rpcUrl: this.rpcUrl,
      contractAddress: this.contractAddress,
      privateKey,
    })
  }

  public updateSchemaRegistryInstance({
    didRegistrarContractAddress,
    fileServerToken,
    privateKey,
    rpcUrl,
    schemaManagerContractAddress,
    serverUrl,
  }: SchemaRegistryConfig) {
    if (!rpcUrl || !didRegistrarContractAddress || !privateKey || !fileServerToken || !schemaManagerContractAddress) {
      throw new AriesFrameworkError('Some of the schema registry configs are not provided')
    }

    this.schemaRegistry = new PolygonSchema({
      didRegistrarContractAddress,
      rpcUrl,
      fileServerToken,
      privateKey,
      schemaManagerContractAddress,
      serverUrl,
    })
  }
}
