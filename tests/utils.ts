import {
  AgentConfig,
  AgentContext,
  AgentDependencies,
  ConnectionsModule,
  ConsoleLogger,
  DependencyManager,
  DidsModule,
  InitConfig,
  InjectionSymbols,
  InjectionToken,
  LogLevel,
  TypedArrayEncoder,
  Wallet,
  WalletConfig,
  utils,
} from '@aries-framework/core'
import { AgentModulesInput, EmptyModuleMap } from '@aries-framework/core/build/agent/AgentModules'
import { agentDependencies } from '@aries-framework/node'
import { PolygonDidRegistrar, PolygonDidResolver } from '../src/dids'
import { PolygonModule } from '../src/PolygonModule'

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
      rpcUrl: 'https://rpc-mumbai.maticvigil.com/',
      contractAddress: '0x8B335A167DA81CCef19C53eE629cf2F6291F2255',
      privateKey: TypedArrayEncoder.fromHex('bf15b65d1b497e47e2529292927e817c90bd95c1ca98a59d472cdcda85310b1d'),
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
