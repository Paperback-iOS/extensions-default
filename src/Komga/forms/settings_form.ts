import {
  Form,
  LabelRow,
  NavigationRow,
  Section,
  type FormSectionElement,
  type LabelRowValue,
} from '@paperback/types'
import { ServerSettingsForm } from './server_settings_form.js'
import { HomepageSettingsForm } from './homepage_settings_form.js'
import { ContentSettingsForm } from './content_settings_form.js'
import { getKomgaBaseURL } from '../utils/config.js'
import { checkKomgaConnection } from '../utils/connection.js'

export class SettingsForm extends Form {
  private status: LabelRowValue = { text: 'Checking...', style: 'tinted' }

  override formWillAppear(): void {
    void this.refreshStatus()
  }

  private async refreshStatus(): Promise<void> {
    const { ok, message } = await checkKomgaConnection()
    this.status = { text: message, style: ok ? 'success' : 'error' }
    this.reloadForm()
  }

  override getSections(): FormSectionElement<unknown>[] {
    return [
      Section({ id: 'status', header: 'Server' }, [
        LabelRow('connection', {
          title: 'Status',
          value: this.status,
        }),
      ]),

      Section('authentication', [
        NavigationRow('authentication', {
          title: 'Server Settings',
          subtitle: getKomgaBaseURL(),
          form: new ServerSettingsForm(),
        }),
      ]),

      Section('homepageSettings', [
        NavigationRow('homepageSettings', {
          title: 'Homepage Settings',
          form: new HomepageSettingsForm(),
        }),
      ]),

      Section('contentSettings', [
        NavigationRow('contentSettings', {
          title: 'Content Settings',
          form: new ContentSettingsForm(),
        }),
      ]),
    ]
  }
}
