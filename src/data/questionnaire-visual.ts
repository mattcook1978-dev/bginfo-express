import type { Questionnaire } from '../types'

// The Visual Questionnaire is the same for all age groups.
// It is delivered as a separate package (variant: 'visual') from the
// Background Information questionnaire (variant: 'remainder').

export const questionnaireVisual: Questionnaire = {
  type: '16plus', // age-independent; same questions used for all learners
  sections: [

    {
      id: 'vh',
      title: 'Visual Questionnaire',
      questions: [

        {
          id: 'vh.1',
          text: 'Have you been prescribed and advised to wear any optical prescription lenses (i.e. glasses or contact lenses)?',
          type: 'yes_no',
          followUps: [
            {
              condition: 'yes',
              questions: [
                {
                  id: 'vh.1a',
                  text: 'Are these required for distance vision (e.g. television), near vision (e.g. reading), or both?',
                  type: 'single_choice',
                  options: ['Distance vision', 'Near vision', 'Both'],
                },
                {
                  id: 'vh.1b',
                  text: 'Do you wear your glasses / contact lenses as advised?',
                  type: 'yes_no',
                },
                {
                  id: 'vh.1c',
                  text: 'Do you have your glasses / contact lenses with you today?',
                  type: 'single_choice',
                  options: ['Yes', 'No', 'N/A'],
                },
              ],
            },
          ],
        },

        {
          id: 'vh.2',
          text: 'How long ago was your last sight-test or eye test by an optometrist ("optician")?',
          type: 'single_choice',
          options: ['Less than 2 years ago', 'More than 2 years ago', 'Never'],
        },

        {
          id: 'vh.3',
          text: 'Have you ever used coloured overlays or precision-tinted lenses?',
          type: 'yes_no',
          followUps: [
            {
              condition: 'yes',
              questions: [
                {
                  id: 'vh.3a',
                  text: 'Who recommended and provided these?',
                  type: 'free_text',
                },
                {
                  id: 'vh.3b',
                  text: 'Why were they recommended?',
                  type: 'free_text',
                },
                {
                  id: 'vh.3c',
                  text: 'Did they help?',
                  type: 'yes_no',
                  followUps: [
                    {
                      condition: 'yes',
                      questions: [
                        {
                          id: 'vh.3c.detail',
                          text: 'In what way did they help?',
                          type: 'free_text',
                        },
                      ],
                    },
                  ],
                },
                {
                  id: 'vh.3d',
                  text: 'Do you still use them?',
                  type: 'yes_no',
                  followUps: [
                    {
                      condition: 'no',
                      questions: [
                        {
                          id: 'vh.3d.reason',
                          text: 'Why not?',
                          type: 'free_text',
                        },
                      ],
                    },
                  ],
                },
              ],
            },
          ],
        },

        {
          id: 'vh.4',
          text: 'Have you ever had hospital treatment for a problem with your eyes or vision?',
          type: 'yes_no',
          note: 'For example - wearing a patch for a \'lazy eye\' (amblyopia); wearing glasses or having exercises to help correct a \'turn\' in your eye (squint); any other condition.',
          followUps: [
            {
              condition: 'yes',
              questions: [
                {
                  id: 'vh.4a',
                  text: 'Please give details.',
                  type: 'free_text',
                },
              ],
            },
          ],
        },

        {
          id: 'vdq.1',
          text: 'Do you often get headaches when you read or study?',
          type: 'yes_no',
          note: 'Note: "Often" means persistent, occurring several times a week, though not necessarily every day.',
        },
        {
          id: 'vdq.2',
          text: 'Do your eyes often feel sore, or gritty, or watery?',
          type: 'yes_no',
        },
        {
          id: 'vdq.3',
          text: 'Does reading from white paper or from a bright screen often feel uncomfortable?',
          type: 'yes_no',
        },
        {
          id: 'vdq.4',
          text: 'Does print often appear blurred, or go in and out of focus, when you are reading?',
          type: 'yes_no',
        },
        {
          id: 'vdq.5',
          text: 'Does the print, or book, or screen, often appear double when you are reading?',
          type: 'yes_no',
        },
        {
          id: 'vdq.6',
          text: 'Do words often seem to move or merge together when you are reading?',
          type: 'yes_no',
        },
        {
          id: 'vdq.7',
          text: 'Do objects in the distance often appear more blurred after you have been reading?',
          type: 'yes_no',
        },
        {
          id: 'vdq.8',
          text: 'Do you often have to screw up your eyes to see more clearly when you are reading?',
          type: 'yes_no',
        },
        {
          id: 'vdq.9',
          text: 'Do you often move your eyes around or blink to make things clearer or more comfortable when you are reading?',
          type: 'yes_no',
        },
        {
          id: 'vdq.10',
          text: 'Do you experience any other problems with your vision that interfere with your ability to read or study?',
          type: 'yes_no',
          followUps: [
            {
              condition: 'yes',
              questions: [
                {
                  id: 'vdq.10a',
                  text: 'Please describe.',
                  type: 'free_text',
                },
              ],
            },
          ],
        },

      ],
    },

  ],
}
