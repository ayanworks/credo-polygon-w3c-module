import { AgentContext, AriesFrameworkError, injectable } from '@aries-framework/core'
import { PolygonDID } from '@ayanworks/polygon-did-registrar'
import { PolygonSchema } from '@ayanworks/polygon-schema-manager'
import { PolygonModuleConfig } from '../PolygonModuleConfig'

@injectable()
export class PolygonLedgerService {
  public didRegistry: PolygonDID
  private schemaRegistry: PolygonSchema

  public constructor({
    didContractAddress,
    privateKey,
    rpcUrl,
    fileServerToken,
    schemaManagerContractAddress,
    serverUrl,
  }: PolygonModuleConfig) {
    this.didRegistry = new PolygonDID({
      rpcUrl,
      contractAddress: didContractAddress,
      privateKey: privateKey.toString('hex'),
    })
    this.schemaRegistry = new PolygonSchema({
      didRegistrarContractAddress: didContractAddress,
      rpcUrl,
      fileServerToken,
      privateKey: privateKey.toString('hex'),
      schemaManagerContractAddress,
      serverUrl,
    })
  }

  public async createSchema(
    agentContext: AgentContext,
    { did, schemaName, schema }: { did: string; schemaName: string; schema: object }
  ) {
    agentContext.config.logger.info(`Creating schema on ledger: ${did}`)
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
    const response = await this.schemaRegistry.getSchemaById(did, schemaId)

    if (!response) {
      agentContext.config.logger.error(`Schema not found for did: ${did} and schemaId: ${schemaId} Error: ${response}`)
      throw new AriesFrameworkError(`Schema not found for did: ${did} and schemaId: ${schemaId}`)
    }
    agentContext.config.logger.info(`Got schema from ledger: ${did} and schemaId: ${schemaId}`)
    return response
  }
}
