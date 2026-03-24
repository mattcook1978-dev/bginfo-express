import { questionnaireUnder16 } from '../data/questionnaire-under16'
import { questionnaire16plus } from '../data/questionnaire-16plus'
import { questionnaireVisual } from '../data/questionnaire-visual'
import type { Questionnaire, QuestionnaireType } from '../types'

export { questionnaireVisual }

export async function getQuestionnaire(type: QuestionnaireType): Promise<Questionnaire> {
  return type === 'under16' ? questionnaireUnder16 : questionnaire16plus
}
