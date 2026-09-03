import {
  closureSelector,
  Form,
  Section,
  SelectRow,
  ToggleRow,
  type FormSectionElement,
} from '@paperback/types'
import {
  getSectionStyle,
  SECTION_STYLES,
  setSectionStyle,
  type SectionStyle,
} from '../utils/config.js'
import { DISCOVER_SECTIONS } from '../discover_sections.js'

export class HomepageSettingsForm extends Form {
  override getSections(): FormSectionElement<unknown>[] {
    return [
      Section(
        {
          id: 'sections',
          header: 'Homepage Sections',
          footer:
            'Regular, Large and Hero change how a section presents its covers. Hidden removes it from the homepage.',
        },
        // A row handler takes only its new value, so each row closes over the
        // section it belongs to rather than needing a method per section
        DISCOVER_SECTIONS.map((section) =>
          section.fixedStyle
            ? ToggleRow(section.id, {
                title: section.title,
                subtitle: section.description,
                value: getSectionStyle(section.id) !== 'hidden',
                onValueChange: closureSelector(
                  this,
                  `visible_${section.id}`,
                  async (value: boolean) => {
                    this.applyStyle(section.id, value ? 'simple' : 'hidden')
                  }
                ),
              })
            : SelectRow(section.id, {
                title: section.title,
                subtitle: section.description,
                value: [getSectionStyle(section.id)],
                minItemCount: 1,
                maxItemCount: 1,
                layout: 'list',
                items: SECTION_STYLES,
                onValueChange: closureSelector(
                  this,
                  `style_${section.id}`,
                  async (value: string[]) => {
                    const style = value[0]
                    if (style) {
                      this.applyStyle(section.id, style as SectionStyle)
                    }
                  }
                ),
              })
        )
      ),
    ]
  }

  private applyStyle(sectionId: string, style: SectionStyle): void {
    setSectionStyle(sectionId, style)
    Application.invalidateDiscoverSections()
  }
}
