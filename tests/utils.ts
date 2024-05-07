import type { AgentDependencies, InitConfig, InjectionToken, Wallet, WalletConfig } from '@credo-ts/core'
import type { AgentModulesInput, EmptyModuleMap } from '@credo-ts/core/build/agent/AgentModules'

import {
  AgentConfig,
  AgentContext,
  ConnectionsModule,
  ConsoleLogger,
  DependencyManager,
  DidsModule,
  InjectionSymbols,
  LogLevel,
  utils,
} from '@credo-ts/core'
import { agentDependencies } from '@credo-ts/node'

import { PolygonModule } from '../src/PolygonModule'
import { PolygonDidRegistrar, PolygonDidResolver } from '../src/dids'

const testLogger = new ConsoleLogger(LogLevel.off)

export function getAgentOptions<AgentModules extends AgentModulesInput | EmptyModuleMap>(
  name: string,
  extraConfig: Partial<InitConfig> = {},
  inputModules?: AgentModules
): { config: InitConfig; modules: AgentModules; dependencies: AgentDependencies } {
  const random = utils.uuid().slice(0, 4)
  const config: InitConfig = {
    label: `Agent: ${name} - ${random}`,
    walletConfig: {
      id: `Wallet: ${name} - ${random}`,
      key: `Key${name}`,
    },
    // TODO: determine the log level based on an environment variable. This will make it
    // possible to run e.g. failed github actions in debug mode for extra logs
    logger: testLogger,
    ...extraConfig,
  }

  const m = (inputModules ?? {}) as AgentModulesInput
  const modules = {
    ...m,
    // Make sure connections module is always defined so we can set autoAcceptConnections
    connections:
      m.connections ??
      new ConnectionsModule({
        autoAcceptConnections: true,
      }),
  }

  return { config, modules: modules as AgentModules, dependencies: agentDependencies } as const
}

export function getAgentConfig(
  name: string,
  extraConfig: Partial<InitConfig> = {}
): AgentConfig & { walletConfig: WalletConfig } {
  const { config, dependencies } = getAgentOptions(name, extraConfig, {
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
  })
  return new AgentConfig(config, dependencies) as AgentConfig & { walletConfig: WalletConfig }
}

export function getAgentContext({
  dependencyManager = new DependencyManager(),
  wallet,
  agentConfig,
  contextCorrelationId = 'mock',
  registerInstances = [],
}: {
  dependencyManager?: DependencyManager
  wallet?: Wallet
  agentConfig?: AgentConfig
  contextCorrelationId?: string
  // Must be an array of arrays as objects can't have injection tokens
  // as keys (it must be number, string or symbol)
  registerInstances?: Array<[InjectionToken, unknown]>
} = {}) {
  if (wallet) dependencyManager.registerInstance(InjectionSymbols.Wallet, wallet)
  if (agentConfig) dependencyManager.registerInstance(AgentConfig, agentConfig)

  // Register custom instances on the dependency manager
  for (const [token, instance] of registerInstances.values()) {
    dependencyManager.registerInstance(token, instance)
  }

  return new AgentContext({ dependencyManager, contextCorrelationId })
}
