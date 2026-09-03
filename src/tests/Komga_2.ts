import { type TestLogger } from '@paperback/types'
import { TestSuite, registerDefaultTests } from './suite.js'
import { Komga_2 } from '../Komga_2/main.js'
import sourceInfo from '../Komga_2/pbconfig.js'

export async function runTests(logger: TestLogger) {
  const suite = new TestSuite('Komga_2 tests', logger)
  registerDefaultTests(suite, Komga_2, sourceInfo)

  await suite.run()
}
