import { AgentContext, injectable } from '@aries-framework/core'
import { PolygonLedgerService } from './ledger'

@injectable()
export class PolygonApi {
  private agentContext: AgentContext
  private ledgerService: PolygonLedgerService

  public constructor(agentContext: AgentContext, ledgerService: PolygonLedgerService) {
    this.agentContext = agentContext
    this.ledgerService = ledgerService
  }

  public async createSchema({ did, schemaName, schema }: { did: string; schemaName: string; schema: object }) {
    const schemaDetails = await this.ledgerService.createSchema(this.agentContext, { did, schemaName, schema })
    return schemaDetails
  }

  public async getSchemaById(did: string, schemaId: string) {
    const schemaDetails = await this.ledgerService.getSchemaByDidAndSchemaId(this.agentContext, did, schemaId)
    return schemaDetails
  }
}
