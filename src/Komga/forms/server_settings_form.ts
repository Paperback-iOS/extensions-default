import {
  ButtonRow,
  Form,
  InputRow,
  LabelRow,
  Section,
  type FormSectionElement,
  type LabelRowValue,
} from '@paperback/types'
import {
  getKomgaBaseURL,
  getKomgaCredentials,
  setKomgaBaseURL,
  setKomgaCredentials,
} from '../utils/config.js'
import { checkKomgaConnection } from '../utils/connection.js'

export class ServerSettingsForm extends Form {
  baseUrl = getKomgaBaseURL()
  credentials = getKomgaCredentials()

  async baseUrlDidChange(newValue: string) {
    this.baseUrl = newValue
  }

  baseUrlSection() {
    return Section(
      { id: 'baseUrl', footer: 'Example: https://demo.komga.org' },
      [
        InputRow('baseUrl', {
          title: 'Base URL',
          value: this.baseUrl,
          onValueChange: Application.Selector(
            this as ServerSettingsForm,
            'baseUrlDidChange'
          ),
        }),
      ]
    )
  }

  async usernameDidChange(newValue: string) {
    this.credentials.username = newValue
  }

  async passwordDidChange(newValue: string) {
    this.credentials.password = newValue
  }

  credentialsSection() {
    return Section(
      {
        id: 'credentials',
        footer: 'Example:\nU: demo@komga.org\nP: komga-demo',
      },
      [
        InputRow('username', {
          title: 'Username',
          value: this.credentials.username,
          onValueChange: Application.Selector(
            this as ServerSettingsForm,
            'usernameDidChange'
          ),
        }),
        InputRow('password', {
          title: 'Password',
          value: this.credentials.password,
          isSecureEntry: true,
          onValueChange: Application.Selector(
            this as ServerSettingsForm,
            'passwordDidChange'
          ),
        }),
      ]
    )
  }

  // Result of the last `Test Connection` press, shown without saving anything
  private connectionStatus: LabelRowValue | undefined

  connectionSection() {
    // Section accepts undefined entries, so the status row can simply be absent
    // until a check has run
    return Section({ id: 'connection' }, [
      ButtonRow('testConnection', {
        title: 'Test Connection',
        onSelect: Application.Selector(
          this as ServerSettingsForm,
          'testConnection'
        ),
      }),
      this.connectionStatus
        ? LabelRow('connectionStatus', {
            title: 'Status',
            value: this.connectionStatus,
          })
        : undefined,
    ])
  }

  async testConnection(): Promise<void> {
    this.connectionStatus = { text: 'Checking...', style: 'tinted' }
    this.reloadForm()

    const { ok, message } = await checkKomgaConnection(
      this.baseUrl,
      this.credentials
    )
    this.connectionStatus = { text: message, style: ok ? 'success' : 'error' }
    this.reloadForm()
  }

  override getSections(): FormSectionElement<unknown>[] {
    return [
      this.baseUrlSection(),
      this.credentialsSection(),
      this.connectionSection(),
    ]
  }

  // Validate the credentials
  override requiresExplicitSubmission: boolean = true

  override async formDidSubmit(): Promise<void> {
    const { ok, message } = await checkKomgaConnection(
      this.baseUrl,
      this.credentials
    )

    if (!ok) {
      throw new Error(message)
    }

    setKomgaBaseURL(this.baseUrl)
    setKomgaCredentials(this.credentials.username, this.credentials.password)
  }
}
